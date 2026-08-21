'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import BackButton from './BackButton';

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  profile_image?: string | null;
}

interface CallRecord {
  id: number;
  caller: User;
  callee: User;
  call_type: 'audio' | 'video';
  outcome: 'missed' | 'answered' | 'completed';
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
}

export default function CallsClient({ initialCalls, initialCurrentUserId }: { initialCalls: CallRecord[]; initialCurrentUserId: number | null }) {
  const router = useRouter();
  const [calls] = useState<CallRecord[]>(initialCalls);
  const [filter, setFilter] = useState<'all' | 'missed' | 'answered' | 'completed'>('all');
  const currentUserId = initialCurrentUserId;

  const filteredCalls = useMemo(() => {
    if (filter === 'all') return calls;
    return calls.filter(c => c.outcome === filter);
  }, [calls, filter]);

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatCallTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (diffDays === 0) return `Today, ${timeStr}`;
    if (diffDays === 1) return `Yesterday, ${timeStr}`;
    if (diffDays < 7) return `${diffDays}d ago, ${timeStr}`;
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  const getOtherUser = (call: CallRecord): User => {
    if (!currentUserId) return call.caller.id === currentUserId ? call.callee : call.caller;
    return call.caller.id === currentUserId ? call.callee : call.caller;
  };

  const isOutgoing = (call: CallRecord) => {
    return currentUserId ? call.caller.id === currentUserId : false;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getOutcomeIcon = (outcome: string) => {
    if (outcome === 'missed') {
      return (
        <svg className="w-3 h-3 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
        </svg>
      );
    }
    return (
      <svg className="w-3 h-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-3 py-4">
          <BackButton />
          <h1 className="text-sm font-bold text-gray-900 mb-3">Call History</h1>
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['all', 'missed', 'answered', 'completed'] as const).map((tab) => (
              <button key={tab} onClick={() => setFilter(tab)} className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${filter === tab ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-green-300'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {filteredCalls.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No calls yet</h3>
              <p className="mt-1 text-xs text-gray-500">Your call history will appear here</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {filteredCalls.map((call, index) => {
                const otherUser = getOtherUser(call);
                const outgoing = isOutgoing(call);
                return (
                  <div key={call.id} className={`flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors ${index !== filteredCalls.length - 1 ? 'border-b border-gray-200' : ''}`}>
                    <div className="relative flex-shrink-0">
                      {otherUser.profile_image ? (<img src={otherUser.profile_image} alt={`${otherUser.first_name} ${otherUser.last_name}`} className="w-12 h-12 rounded-full object-cover" />) : (<div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-semibold">{getInitials(otherUser.first_name, otherUser.last_name)}</div>)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className={`text-xs font-semibold truncate ${call.outcome === 'missed' ? 'text-red-600' : 'text-gray-900'}`}>{otherUser.first_name} {otherUser.last_name}</h3>
                        <span className="text-[10px] text-gray-500 ml-2 flex-shrink-0">{formatCallTime(call.started_at)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {getOutcomeIcon(call.outcome)}
                        <p className="text-[10px] text-gray-500">{outgoing ? 'Outgoing' : 'Incoming'} &middot; {call.call_type === 'video' ? 'Video' : 'Audio'} &middot; {formatDuration(call.duration_seconds)}</p>
                      </div>
                    </div>
                    <button onClick={() => router.push(`/messages/${otherUser.id}`)} className="p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors flex-shrink-0" title="Message">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
