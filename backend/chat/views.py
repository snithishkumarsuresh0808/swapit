from django.db.models import Q, Max, Count, Subquery, OuterRef
from django.utils import timezone
from datetime import timedelta
import time
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Message, Connection, CallSignal, CallHistory
from .serializers import MessageSerializer, ConversationSerializer, ConnectionSerializer, CallHistorySerializer
from accounts.models import User

# Tracks when the last stale-signal cleanup ran (per process).
_last_signal_cleanup = 0.0

# In-memory typing status cache: {user_id: last_typing_timestamp}
# Typing indicators expire after 5 seconds without a refresh
_typing_cache = {}
TYPING_TIMEOUT = 5


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversations(request):
    """Get list of all conversations with last message and unread count"""
    user = request.user

    # Get all users the current user has had conversations with
    conversation_users = User.objects.filter(
        Q(sent_messages__receiver=user) | Q(received_messages__sender=user)
    ).distinct()

    user_ids = list(conversation_users.values_list('id', flat=True))
    if not user_ids:
        return Response([])

    # Batch fetch last messages between user and each conversation partner
    last_messages = {}
    for uid in user_ids:
        msg = Message.objects.filter(
            Q(sender=user, receiver_id=uid) | Q(sender_id=uid, receiver=user)
        ).select_related('sender', 'receiver').order_by('-created_at').first()
        if msg:
            last_messages[uid] = msg

    # Batch fetch unread counts
    unread_counts = dict(
        Message.objects.filter(
            receiver=user,
            sender_id__in=user_ids,
            is_read=False
        ).values('sender_id').annotate(count=Count('id')).values_list('sender_id', 'count')
    )

    conversations = []
    for uid, last_msg in last_messages.items():
        conversations.append({
            'user': User.objects.get(id=uid),
            'last_message': last_msg,
            'unread_count': unread_counts.get(uid, 0),
        })

    # Sort by last message time
    conversations.sort(key=lambda x: x['last_message'].created_at, reverse=True)

    serializer = ConversationSerializer(conversations, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_messages(request, user_id):
    """Get all messages between current user and another user"""
    try:
        other_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    messages = Message.objects.select_related('sender', 'receiver').filter(
        Q(sender=request.user, receiver=other_user) | Q(sender=other_user, receiver=request.user)
    ).order_by('created_at')

    # Mark messages from other user as read
    Message.objects.filter(
        sender=other_user,
        receiver=request.user,
        is_read=False
    ).update(is_read=True)

    # Also mark all our sent messages as delivered (receiver fetched them)
    Message.objects.filter(
        sender=request.user,
        receiver=other_user,
        is_delivered=False
    ).update(is_delivered=True)

    serializer = MessageSerializer(messages, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request):
    """Send a new message"""
    serializer = MessageSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(sender=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_connection_request(request):
    """Send a connection request to another user"""
    to_user_id = request.data.get('to_user_id')

    try:
        to_user = User.objects.get(id=to_user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    if to_user == request.user:
        return Response({'error': 'Cannot connect with yourself'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if connection already exists
    existing = Connection.objects.filter(
        Q(from_user=request.user, to_user=to_user) | Q(from_user=to_user, to_user=request.user)
    ).first()

    if existing:
        return Response({'error': 'Connection request already exists', 'connection': ConnectionSerializer(existing, context={'request': request}).data}, status=status.HTTP_400_BAD_REQUEST)

    # Create new connection request
    connection = Connection.objects.create(from_user=request.user, to_user=to_user)
    return Response(ConnectionSerializer(connection, context={'request': request}).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_connection_request(request, connection_id):
    """Accept or reject a connection request"""
    action = request.data.get('action')  # 'accept' or 'reject'

    try:
        connection = Connection.objects.get(id=connection_id, to_user=request.user)
    except Connection.DoesNotExist:
        return Response({'error': 'Connection request not found'}, status=status.HTTP_404_NOT_FOUND)

    if action == 'accept':
        connection.status = 'accepted'
    elif action == 'reject':
        connection.status = 'rejected'
    else:
        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

    connection.save()

    # Return connection data with both user names
    response_data = ConnectionSerializer(connection, context={'request': request}).data
    response_data['message'] = f"You {action}ed connection request from {connection.from_user.first_name} {connection.from_user.last_name}"
    response_data['sender_name'] = f"{connection.from_user.first_name} {connection.from_user.last_name}"
    response_data['accepter_name'] = f"{connection.to_user.first_name} {connection.to_user.last_name}"

    return Response(response_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_connection_status(request, user_id):
    """Get connection status with a specific user"""
    try:
        other_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check for existing connection
    connection = Connection.objects.filter(
        Q(from_user=request.user, to_user=other_user) | Q(from_user=other_user, to_user=request.user)
    ).first()

    if connection:
        return Response({
            'status': connection.status,
            'is_sender': connection.from_user == request.user,
            'connection': ConnectionSerializer(connection, context={'request': request}).data
        })

    return Response({'status': 'none'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_connection_statuses(request):
    """Get connection statuses with multiple users in a single request"""
    user_ids = request.data.get('user_ids', [])
    if not isinstance(user_ids, list) or not user_ids:
        return Response({})

    # One query for all connections involving the current user and target users
    connections = Connection.objects.select_related('from_user', 'to_user').filter(
        Q(from_user=request.user, to_user_id__in=user_ids) |
        Q(from_user_id__in=user_ids, to_user=request.user)
    )

    statuses = {}
    for connection in connections:
        other_user_id = connection.to_user_id if connection.from_user == request.user else connection.from_user_id
        statuses[other_user_id] = {
            'status': connection.status,
            'is_sender': connection.from_user == request.user,
            'connection': ConnectionSerializer(connection, context={'request': request}).data,
        }

    for user_id in user_ids:
        if user_id not in statuses:
            statuses[user_id] = {'status': 'none'}

    return Response(statuses)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pending_requests(request):
    """Get all pending connection requests received by the user"""
    pending_requests = Connection.objects.filter(to_user=request.user, status='pending')
    return Response(ConnectionSerializer(pending_requests, many=True, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_connected_users(request):
    """Get all users that are connected with the current user (accepted connections)"""
    from accounts.serializers import UserSerializer

    # Get all accepted connections where user is either sender or receiver
    connections = Connection.objects.select_related('from_user', 'to_user').filter(
        Q(from_user=request.user, status='accepted') |
        Q(to_user=request.user, status='accepted')
    )

    # Extract the other user from each connection
    connected_users = []
    for connection in connections:
        other_user = connection.to_user if connection.from_user == request.user else connection.from_user
        connected_users.append(other_user)

    serializer = UserSerializer(connected_users, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def disconnect_user(request, user_id):
    """Disconnect from a connected user by deleting the connection"""
    try:
        other_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    # Find the connection (could be in either direction)
    connection = Connection.objects.filter(
        Q(from_user=request.user, to_user=other_user, status='accepted') |
        Q(from_user=other_user, to_user=request.user, status='accepted')
    ).first()

    if not connection:
        return Response({'error': 'No active connection found'}, status=status.HTTP_404_NOT_FOUND)

    # Delete the connection
    connection_user_name = f"{other_user.first_name} {other_user.last_name}"
    connection.delete()

    return Response({
        'message': f'Successfully disconnected from {connection_user_name}',
        'user_name': connection_user_name
    }, status=status.HTTP_200_OK)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def call_signals(request):
    """HTTP relay for WebRTC signaling (replaces WebSockets for flaky tunnels).

    POST /api/messages/calls/signal/   body: {recipient_id, type, payload}
      Queues a signaling message for delivery to the recipient.

    GET  /api/messages/calls/signal/?after=<id>
      Returns all signals addressed to the current user with id > after.
    """
    if request.method == 'POST':
        data = request.data
        recipient_id = data.get('recipient_id')
        signal_type = data.get('type')
        payload = data.get('payload') or {}

        if not recipient_id or not signal_type:
            return Response(
                {'error': 'recipient_id and type are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            recipient = User.objects.get(id=recipient_id)
        except User.DoesNotExist:
            return Response({'error': 'Recipient not found'}, status=status.HTTP_404_NOT_FOUND)

        signal = CallSignal.objects.create(
            sender=request.user,
            recipient=recipient,
            signal_type=str(signal_type),
            payload=payload,
        )
        return Response({'id': signal.id}, status=status.HTTP_201_CREATED)

    # GET - poll for pending signals
    try:
        after = int(request.query_params.get('after', 0) or 0)
    except ValueError:
        after = 0

    # Drop stale signals (older than 10 minutes) so the table stays small,
    # but only run the cleanup at most once a minute per process.
    global _last_signal_cleanup
    now = time.time()
    if now - _last_signal_cleanup > 60:
        cutoff = timezone.now() - timedelta(minutes=10)
        CallSignal.objects.filter(
            recipient=request.user, created_at__lt=cutoff
        ).delete()
        _last_signal_cleanup = now

    signals = list(CallSignal.objects.select_related('sender').filter(
        recipient=request.user, id__gt=after
    )[:100])

    return Response({
        'signals': [
            {
                'id': signal.id,
                'type': signal.signal_type,
                'sender_id': signal.sender_id,
                'sender_name': f"{signal.sender.first_name} {signal.sender.last_name}".strip() or signal.sender.username,
                'payload': signal.payload,
                'created_at': signal.created_at.isoformat(),
            }
            for signal in signals
        ],
        'latest_id': signals[-1].id if signals else after,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def typing_status(request):
    """POST to set typing status for a conversation, GET to check if users are typing.

    POST: {user_id: int}  — registers that request.user is typing to user_id
    GET:  ?user_ids=1,2,3  — returns which of these users are currently typing to request.user
    """
    if request.method == 'POST':
        user_id = request.data.get('user_id')
        if not user_id:
            return Response({'error': 'user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        key = f"{request.user.id}:{user_id}"
        _typing_cache[key] = time.time()
        return Response({'ok': True})

    # GET
    raw = request.query_params.get('user_ids', '')
    if not raw:
        return Response({})
    try:
        user_ids = [int(uid) for uid in raw.split(',') if uid.strip()]
    except ValueError:
        return Response({'error': 'Invalid user_ids'}, status=status.HTTP_400_BAD_REQUEST)

    now = time.time()
    typing_from = {}
    for uid in user_ids:
        key = f"{uid}:{request.user.id}"
        ts = _typing_cache.get(key)
        if ts and (now - ts) < TYPING_TIMEOUT:
            typing_from[uid] = True
            # Clean up consumed entry
            del _typing_cache[key]
    return Response(typing_from)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def heartbeat(request):
    """Update current user's last_seen timestamp (called periodically by frontend)."""
    User.objects.filter(id=request.user.id).update(last_seen=timezone.now())
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def online_status(request):
    """Get online/last_seen status for a batch of users.

    GET ?user_ids=1,2,3
    Returns {user_id: {online: bool, last_seen: str|null}}
    A user is considered online if last_seen was within the last 2 minutes.
    """
    raw = request.query_params.get('user_ids', '')
    if not raw:
        return Response({})
    try:
        user_ids = [int(uid) for uid in raw.split(',') if uid.strip()]
    except ValueError:
        return Response({'error': 'Invalid user_ids'}, status=status.HTTP_400_BAD_REQUEST)

    cutoff = timezone.now() - timedelta(minutes=2)
    users = User.objects.filter(id__in=user_ids).only('id', 'last_seen')
    result = {}
    for u in users:
        result[u.id] = {
            'online': u.last_seen >= cutoff if u.last_seen else False,
            'last_seen': u.last_seen.isoformat() if u.last_seen else None,
        }
    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_delivered(request):
    """Mark specific messages as delivered (receiver's device confirmed receipt).

    POST: {message_ids: [int, ...]}
    """
    message_ids = request.data.get('message_ids', [])
    if not isinstance(message_ids, list) or not message_ids:
        return Response({'error': 'message_ids list required'}, status=status.HTTP_400_BAD_REQUEST)

    updated = Message.objects.filter(
        id__in=message_ids,
        receiver=request.user,
        is_delivered=False
    ).update(is_delivered=True)
    return Response({'updated': updated})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def call_history_view(request):
    """GET: Return call history for current user.
    POST: Log a completed call.
    """
    if request.method == 'GET':
        calls = CallHistory.objects.select_related('caller', 'callee').filter(
            Q(caller=request.user) | Q(callee=request.user)
        )[:50]
        return Response(CallHistorySerializer(calls, many=True).data)

    # POST - log a call
    data = request.data
    callee_id = data.get('callee_id')
    call_type = data.get('call_type', 'audio')
    outcome = data.get('outcome', 'completed')
    duration = data.get('duration_seconds', 0)

    if not callee_id:
        return Response({'error': 'callee_id required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        callee = User.objects.get(id=callee_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    call = CallHistory.objects.create(
        caller=request.user,
        callee=callee,
        call_type=call_type,
        outcome=outcome,
        duration_seconds=duration,
        ended_at=timezone.now(),
    )
    return Response(CallHistorySerializer(call).data, status=status.HTTP_201_CREATED)
