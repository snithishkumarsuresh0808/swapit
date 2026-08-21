from django.db import models
from accounts.models import User


class Connection(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_connections')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_connections')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['from_user', 'to_user']

    def __str__(self):
        return f'{self.from_user.username} -> {self.to_user.username}: {self.status}'


class Message(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    is_delivered = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sender', 'receiver']),
            models.Index(fields=['receiver', 'is_read']),
            models.Index(fields=['receiver', 'is_delivered']),
        ]

    def __str__(self):
        return f'{self.sender.username} -> {self.receiver.username}: {self.content[:50]}'


class CallHistory(models.Model):
    CALL_TYPE_CHOICES = [
        ('audio', 'Audio'),
        ('video', 'Video'),
    ]
    OUTCOME_CHOICES = [
        ('missed', 'Missed'),
        ('answered', 'Answered'),
        ('completed', 'Completed'),
    ]

    caller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calls_made')
    callee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calls_received')
    call_type = models.CharField(max_length=10, choices=CALL_TYPE_CHOICES, default='audio')
    outcome = models.CharField(max_length=10, choices=OUTCOME_CHOICES, default='missed')
    duration_seconds = models.IntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['caller', '-started_at']),
            models.Index(fields=['callee', '-started_at']),
        ]

    def __str__(self):
        return f'{self.caller.username} -> {self.callee.username}: {self.outcome}'


class CallSignal(models.Model):
    """Queued WebRTC signaling message delivered via HTTP polling.

    Used instead of WebSockets so calls work over tunnels that are
    unreliable for WebSocket traffic (e.g. VS Code dev tunnels).
    """
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_call_signals')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_call_signals')
    signal_type = models.CharField(max_length=20)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
        indexes = [
            models.Index(fields=['recipient', 'id']),
        ]

    def __str__(self):
        return f'{self.sender_id} -> {self.recipient_id}: {self.signal_type}'
