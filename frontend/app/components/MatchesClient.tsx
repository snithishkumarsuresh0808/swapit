'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from './Sidebar';
import BackButton from './BackButton';
import { getApiUrl } from '@/lib/config';

type Post = {
  id: number;
  user: number;
  username: string;
  first_name: string;
  last_name: string;
  profile_image?: string | null;
  skill_offered: string;
  skill_wanted: string;
  offered_level?: string;
  wanted_level?: string;
  availability?: string;
  available_now?: boolean;
  available_weekends?: boolean;
  created_at: string;
};

type SmartMatch = {
  id: number;
  matched_user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  profile_image?: string | null;
  match_score: number;
  matched_skill_offered: string;
  matched_skill_wanted: string;
  offered_level: string;
  wanted_level: string;
  availability?: string;
  available_now?: boolean;
  available_weekends?: boolean;
  common_skills?: string[];
};

type ConnectionStatus = {
  user_id: number;
  status: 'none' | 'pending_sent' | 'pending_received' | 'connected';
};

function findMatches(userPosts: Post[], allPosts: Post[]): Post[] {
  if (!userPosts.length || !allPosts.length) return [];
  const myWanted = userPosts.map((p) => p.skill_wanted.toLowerCase());
  const myOffered = userPosts.map((p) => p.skill_offered.toLowerCase());
  return allPosts.filter((p) => {
    const isOwn = userPosts.some((up) => up.id === p.id);
    if (isOwn) return false;
    const iOfferWhatTheyWant = myOffered.some((s) => p.skill_wanted.toLowerCase().includes(s) || s.includes(p.skill_wanted.toLowerCase()));
    const theyOfferWhatIWant = myWanted.some((s) => p.skill_offered.toLowerCase().includes(s) || s.includes(p.skill_offered.toLowerCase()));
    return iOfferWhatTheyWant && theyOfferWhatIWant;
  });
}

export default function MatchesClient({
  initialBasicMatches,
  initialSmartMatches,
  initialStatuses,
  initialCurrentUserId,
}: {
  initialBasicMatches: Post[];
  initialSmartMatches: SmartMatch[];
  initialStatuses: ConnectionStatus[];
  initialCurrentUserId: number | null;
}) {
  const router = useRouter();
  const [searchSkill, setSearchSkill] = useState('');
  const [filterAvail, setFilterAvail] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [availableNow, setAvailableNow] = useState(false);
  const [availableWeekends, setAvailableWeekends] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [subTab, setSubTab] = useState<'smart' | 'basic' | 'connect'>('smart');
  const [statuses, setStatuses] = useState<ConnectionStatus[]>(initialStatuses);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const smartMatches = initialSmartMatches;
  const basicMatches = initialBasicMatches;

  const fetchConnectionStatuses = async (userIds: number[]) => {
    if (!token || !userIds.length) return;
    try {
      const res = await fetch(getApiUrl('/api/messages/connections/statuses/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ user_ids: userIds }),
      });
      if (res.ok) setStatuses(await res.json());
    } catch {}
  };

  const getStatus = (userId: number): string => {
    const s = statuses.find((st) => st.user_id === userId);
    return s ? s.status : 'none';
  };

  const handleConnect = async (userId: number) => {
    if (!token) return;
    try {
      const res = await fetch(getApiUrl('/api/messages/connect/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ to_user_id: userId }),
      });
      if (res.ok) fetchConnectionStatuses([userId]);
    } catch {}
  };

  const handleAccept = async (userId: number) => {
    if (!token) return;
    try {
      const res = await fetch(getApiUrl(`/api/messages/connect/${userId}/accept/`), {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
      });
      if (res.ok) fetchConnectionStatuses([userId]);
    } catch {}
  };

  const filteredSmart = useMemo(() => {
    return smartMatches.filter((m) => {
      if (searchSkill && !m.matched_skill_offered.toLowerCase().includes(searchSkill.toLowerCase()) && !m.matched_skill_wanted.toLowerCase().includes(searchSkill.toLowerCase())) return false;
      if (filterLevel && m.offered_level !== filterLevel) return false;
      if (availableNow && !m.available_now) return false;
      if (availableWeekends && !m.available_weekends) return false;
      return true;
    });
  }, [smartMatches, searchSkill, filterLevel, availableNow, availableWeekends]);

  const filteredBasic = useMemo(() => {
    return basicMatches.filter((m) => {
      if (searchSkill && !m.skill_offered.toLowerCase().includes(searchSkill.toLowerCase()) && !m.skill_wanted.toLowerCase().includes(searchSkill.toLowerCase())) return false;
      if (filterLevel && m.offered_level !== filterLevel) return false;
      if (availableNow && !m.available_now) return false;
      if (availableWeekends && !m.available_weekends) return false;
      return true;
    });
  }, [basicMatches, searchSkill, filterLevel, availableNow, availableWeekends]);

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();

  const renderConnectButton = (userId: number) => {
    const status = getStatus(userId);
    if (status === 'connected') {
      return (
        <Link href={`/messages/${userId}`} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors">
          Message
        </Link>
      );
    }
    if (status === 'pending_sent') {
      return <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold">Request Sent</span>;
    }
    if (status === 'pending_received') {
      return (
        <button onClick={() => handleAccept(userId)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">
          Accept
        </button>
      );
    }
    return (
      <button onClick={() => handleConnect(userId)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors">
        Connect
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pt-16">
        <div className="max-w-3xl mx-auto px-3 py-4">
          <BackButton />
          <h1 className="text-lg font-bold text-gray-900 mb-3">Find Skill Partners</h1>

          <div className="flex gap-2 mb-4">
            {(['smart', 'basic', 'connect'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSubTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  subTab === tab ? 'bg-green-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-green-300'
                }`}
              >
                {tab === 'smart' ? 'Smart Matches' : tab === 'basic' ? 'All Skills' : 'Connect'}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search skills..."
              value={searchSkill}
              onChange={(e) => setSearchSkill(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {subTab !== 'connect' && (
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-full hover:border-green-300"
              >
                Filters
              </button>
              {showFilters && (
                <>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full"
                  >
                    <option value="">Any Level</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                  <button
                    onClick={() => setAvailableNow(!availableNow)}
                    className={`px-3 py-1.5 text-xs rounded-full border ${availableNow ? 'bg-green-600 text-white border-green-600' : 'bg-white border-gray-200'}`}
                  >
                    Available Now
                  </button>
                  <button
                    onClick={() => setAvailableWeekends(!availableWeekends)}
                    className={`px-3 py-1.5 text-xs rounded-full border ${availableWeekends ? 'bg-green-600 text-white border-green-600' : 'bg-white border-gray-200'}`}
                  >
                    Weekends
                  </button>
                </>
              )}
            </div>
          )}

          {subTab === 'smart' && (
            <div className="space-y-3">
              {filteredSmart.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-sm text-gray-500">No smart matches found. Add skills you want to learn to your posts.</p>
                </div>
              ) : (
                filteredSmart.map((match) => (
                  <div key={match.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start gap-3">
                      <Link href={`/user/${match.matched_user_id}`}>
                        {match.profile_image ? (
                          <img src={match.profile_image} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                            {getInitials(match.first_name, match.last_name)}
                          </div>
                        )}
                      </Link>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Link href={`/user/${match.matched_user_id}`} className="text-sm font-semibold text-gray-900 hover:underline">
                            {match.first_name} {match.last_name}
                          </Link>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                            {Math.round(match.match_score)}% match
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Offers: <span className="font-medium text-gray-700">{match.matched_skill_offered}</span> ({match.offered_level})
                        </p>
                        <p className="text-xs text-gray-500">
                          Wants: <span className="font-medium text-gray-700">{match.matched_skill_wanted}</span> ({match.wanted_level})
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          {renderConnectButton(match.matched_user_id)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {subTab === 'basic' && (
            <div className="space-y-3">
              {filteredBasic.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-sm text-gray-500">No matching skills found.</p>
                </div>
              ) : (
                filteredBasic.map((post) => (
                  <div key={post.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start gap-3">
                      <Link href={`/user/${post.user}`}>
                        {post.profile_image ? (
                          <img src={post.profile_image} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
                            {getInitials(post.first_name, post.last_name)}
                          </div>
                        )}
                      </Link>
                      <div className="flex-1">
                        <Link href={`/user/${post.user}`} className="text-sm font-semibold text-gray-900 hover:underline">
                          {post.first_name} {post.last_name}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Offers: <span className="font-medium text-gray-700">{post.skill_offered}</span> ({post.offered_level})
                        </p>
                        <p className="text-xs text-gray-500">
                          Wants: <span className="font-medium text-gray-700">{post.skill_wanted}</span> ({post.wanted_level})
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          {renderConnectButton(post.user)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {subTab === 'connect' && (
            <div className="space-y-3">
              {statuses.filter((s) => s.status === 'pending_received').length === 0 &&
              statuses.filter((s) => s.status === 'connected').length === 0 &&
              statuses.filter((s) => s.status === 'pending_sent').length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-sm text-gray-500">No connections yet.</p>
                </div>
              ) : (
                <>
                  {statuses.filter((s) => s.status === 'pending_received').length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Pending Requests</h3>
                      {statuses.filter((s) => s.status === 'pending_received').map((s) => (
                        <div key={s.user_id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between mb-2">
                          <Link href={`/user/${s.user_id}`} className="text-sm font-semibold text-gray-900 hover:underline">
                            User #{s.user_id}
                          </Link>
                          <div className="flex gap-2">
                            <button onClick={() => handleAccept(s.user_id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700">
                              Accept
                            </button>
                            <Link href={`/messages/${s.user_id}`} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700">
                              Message
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {statuses.filter((s) => s.status === 'connected').length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Connected</h3>
                      {statuses.filter((s) => s.status === 'connected').map((s) => (
                        <div key={s.user_id} className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between mb-2">
                          <Link href={`/user/${s.user_id}`} className="text-sm font-semibold text-gray-900 hover:underline">
                            User #{s.user_id}
                          </Link>
                          <Link href={`/messages/${s.user_id}`} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700">
                            Message
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
