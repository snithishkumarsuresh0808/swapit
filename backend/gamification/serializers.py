from rest_framework import serializers
from .models import UserXP, XPLog, Badge, UserBadge, SkillProgress


class XPLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = XPLog
        fields = ['id', 'amount', 'reason', 'created_at']


class BadgeSerializer(serializers.ModelSerializer):
    earned = serializers.SerializerMethodField()
    earned_at = serializers.SerializerMethodField()

    class Meta:
        model = Badge
        fields = ['id', 'key', 'name', 'icon', 'description', 'xp_reward', 'earned', 'earned_at']

    def get_earned(self, obj):
        user = self.context.get('user')
        if not user:
            return False
        return UserBadge.objects.filter(user=user, badge=obj).exists()

    def get_earned_at(self, obj):
        user = self.context.get('user')
        if not user:
            return None
        ub = UserBadge.objects.filter(user=user, badge=obj).first()
        return ub.earned_at if ub else None


class SkillProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillProgress
        fields = ['id', 'skill_name', 'progress', 'sessions_completed', 'updated_at']


class UserXPSerializer(serializers.ModelSerializer):
    level_info = serializers.SerializerMethodField()
    badges = serializers.SerializerMethodField()
    recent_xp = serializers.SerializerMethodField()
    skill_progress = serializers.SerializerMethodField()

    class Meta:
        model = UserXP
        fields = ['id', 'xp', 'login_streak', 'level_info', 'badges', 'recent_xp', 'skill_progress', 'updated_at']

    def get_level_info(self, obj):
        return obj.level_info

    def get_badges(self, obj):
        user_badges = UserBadge.objects.filter(user=obj.user).select_related('badge')
        return [{
            'id': ub.badge.id,
            'key': ub.badge.key,
            'name': ub.badge.name,
            'icon': ub.badge.icon,
            'description': ub.badge.description,
            'earned_at': ub.earned_at,
        } for ub in user_badges]

    def get_recent_xp(self, obj):
        logs = XPLog.objects.filter(user=obj.user)[:10]
        return XPLogSerializer(logs, many=True).data

    def get_skill_progress(self, obj):
        skills = SkillProgress.objects.filter(user=obj.user)
        return SkillProgressSerializer(skills, many=True).data
