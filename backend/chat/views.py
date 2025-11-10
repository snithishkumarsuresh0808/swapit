from django.db.models import Q, Max, Count, Subquery, OuterRef
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Message, Connection
from .serializers import MessageSerializer, ConversationSerializer, ConnectionSerializer
from accounts.models import User


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_conversations(request):
    """Get list of all conversations with last message and unread count"""
    user = request.user

    # Get all users the current user has had conversations with
    conversation_users = User.objects.filter(
        Q(sent_messages__receiver=user) | Q(received_messages__sender=user)
    ).distinct()

    conversations = []
    for other_user in conversation_users:
        # Get last message between users
        last_message = Message.objects.filter(
            Q(sender=user, receiver=other_user) | Q(sender=other_user, receiver=user)
        ).order_by('-created_at').first()

        # Count unread messages from other user
        unread_count = Message.objects.filter(
            sender=other_user,
            receiver=user,
            is_read=False
        ).count()

        if last_message:
            conversations.append({
                'user': other_user,
                'last_message': last_message,
                'unread_count': unread_count
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

    messages = Message.objects.filter(
        Q(sender=request.user, receiver=other_user) | Q(sender=other_user, receiver=request.user)
    ).order_by('created_at')

    # Mark messages from other user as read
    Message.objects.filter(
        sender=other_user,
        receiver=request.user,
        is_read=False
    ).update(is_read=True)

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
    connections = Connection.objects.filter(
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
