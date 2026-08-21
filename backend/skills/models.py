from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class SkillCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=10, blank=True, default='📂')
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Skill(models.Model):
    LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    category = models.ForeignKey(SkillCategory, on_delete=models.CASCADE, related_name='skills')
    name = models.CharField(max_length=100)
    level = models.CharField(max_length=15, choices=LEVEL_CHOICES, default='beginner')

    class Meta:
        ordering = ['name']
        unique_together = ['category', 'name', 'level']

    def __str__(self):
        return f"{self.name} ({self.level})"


class Review(models.Model):
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_given')
    reviewed_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews_received')
    session_id_str = models.CharField(max_length=100, blank=True, default='')

    skill_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating for skill quality (1-5)"
    )
    communication_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating for communication (1-5)"
    )
    reliability_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating for reliability (1-5)"
    )
    comment = models.TextField(blank=True, default='')
    skills_taught = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['reviewed_user', '-created_at']),
            models.Index(fields=['reviewer']),
        ]

    def __str__(self):
        return f"Review by {self.reviewer.email} for {self.reviewed_user.email}"

    @property
    def average_rating(self):
        return round(
            (self.skill_rating + self.communication_rating + self.reliability_rating) / 3, 1
        )


class Session(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('rejected', 'Rejected'),
    ]

    DURATION_CHOICES = [
        (30, '30 minutes'),
        (60, '60 minutes'),
        (90, '90 minutes'),
    ]

    from_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sessions_initiated')
    to_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sessions_received')
    skill_name = models.CharField(max_length=200)
    skill_description = models.TextField(blank=True, default='')
    proposed_date = models.DateTimeField()
    duration = models.IntegerField(choices=DURATION_CHOICES, default=60)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['from_user', 'status']),
            models.Index(fields=['to_user', 'status']),
        ]

    def __str__(self):
        return f"Session: {self.skill_name} ({self.from_user.email} -> {self.to_user.email})"
