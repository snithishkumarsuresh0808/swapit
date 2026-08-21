'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BackButton from './BackButton';
import { getApiUrl } from '@/lib/config';

type MatchResult = {
  user: { id: number; username: string; email: string; first_name: string; last_name: string; profile_image: string | null };
  profile: { skills: string[]; wanted_skills: string[]; availability: string[]; time_slots: string[] };
  match_score: number;
  match_breakdown: { skill_compatibility: number; wanted_skill_match: number; availability: number; profile_completeness: number; mutual_bonus: number };
  skills_teach: string[];
  skills_want: string[];
  availability: string[];
  time_slots: string[];
  avg_rating: number | null;
  total_reviews: number;
  total_sessions: number;
  connection_status: string;
};

export default function DiscoverClient({ initialMatches }: { initialMatches: MatchResult[] }) {
  const router = useRouter();
  const [matches] = useState<MatchResult[]>(initialMatches);
  const [activeTab, setActiveTab] = useState<'all' | 'top' | 'new' | 'available'>('all');
  const [searchSkill, setSearchSkill] = useState('');
  const [filterAvail, setFilterAvail] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [availableNow, setAvailableNow] = useState(false);
  const [availableWeekends, setAvailableWeekends] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [statuses, setStatuses] = useState<Record<number, any>>({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    const userIds = matches.map(m => m.user.id);
    if (userIds.length > 0) {
      fetch(getApiUrl('/api/messages/connections/statuses/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ user_ids: userIds }),
      }).then(r => r.ok ? r.json() : null).then(data => { if (data) setStatuses(data); }).catch(() => {});
    }
  }, []);

  const filteredMatches = useMemo(() => {
    let filtered = [...matches];
    if (searchSkill) { const q = searchSkill.toLowerCase(); filtered = filtered.filter(m => m.skills_teach.some(s => s.includes(q)) || m.skills_want.some(s => s.includes(q))); }
    if (filterAvail) { filtered = filtered.filter(m => m.availability.map(a => a.toLowerCase()).includes(filterAvail.toLowerCase())); }
    return filtered;
  }, [matches, searchSkill, filterAvail]);

  const getDisplayMatches = () => {
    switch (activeTab) {
      case 'top': return filteredMatches.filter(m => m.match_score >= 70);
      case 'available': { const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']; const today = days[new Date().getDay()]; return filteredMatches.filter(m => m.availability.map(a => a.toLowerCase()).includes(today)); }
      case 'new': return filteredMatches.slice(0, 10);
      default: return filteredMatches;
    }
  };

  const getStatusDisplay = (userId: number) => { const s: any = statuses[userId]; if (!s || s === 'none') return null; if (typeof s === 'object' && s.status) return s.status; return null; };

  const handleConnect = async (userId: number) => {
    const token = localStorage.getItem('token');
    const res = await fetch(getApiUrl('/api/messages/connections/send/'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` }, body: JSON.stringify({ to_user_id: userId }) });
    if (res.ok) setStatuses(prev => ({ ...prev, [userId]: { status: 'pending', is_sender: true } }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <BackButton label="" />
          <h1 className="text-xl font-bold text-gray-900">Discover Matches</h1>
          <div className="flex gap-2 mt-3">
            <input type="text" placeholder="Search by skill..." value={searchSkill} onChange={e => setSearchSkill(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500" />
            <button onClick={() => setShowFilters(!showFilters)} className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">Filters {showFilters ? '▲' : '▼'}</button>
          </div>
          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select value={filterAvail} onChange={e => setFilterAvail(e.target.value)} className="px-2 py-1.5 border rounded text-sm">
                <option value="">Availability</option>
                <option value="Monday">Monday</option><option value="Tuesday">Tuesday</option><option value="Wednesday">Wednesday</option><option value="Thursday">Thursday</option><option value="Friday">Friday</option><option value="Saturday">Saturday</option><option value="Sunday">Sunday</option>
              </select>
              <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="px-2 py-1.5 border rounded text-sm">
                <option value="">Level</option>
                <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
              </select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={availableNow} onChange={e => setAvailableNow(e.target.checked)} className="rounded" /> Available Now</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={availableWeekends} onChange={e => setAvailableWeekends(e.target.checked)} className="rounded" /> Weekends</label>
            </div>
          )}
          <div className="flex gap-1 mt-3 overflow-x-auto">
            {[{ key: 'all' as const, label: `All (${filteredMatches.length})` }, { key: 'top' as const, label: 'Top Matches' }, { key: 'new' as const, label: 'New' }, { key: 'available' as const, label: 'Available Now' }].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${activeTab === tab.key ? 'bg-green-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>{tab.label}</button>
            ))}
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        {getDisplayMatches().length === 0 ? (
          <div className="text-center py-12"><p className="text-gray-500 text-lg">No matches found</p><p className="text-gray-400 text-sm mt-2">Try adjusting your filters or create a post to get matched</p></div>
        ) : getDisplayMatches().map(m => {
          const status = getStatusDisplay(m.user.id);
          return (
            <div key={m.user.id} className="bg-white rounded-xl border p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <Link href={`/user/${m.user.id}`} className="shrink-0">
                  {m.user.profile_image ? (<img src={m.user.profile_image} alt="" className="w-12 h-12 rounded-full object-cover" />) : (<div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-lg">{m.user.first_name?.[0]}{m.user.last_name?.[0]}</div>)}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <Link href={`/user/${m.user.id}`} className="font-semibold text-gray-900 hover:underline truncate">{m.user.first_name} {m.user.last_name}</Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${m.match_score >= 70 ? 'bg-green-100 text-green-700' : m.match_score >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{m.match_score}% Match</span>
                      {m.avg_rating && <span className="text-xs text-yellow-600">⭐ {m.avg_rating}</span>}
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-green-700 font-medium">Teaches: {m.skills_teach.slice(0, 4).join(', ')}{m.skills_teach.length > 4 ? '...' : ''}</p>
                    <p className="text-xs text-blue-700 font-medium">Wants: {m.skills_want.slice(0, 4).join(', ')}{m.skills_want.length > 4 ? '...' : ''}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">{m.availability.slice(0, 3).map(day => (<span key={day} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{day}</span>))}</div>
                  <div className="mt-2 text-[11px] text-gray-400">{m.total_sessions} sessions · {m.total_reviews} reviews</div>
                  <div className="flex gap-2 mt-3">
                    {status && status !== 'none' ? (
                      <span className={`text-xs px-3 py-1.5 rounded-lg ${status === 'accepted' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}>
                        {status === 'accepted' ? <Link href={`/messages/${m.user.id}`} className="hover:underline">Chat →</Link> : 'Pending'}
                      </span>
                    ) : (
                      <button onClick={() => handleConnect(m.user.id)} className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">Connect</button>
                    )}
                    <Link href={`/user/${m.user.id}`} className="text-xs px-3 py-1.5 border rounded-lg text-gray-600 hover:bg-gray-50">Profile</Link>
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
