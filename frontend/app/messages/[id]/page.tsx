'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import WebRTCCall from '../../components/WebRTCCall';
import { getApiUrl } from '@/lib/config';

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

export default function Conversation() {
  const router = useRouter();
  const params = useParams();
  const userId = parseInt(params.id as string);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUserId(JSON.parse(userData).id);
    }
    fetchMessages();

    // Auto-refresh messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/api/messages/conversation/${userId}/`), {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        if (data.length > 0) {
          const currentUserData = localStorage.getItem('user');
          const currentId = currentUserData ? JSON.parse(currentUserData).id : null;
          // Determine the other user
          const firstMessage = data[0];
          setOtherUser(
            firstMessage.sender.id === currentId ? firstMessage.receiver : firstMessage.sender
          );
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(getApiUrl('/api/messages/send/'), {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiver_id: userId,
          content: newMessage,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Sidebar />

      {/* Header */}
      {otherUser && (
        <div className="fixed top-16 left-0 right-0 bg-white border-b border-gray-200 z-40">
          <div className="max-w-3xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push('/messages')}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {otherUser.profile_image ? (
                <img
                  src={otherUser.profile_image}
                  alt={`${otherUser.first_name} ${otherUser.last_name}`}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px] font-semibold">
                  {getInitials(otherUser.first_name, otherUser.last_name)}
                </div>
              )}

              <div>
                <h2 className="text-xs font-semibold text-gray-900">
                  {otherUser.first_name} {otherUser.last_name}
                </h2>
                <p className="text-[9px] text-gray-500">@{otherUser.username}</p>
              </div>
            </div>

            <button
              onClick={() => setIsCallActive(true)}
              className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
              title="Call"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 pt-32 pb-20 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isMe = message.sender.id === currentUserId;
                return (
                  <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-2 max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar */}
                      {!isMe && (
                        message.sender.profile_image ? (
                          <img
                            src={message.sender.profile_image}
                            alt={`${message.sender.first_name} ${message.sender.last_name}`}
                            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-[9px] font-semibold flex-shrink-0">
                            {getInitials(message.sender.first_name, message.sender.last_name)}
                          </div>
                        )
                      )}

                      {/* Message Bubble */}
                      <div>
                        <div
                          className={`px-3 py-2 rounded-2xl ${
                            isMe
                              ? 'bg-green-600 text-white rounded-tr-sm'
                              : 'bg-gray-200 text-gray-900 rounded-tl-sm'
                          }`}
                        >
                          <p className="text-xs break-words">{message.content}</p>
                        </div>
                        <p className={`text-[9px] text-gray-500 mt-0.5 ${isMe ? 'text-right' : 'text-left'}`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Message Input - Fixed at Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="max-w-3xl mx-auto px-3 py-2">
          <form onSubmit={sendMessage} className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-green-600 focus:border-transparent"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* WebRTC Call Component */}
      {isCallActive && otherUser && currentUserId && (
        <WebRTCCall
          currentUserId={currentUserId}
          otherUserId={otherUser.id}
          otherUserName={`${otherUser.first_name} ${otherUser.last_name}`}
          onClose={() => setIsCallActive(false)}
        />
      )}
    </div>
  );
}
