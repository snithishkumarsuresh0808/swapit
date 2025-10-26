from django.shortcuts import render
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

    serializer = ConversationSerializer(conversations, many=True)
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

    serializer = MessageSerializer(messages, many=True)
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
        return Response({'error': 'Connection request already exists', 'connection': ConnectionSerializer(existing).data}, status=status.HTTP_400_BAD_REQUEST)

    # Create new connection request
    connection = Connection.objects.create(from_user=request.user, to_user=to_user)
    return Response(ConnectionSerializer(connection).data, status=status.HTTP_201_CREATED)


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
    return Response(ConnectionSerializer(connection).data)


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
            'connection': ConnectionSerializer(connection).data
        })

    return Response({'status': 'none'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_pending_requests(request):
    """Get all pending connection requests received by the user"""
    requests = Connection.objects.filter(to_user=request.user, status='pending')
    return Response(ConnectionSerializer(requests, many=True).data)
