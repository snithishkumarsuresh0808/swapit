from django.urls import path
from . import views

urlpatterns = [
    path('', views.GamificationDashboardView.as_view(), name='gamification-dashboard'),
    path('badges/', views.AllBadgesView.as_view(), name='all-badges'),
    path('skill-progress/', views.SkillProgressView.as_view(), name='skill-progress'),
    path('leaderboard/', views.LeaderboardView.as_view(), name='leaderboard'),
]
