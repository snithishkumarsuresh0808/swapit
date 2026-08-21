from django.contrib import admin
from .models import UserXP, XPLog, Badge, UserBadge, SkillProgress


@admin.register(UserXP)
class UserXPAdmin(admin.ModelAdmin):
    list_display = ['user', 'xp', 'login_streak', 'last_active_date', 'updated_at']
    search_fields = ['user__email', 'user__username']


@admin.register(XPLog)
class XPLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'amount', 'reason', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__email', 'reason']


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['key', 'name', 'icon', 'xp_reward']


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ['user', 'badge', 'earned_at']
    list_filter = ['badge', 'earned_at']


@admin.register(SkillProgress)
class SkillProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'skill_name', 'progress', 'sessions_completed']
    search_fields = ['user__email', 'skill_name']
