'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getApiUrl } from '@/lib/config';
import BackButton from './BackButton';

type Session = {
  id: number;
  from_user: { id: number; username: string; email: string; first_name: string; last_name: string; profile_image: string | null };
  to_user: { id: number; username: string; email: string; first_name: string; last_name: string; profile_image: string | null };
  skill_name: string;
  skill_description: string;
  proposed_date: string;
  duration: number;
  status: string;
  notes: string;
  created_at: string;
};

export default function SessionsClient({ initialSessions, initialUsers }: { initialSessions: Session[]; initialUsers: any[] }) {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [users, setUsers] = useState<any[]>(initialUsers);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'pending' | 'completed'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ to_user_id: '', skill_name: '', skill_description: '', proposed_date: '', duration: '60', notes: '' });
  const [createError, setCreateError] = useState('');
  const [loading, setLoading] = useState(false);
  const [token] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  useEffect(() => {
    if (filter !== 'all') fetchSessions();
  }, [filter]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiUrl('/api/skills/sessions/')}?filter=${filter}`, { headers: { Authorization: `Token ${token}` } });
      if (res.ok) setSessions(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.to_user_id || !form.skill_name || !form.proposed_date) { setCreateError('Fill in all required fields'); return; }
    setCreateError('');
    try {
      const res = await fetch(getApiUrl('/api/skills/sessions/'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` }, body: JSON.stringify({ to_user_id: parseInt(form.to_user_id), skill_name: form.skill_name, skill_description: form.skill_description, proposed_date: new Date(form.proposed_date).toISOString(), duration: parseInt(form.duration), notes: form.notes }) });
      if (res.ok) { setShowCreate(false); setForm({ to_user_id: '', skill_name: '', skill_description: '', proposed_date: '', duration: '60', notes: '' }); fetchSessions(); } else { const data = await res.json(); setCreateError(data.error || data.detail || 'Failed to create session'); }
    } catch { setCreateError('Network error'); }
  };

  const handleAction = async (sessionId: number, action: string) => {
    try { const res = await fetch(getApiUrl(`/api/skills/sessions/${sessionId}/${action}/`), { method: 'POST', headers: { Authorization: `Token ${token}` } }); if (res.ok) fetchSessions(); } catch {}
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', accepted: 'bg-blue-100 text-blue-700', in_progress: 'bg-purple-100 text-purple-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-gray-100 text-gray-500', rejected: 'bg-red-100 text-red-700' };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><BackButton label="" /><h1 className="text-xl font-bold text-gray-900">Sessions</h1></div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">+ New Session</button>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-3 flex gap-1 flex-wrap">
          {(['all', 'upcoming', 'pending', 'completed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap capitalize ${filter === f ? 'bg-green-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>{f}</button>
          ))}
        </div>
      </header>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold">Schedule Session</h2><button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>
            <div className="space-y-3">
              <div><label className="text-sm font-medium text-gray-700">Partner *</label><select value={form.to_user_id} onChange={e => setForm({ ...form, to_user_id: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"><option value="">Select connected user</option>{users.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}</select></div>
              <div><label className="text-sm font-medium text-gray-700">Skill to Exchange *</label><input type="text" value={form.skill_name} onChange={e => setForm({ ...form, skill_name: e.target.value })} placeholder="e.g., Python, Guitar, Spanish..." className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700">Description</label><textarea value={form.skill_description} onChange={e => setForm({ ...form, skill_description: e.target.value })} placeholder="What you want to learn/teach..." rows={2} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium text-gray-700">Date & Time *</label><input type="datetime-local" value={form.proposed_date} onChange={e => setForm({ ...form, proposed_date: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
                <div><label className="text-sm font-medium text-gray-700">Duration</label><select value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"><option value="30">30 min</option><option value="60">60 min</option><option value="90">90 min</option></select></div>
              </div>
              <div><label className="text-sm font-medium text-gray-700">Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={2} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <button onClick={handleCreate} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">Request Session</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12"><p className="text-gray-500 text-lg">No sessions yet</p><p className="text-gray-400 text-sm mt-2">Connect with someone and schedule a skill exchange session</p></div>
        ) : sessions.map(s => {
          const currentUserId = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('user') || '{}').id) : 0;
          const isFromUser = s.from_user.id === currentUserId;
          const otherUser = isFromUser ? s.to_user : s.from_user;
          return (
            <div key={s.id} className="bg-white rounded-xl border p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                <Link href={`/user/${otherUser.id}`} className="shrink-0">
                  {otherUser.profile_image ? <Image src={otherUser.profile_image} alt="" width={40} height={40} className="rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">{otherUser.first_name?.[0]}{otherUser.last_name?.[0]}</div>}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between"><h3 className="font-semibold text-gray-900 truncate">{s.skill_name}</h3><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(s.status)}`}>{s.status.replace('_', ' ')}</span></div>
                  <p className="text-sm text-gray-500">{isFromUser ? 'With' : 'From'} {otherUser.first_name} {otherUser.last_name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400"><span>📅 {formatDate(s.proposed_date)}</span><span>⏱ {s.duration} min</span></div>
                  {s.skill_description && <p className="text-sm text-gray-600 mt-2">{s.skill_description}</p>}
                  <div className="flex gap-2 mt-3">
                    {s.status === 'pending' && !isFromUser && <><button onClick={() => handleAction(s.id, 'accept')} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">Accept</button><button onClick={() => handleAction(s.id, 'reject')} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border rounded-lg hover:bg-red-100">Reject</button></>}
                    {s.status === 'accepted' && <button onClick={() => handleAction(s.id, 'start')} className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Start Session</button>}
                    {s.status === 'in_progress' && <button onClick={() => handleAction(s.id, 'complete')} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">Mark Complete</button>}
                    {s.status === 'completed' && <Link href={`/reviews?session=${s.id}&user=${otherUser.id}`} className="text-xs px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200">Leave Review</Link>}
                    {['pending', 'accepted', 'in_progress'].includes(s.status) && <button onClick={() => handleAction(s.id, 'cancel')} className="text-xs px-3 py-1.5 text-gray-500 border rounded-lg hover:bg-gray-50">Cancel</button>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
