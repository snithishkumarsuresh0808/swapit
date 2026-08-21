from rest_framework import serializers
from .models import Message, Connection, CallHistory
from accounts.serializers import UserDetailSerializer


class ConnectionSerializer(serializers.ModelSerializer):
    from_user = UserDetailSerializer(read_only=True)
    to_user = UserDetailSerializer(read_only=True)
    to_user_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Connection
        fields = ['id', 'from_user', 'to_user', 'to_user_id', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'from_user', 'created_at', 'updated_at']


class MessageSerializer(serializers.ModelSerializer):
    sender = UserDetailSerializer(read_only=True)
    receiver = UserDetailSerializer(read_only=True)
    receiver_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender', 'receiver', 'receiver_id', 'content', 'created_at', 'is_read', 'is_delivered']
        read_only_fields = ['id', 'sender', 'created_at']


class ConversationSerializer(serializers.Serializer):
    user = UserDetailSerializer()
    last_message = MessageSerializer()
    unread_count = serializers.IntegerField()


class CallHistorySerializer(serializers.ModelSerializer):
    caller = UserDetailSerializer(read_only=True)
    callee = UserDetailSerializer(read_only=True)

    class Meta:
        model = CallHistory
        fields = ['id', 'caller', 'callee', 'call_type', 'outcome', 'duration_seconds', 'started_at', 'ended_at']
        read_only_fields = ['id', 'caller', 'started_at']
