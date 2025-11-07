from django.urls import path
from .views import (
    SignUpView, LoginView, ProfileView, AllProfilesView,
    UserPostsView, PostDetailView, AllPostsView,
    ChangePasswordView, UpdateProfileImageView, DeleteAccountView
)
from .ringtone_views import (
    RingtoneListView, RingtoneUploadView, RingtoneDetailView,
    SetActiveRingtoneView, ActiveRingtoneView
)

urlpatterns = [
    path('auth/signup/', SignUpView.as_view(), name='signup'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('auth/update-profile/', UpdateProfileImageView.as_view(), name='update-profile'),
    path('auth/delete-account/', DeleteAccountView.as_view(), name='delete-account'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('profiles/', AllProfilesView.as_view(), name='all-profiles'),
    path('posts/', UserPostsView.as_view(), name='user-posts'),
    path('posts/<int:pk>/', PostDetailView.as_view(), name='post-detail'),
    path('posts/all/', AllPostsView.as_view(), name='all-posts'),

    # Ringtone endpoints
    path('ringtones/', RingtoneListView.as_view(), name='ringtone-list'),
    path('ringtones/upload/', RingtoneUploadView.as_view(), name='ringtone-upload'),
    path('ringtones/<int:pk>/', RingtoneDetailView.as_view(), name='ringtone-detail'),
    path('ringtones/<int:pk>/activate/', SetActiveRingtoneView.as_view(), name='set-active-ringtone'),
    path('ringtones/active/', ActiveRingtoneView.as_view(), name='active-ringtone'),
]
