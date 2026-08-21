'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrl } from '@/lib/config';
import BackButton from './BackButton';
import Sidebar from './Sidebar';

type Conversation = {
  id: number;
  other_user: { id: number; username: string; first_name: string; last_name: string; profile_image?: string | null };
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_online: boolean;
};

export default function MessagesClient({
  initialConversations,
  initialCurrentUserId,
}: {
  initialConversations: Conversation[];
  initialCurrentUserId: number | null;
}) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlineStatuses, setOnlineStatuses] = useState<Record<number, boolean>>({});
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    if (!token) return;
    try {
      const res = await fetch(getApiUrl('/api/messages/conversations/'), {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {}
  };

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d`;
  };

  const filtered = conversations.filter((c) =>
    `${c.other_user.first_name} ${c.other_user.last_name} ${c.last_message}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pt-16">
        <div className="max-w-2xl mx-auto px-3 py-4">
          <BackButton />
          <h1 className="text-lg font-bold text-gray-900 mb-3">Messages</h1>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations yet</h3>
              <p className="mt-1 text-xs text-gray-500">Start a conversation from a user&apos;s profile</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {filtered.map((conversation, index) => (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.other_user.id}`}
                  className={`flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors ${
                    index !== filtered.length - 1 ? 'border-b border-gray-200' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {conversation.other_user.profile_image ? (
                      <img
                        src={conversation.other_user.profile_image}
                        alt={`${conversation.other_user.first_name} ${conversation.other_user.last_name}`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-semibold">
                        {getInitials(conversation.other_user.first_name, conversation.other_user.last_name)}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white bg-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {conversation.other_user.first_name} {conversation.other_user.last_name}
                      </h3>
                      <span className="text-[10px] text-gray-500 ml-2 flex-shrink-0">
                        {formatTime(conversation.last_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 truncate">{conversation.last_message}</p>
                      {conversation.unread_count > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-green-600 text-white text-[10px] font-bold rounded-full flex-shrink-0">
                          {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
