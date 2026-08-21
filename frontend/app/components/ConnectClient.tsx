'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import BackButton from './BackButton';
import { getApiUrl } from '@/lib/config';

interface User { id: number; username: string; first_name: string; last_name: string; email: string; profile_image?: string | null; }
interface ConnectionRequest { id: number; from_user: User; to_user: User; status: string; created_at: string; }

export default function ConnectClient({ initialPendingRequests, initialConnectedUsers }: { initialPendingRequests: ConnectionRequest[]; initialConnectedUsers: User[] }) {
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>(initialPendingRequests);
  const [connectedUsers, setConnectedUsers] = useState<User[]>(initialConnectedUsers);
  const getInitials = (f: string, l: string) => `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();

  const refresh = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const [pendRes, connRes] = await Promise.all([
      fetch(getApiUrl('/api/messages/connections/pending/'), { headers: { Authorization: `Token ${token}` } }),
      fetch(getApiUrl('/api/messages/connections/connected/'), { headers: { Authorization: `Token ${token}` } }),
    ]);
    if (pendRes.ok) setPendingRequests(await pendRes.json());
    if (connRes.ok) setConnectedUsers(await connRes.json());
  };

  const handleAccept = async (id: number) => {
    const token = localStorage.getItem('token');
    const res = await fetch(getApiUrl(`/api/messages/connections/${id}/respond/`), { method: 'POST', headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'accept' }) });
    if (res.ok) { const d = await res.json(); alert(d.message || 'Connection accepted!'); refresh(); }
  };

  const handleReject = async (id: number) => {
    const token = localStorage.getItem('token');
    const res = await fetch(getApiUrl(`/api/messages/connections/${id}/respond/`), { method: 'POST', headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reject' }) });
    if (res.ok) { const d = await res.json(); alert(d.message || 'Connection rejected.'); refresh(); }
  };

  const handleDisconnect = async (userId: number) => {
    if (!confirm('Are you sure you want to disconnect from this user?')) return;
    const token = localStorage.getItem('token');
    const res = await fetch(getApiUrl(`/api/messages/connections/disconnect/${userId}/`), { method: 'DELETE', headers: { Authorization: `Token ${token}` } });
    if (res.ok) { const d = await res.json(); alert(d.message || 'Disconnected'); refresh(); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pt-16">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <BackButton />
          {pendingRequests.length > 0 && (
            <div className="mb-8">
              <div className="mb-4"><h2 className="text-lg font-bold text-gray-900">Connection Requests</h2><p className="text-xs text-gray-600 mt-1">People who want to connect with you</p></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingRequests.map((req) => (
                  <div key={req.id} className="bg-white rounded-lg border border-orange-200 p-4 hover:shadow-lg hover:border-orange-300 transition-all duration-200">
                    <div className="flex items-center gap-3 mb-3">
                      {req.from_user.profile_image ? (<img src={req.from_user.profile_image} alt="" className="w-14 h-14 rounded-full object-cover" />) : (<div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center text-base font-bold">{getInitials(req.from_user.first_name, req.from_user.last_name)}</div>)}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{req.from_user.first_name} {req.from_user.last_name}</h3>
                        <p className="text-xs text-gray-500 truncate">@{req.from_user.username}</p>
                        <p className="text-[10px] text-orange-600 font-semibold mt-0.5">Wants to connect</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAccept(req.id)} className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all text-xs font-semibold">Accept</button>
                      <button onClick={() => handleReject(req.id)} className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all text-xs font-semibold">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mb-4"><h1 className="text-lg font-bold text-gray-900">Connected Users</h1><p className="text-xs text-gray-600 mt-1">People you are connected with</p></div>
          {connectedUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"><svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No connections yet</h3>
              <p className="text-xs text-gray-600">Start connecting with people from Home, Matches, or Posts!</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {connectedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => router.push(`/user/${user.id}`)}>
                    {user.profile_image ? (<img src={user.profile_image} alt="" className="w-12 h-12 rounded-full object-cover" />) : (<div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-blue-500 text-white flex items-center justify-center text-sm font-bold">{getInitials(user.first_name, user.last_name)}</div>)}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{user.first_name} {user.last_name}</h3>
                      <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={(e) => { e.stopPropagation(); router.push(`/messages/${user.id}`); }} className="flex items-center gap-1.5 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      <span className="hidden md:inline">Message</span>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDisconnect(user.id); }} className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                      <span className="hidden md:inline">Disconnect</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
