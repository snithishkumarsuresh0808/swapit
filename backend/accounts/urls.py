from django.urls import path
from .views import (
    SignUpView, LoginView, ProfileView, AllProfilesView,
    UserPostsView, PostDetailView, AllPostsView,
    ChangePasswordView, UpdateProfileImageView
)

urlpatterns = [
    path('auth/signup/', SignUpView.as_view(), name='signup'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('auth/update-profile/', UpdateProfileImageView.as_view(), name='update-profile'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('profiles/', AllProfilesView.as_view(), name='all-profiles'),
    path('posts/', UserPostsView.as_view(), name='user-posts'),
    path('posts/<int:pk>/', PostDetailView.as_view(), name='post-detail'),
    path('posts/all/', AllPostsView.as_view(), name='all-posts'),
]
