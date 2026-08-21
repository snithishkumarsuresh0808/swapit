from django.contrib import admin
from .models import SkillCategory, Skill, Review, Session


@admin.register(SkillCategory)
class SkillCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'order']
    ordering = ['order', 'name']


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'level']
    list_filter = ['category', 'level']
    search_fields = ['name']


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['reviewer', 'reviewed_user', 'skill_rating', 'communication_rating', 'reliability_rating', 'created_at']
    list_filter = ['skill_rating', 'communication_rating', 'reliability_rating']
    search_fields = ['reviewer__email', 'reviewed_user__email']


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ['skill_name', 'from_user', 'to_user', 'status', 'proposed_date', 'duration', 'created_at']
    list_filter = ['status', 'duration']
    search_fields = ['skill_name', 'from_user__email', 'to_user__email']
