from django.urls import path
from . import views

urlpatterns = [
    path('conversations/', views.get_conversations, name='conversations'),
    path('conversation/<int:user_id>/', views.get_messages, name='get_messages'),
    path('send/', views.send_message, name='send_message'),
    path('connections/send/', views.send_connection_request, name='send_connection_request'),
    path('connections/<int:connection_id>/respond/', views.respond_connection_request, name='respond_connection_request'),
    path('connections/status/<int:user_id>/', views.get_connection_status, name='get_connection_status'),
    path('connections/pending/', views.get_pending_requests, name='get_pending_requests'),
    path('connections/connected/', views.get_connected_users, name='get_connected_users'),
    path('connections/disconnect/<int:user_id>/', views.disconnect_user, name='disconnect_user'),
]
