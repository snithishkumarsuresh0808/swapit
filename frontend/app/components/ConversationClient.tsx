'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getApiUrl, WS_URL } from '@/lib/config';
import WebRTCCall from './WebRTCCall';

type Message = {
  id: number;
  sender: number;
  sender_username: string;
  sender_first_name: string;
  sender_last_name: string;
  sender_profile_image?: string | null;
  content: string;
  timestamp: string;
  is_read: boolean;
};

type OtherUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  profile_image?: string | null;
};

export default function ConversationClient({
  initialMessages,
  initialOtherUser,
  otherUserId,
}: {
  initialMessages: Message[];
  initialOtherUser: OtherUser;
  otherUserId: number;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<OtherUser>(initialOtherUser);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      setCurrentUserId(user.id);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(`${WS_URL}/ws/messages/${otherUserId}/?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      } else if (data.type === 'typing') {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
      } else if (data.type === 'read') {
        setMessages((prev) =>
          prev.map((m) => (data.message_ids?.includes(m.id) ? { ...m, is_read: true } : m))
        );
      } else if (data.type === 'online_status') {
        setIsOnline(data.is_online);
      }
    };

    ws.onclose = () => {};

    return () => {
      ws.close();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [otherUserId, token]);

  useEffect(() => {
    const fetchOnlineStatus = async () => {
      try {
        const res = await fetch(getApiUrl(`/api/messages/online-status/${otherUserId}/`), {
          headers: { Authorization: `Token ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setIsOnline(data.is_online);
        }
      } catch {}
    };
    fetchOnlineStatus();
  }, [otherUserId, token]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !token) return;
    try {
      const res = await fetch(getApiUrl(`/api/messages/send/${otherUserId}/`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (res.ok) {
        setNewMessage('');
        fetchMessages();
      }
    } catch {}
  };

  const fetchMessages = async () => {
    if (!token) return;
    try {
      const res = await fetch(getApiUrl(`/api/messages/${otherUserId}/`), {
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) setMessages(await res.json());
    } catch {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setCallActive(true);
  };

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();

  if (callActive) {
    return (
      <WebRTCCall
        currentUserId={currentUserId!}
        otherUserId={otherUserId}
        otherUserName={`${otherUser.first_name} ${otherUser.last_name}`}
        audioOnly={callType === 'audio'}
        onClose={() => setCallActive(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <Link href={`/user/${otherUser.id}`} className="flex items-center gap-2 flex-1">
          {otherUser.profile_image ? (
            <Image src={otherUser.profile_image} alt="" width={36} height={36} className="rounded-full object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
              {getInitials(otherUser.first_name, otherUser.last_name)}
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{otherUser.first_name} {otherUser.last_name}</h3>
            <p className="text-[10px] text-gray-500">{isOnline ? 'Online' : 'Offline'}</p>
          </div>
        </Link>
        <div className="flex gap-1">
          <button onClick={() => startCall('audio')} className="p-2 hover:bg-gray-100 rounded-full" title="Audio Call">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button onClick={() => startCall('video')} className="p-2 hover:bg-gray-100 rounded-full" title="Video Call">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => {
          const isMine = currentUserId !== null && message.sender === currentUserId;
          return (
            <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] ${isMine ? 'order-2' : 'order-1'}`}>
                <div
                  className={`px-3 py-2 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-green-600 text-white rounded-br-md'
                      : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                  }`}
                >
                  {message.content}
                </div>
                <p className={`text-[10px] text-gray-400 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                  {new Date(message.timestamp).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </p>
              </div>
            </div>
          );
        })}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 resize-none rounded-2xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 max-h-24"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
