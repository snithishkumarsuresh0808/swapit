from django.db import models
from django.conf import settings
from django.utils import timezone


BADGE_DEFINITIONS = [
    {'key': 'first_exchange', 'name': 'First Exchange', 'icon': '🏆', 'description': 'Complete your first skill exchange session', 'xp_reward': 50},
    {'key': 'streak_7', 'name': '7 Day Streak', 'icon': '🔥', 'description': 'Use SwapIt 7 days in a row', 'xp_reward': 100},
    {'key': 'helpful_mentor', 'name': 'Helpful Mentor', 'icon': '💬', 'description': 'Leave 5 reviews for other users', 'xp_reward': 30},
    {'key': 'sessions_10', 'name': '10 Sessions Completed', 'icon': '🎓', 'description': 'Complete 10 skill exchange sessions', 'xp_reward': 75},
    {'key': 'connections_25', 'name': '25 Connections', 'icon': '🤝', 'description': 'Connect with 25 other users', 'xp_reward': 50},
    {'key': 'top_teacher', 'name': 'Top Teacher', 'icon': '⭐', 'description': 'Receive 5-star ratings from 3 different users', 'xp_reward': 100},
    {'key': 'first_post', 'name': 'First Post', 'icon': '📝', 'description': 'Create your first skill exchange post', 'xp_reward': 10},
    {'key': 'first_message', 'name': 'Ice Breaker', 'icon': '💬', 'description': 'Send your first message', 'xp_reward': 10},
    {'key': 'five_sessions', 'name': 'Getting Started', 'icon': '🌱', 'description': 'Complete 5 skill exchange sessions', 'xp_reward': 30},
    {'key': 'connections_10', 'name': 'Social Butterfly', 'icon': '🦋', 'description': 'Connect with 10 other users', 'xp_reward': 25},
]

LEVEL_THRESHOLDS = [
    0, 50, 120, 210, 320, 460, 630, 840, 1100, 1420,
    1800, 2250, 2800, 3450, 4200, 5100, 6200, 7500, 9000, 10800,
]


def compute_level(xp):
    level = 1
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if xp >= threshold:
            level = i + 1
        else:
            break
    current_threshold = LEVEL_THRESHOLDS[level - 1] if level <= len(LEVEL_THRESHOLDS) else LEVEL_THRESHOLDS[-1]
    next_threshold = LEVEL_THRESHOLDS[level] if level < len(LEVEL_THRESHOLDS) else LEVEL_THRESHOLDS[-1] + 2000
    progress = (xp - current_threshold) / max(next_threshold - current_threshold, 1)
    return {
        'level': level,
        'xp': xp,
        'current_xp': xp - current_threshold,
        'xp_needed': next_threshold - current_threshold,
        'progress': round(min(progress, 1.0), 4),
    }


class UserXP(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='xp_profile')
    xp = models.IntegerField(default=0)
    login_streak = models.IntegerField(default=0)
    last_active_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-xp']

    def __str__(self):
        return f"{self.user.email}: {self.xp} XP"

    def add_xp(self, amount, reason=''):
        self.xp += amount
        self.save(update_fields=['xp', 'updated_at'])
        XPLog.objects.create(user=self.user, amount=amount, reason=reason)

    def update_streak(self):
        today = timezone.now().date()
        if self.last_active_date == today:
            return
        if self.last_active_date and (today - self.last_active_date).days == 1:
            self.login_streak += 1
        elif self.last_active_date and (today - self.last_active_date).days > 1:
            self.login_streak = 1
        else:
            self.login_streak = 1
        self.last_active_date = today
        self.save(update_fields=['login_streak', 'last_active_date', 'updated_at'])

    @property
    def level_info(self):
        return compute_level(self.xp)


class XPLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='xp_logs')
    amount = models.IntegerField()
    reason = models.CharField(max_length=200, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email}: +{self.amount} XP ({self.reason})"


class Badge(models.Model):
    key = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10)
    description = models.TextField(blank=True, default='')
    xp_reward = models.IntegerField(default=0)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.icon} {self.name}"


class UserBadge(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='earned_by')
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'badge']
        ordering = ['-earned_at']

    def __str__(self):
        return f"{self.user.email} earned {self.badge.name}"


class SkillProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='skill_progress')
    skill_name = models.CharField(max_length=200)
    progress = models.IntegerField(default=0, help_text='Progress percentage 0-100')
    sessions_completed = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'skill_name']
        ordering = ['-progress']

    def __str__(self):
        return f"{self.user.email}: {self.skill_name} ({self.progress}%)"
