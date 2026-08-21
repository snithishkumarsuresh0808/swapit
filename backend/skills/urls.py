from django.urls import path
from . import views
from . import ai_views

urlpatterns = [
    path('categories/', views.SkillCategoryListView.as_view(), name='skill-categories'),
    path('list/', views.SkillListView.as_view(), name='skill-list'),
    path('discover/', views.DiscoverView.as_view(), name='discover'),
    path('reviews/', views.ReviewListCreateView.as_view(), name='review-list'),
    path('reviews/user/<int:user_id>/', views.ReviewListCreateView.as_view(), name='user-reviews'),
    path('reputation/<int:user_id>/', views.UserReputationView.as_view(), name='user-reputation'),
    path('sessions/', views.SessionListCreateView.as_view(), name='session-list'),
    path('sessions/<int:pk>/', views.SessionDetailView.as_view(), name='session-detail'),
    path('sessions/<int:pk>/<str:action>/', views.SessionActionView.as_view(), name='session-action'),
    path('seed-skills/', views.SeedSkillsView.as_view(), name='seed-skills'),

    # AI Features
    path('ai/recommend/', ai_views.AISkillRecommendationView.as_view(), name='ai-recommend'),
    path('ai/profile-assistant/', ai_views.AIProfileAssistantView.as_view(), name='ai-profile-assistant'),
    path('ai/post-generator/', ai_views.AIPostGeneratorView.as_view(), name='ai-post-generator'),
]
