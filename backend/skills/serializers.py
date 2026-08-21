from rest_framework import serializers
from .models import SkillCategory, Skill, Review, Session
from accounts.serializers import UserDetailSerializer


class SkillSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Skill
        fields = ['id', 'name', 'level', 'category', 'category_name']


class SkillCategorySerializer(serializers.ModelSerializer):
    skills = SkillSerializer(many=True, read_only=True)
    skill_count = serializers.SerializerMethodField()

    class Meta:
        model = SkillCategory
        fields = ['id', 'name', 'icon', 'order', 'skills', 'skill_count']

    def get_skill_count(self, obj):
        return obj.skills.count()


class ReviewSerializer(serializers.ModelSerializer):
    reviewer = UserDetailSerializer(read_only=True)
    reviewed_user = UserDetailSerializer(read_only=True)
    reviewed_user_id = serializers.IntegerField(write_only=True)
    average_rating = serializers.ReadOnlyField()

    class Meta:
        model = Review
        fields = [
            'id', 'reviewer', 'reviewed_user', 'reviewed_user_id',
            'session_id_str', 'skill_rating', 'communication_rating',
            'reliability_rating', 'comment', 'skills_taught',
            'average_rating', 'created_at'
        ]
        read_only_fields = ['id', 'reviewer', 'created_at']


class SessionSerializer(serializers.ModelSerializer):
    from_user = UserDetailSerializer(read_only=True)
    to_user = UserDetailSerializer(read_only=True)
    to_user_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Session
        fields = [
            'id', 'from_user', 'to_user', 'to_user_id',
            'skill_name', 'skill_description', 'proposed_date',
            'duration', 'status', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'from_user', 'created_at', 'updated_at']
