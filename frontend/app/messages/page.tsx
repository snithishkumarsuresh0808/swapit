'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import WebRTCCall from '../components/WebRTCCall';

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  profile_image?: string | null;
}

interface Message {
  id: number;
  sender: User;
  receiver: User;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  user: User;
  last_message: Message;
  unread_count: number;
}

export default function Messages() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callUser, setCallUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUserId(JSON.parse(userData).id);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/messages/conversations/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const openConversation = (userId: number) => {
    router.push(`/messages/${userId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-3 py-4">
          <h1 className="text-sm font-bold text-gray-900 mb-3">Messages</h1>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No messages yet</h3>
              <p className="mt-1 text-xs text-gray-500">
                Start a conversation from a user's profile or matched post
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {conversations.map((conversation, index) => (
                <div
                  key={conversation.user.id}
                  className={`flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors ${
                    index !== conversations.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div
                    onClick={() => openConversation(conversation.user.id)}
                    className="cursor-pointer"
                  >
                    {conversation.user.profile_image ? (
                      <img
                        src={`http://localhost:8000${conversation.user.profile_image}`}
                        alt={`${conversation.user.first_name} ${conversation.user.last_name}`}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {getInitials(conversation.user.first_name, conversation.user.last_name)}
                      </div>
                    )}
                  </div>

                  {/* Conversation Details */}
                  <div
                    onClick={() => openConversation(conversation.user.id)}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="text-xs font-semibold text-gray-900 truncate">
                        {conversation.user.first_name} {conversation.user.last_name}
                      </h3>
                      <span className="text-[10px] text-gray-500 ml-2 flex-shrink-0">
                        {formatTime(conversation.last_message.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className={`text-[10px] truncate ${conversation.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                        {conversation.last_message.content}
                      </p>
                      {conversation.unread_count > 0 && (
                        <span className="ml-2 flex-shrink-0 w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-[9px] font-bold">
                          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Call Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCallUser(conversation.user);
                      setIsCallActive(true);
                    }}
                    className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors flex-shrink-0"
                    title="Call"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* WebRTC Call Component */}
      {isCallActive && callUser && currentUserId && (
        <WebRTCCall
          currentUserId={currentUserId}
          otherUserId={callUser.id}
          otherUserName={`${callUser.first_name} ${callUser.last_name}`}
          onClose={() => {
            setIsCallActive(false);
            setCallUser(null);
          }}
        />
      )}
    </div>
  );
}
