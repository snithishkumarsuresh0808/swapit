'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import BackButton from './BackButton';
import { getApiUrl } from '@/lib/config';

type BadgeData = {
  id: number; key: string; name: string; icon: string;
  description: string; xp_reward: number; earned: boolean; earned_at: string | null;
};

type XPLogEntry = { id: number; amount: number; reason: string; created_at: string };

type SkillProgressEntry = {
  id: number; skill_name: string; progress: number;
  sessions_completed: number; updated_at: string;
};

type Dashboard = {
  xp: number; login_streak: number;
  level_info: { level: number; xp: number; current_xp: number; xp_needed: number; progress: number };
  badges: BadgeData[]; recent_xp: XPLogEntry[]; skill_progress: SkillProgressEntry[];
};

type LeaderboardEntry = {
  rank: number;
  user: { id: number; username: string; first_name: string; last_name: string; profile_image: string | null };
  xp: number;
  level_info: { level: number; xp: number; progress: number };
};

type Props = {
  initialDashboard: Dashboard | null;
  initialBadges: BadgeData[];
  initialLeaderboard: LeaderboardEntry[];
  initialSkillProgress: SkillProgressEntry[];
  currentUserId: number | null;
};

const ALL_SKILLS = [
  'Python', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Django', 'Node.js',
  'HTML/CSS', 'SQL', 'Java', 'C++', 'Go', 'Rust', 'Swift', 'Kotlin',
  'Photography', 'Video Editing', 'Graphic Design', 'Music Production',
  'Public Speaking', 'Writing', 'Cooking', 'Fitness Training', 'Yoga',
  'Spanish', 'French', 'Japanese', 'Mandarin',
  'Machine Learning', 'Data Analysis', 'Web Development', 'Mobile Development',
];

export default function GamificationClient({
  initialDashboard, initialBadges, initialLeaderboard, initialSkillProgress, currentUserId
}: Props) {
  const [dashboard] = useState<Dashboard | null>(initialDashboard);
  const [badges] = useState<BadgeData[]>(initialBadges);
  const [leaderboard] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const [skillProgress, setSkillProgress] = useState<SkillProgressEntry[]>(initialSkillProgress);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedProgress, setSelectedProgress] = useState(50);
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'skills' | 'leaderboard'>('overview');
  const [saving, setSaving] = useState(false);

  const level = dashboard?.level_info;
  const earnedBadges = badges.filter(b => b.earned);
  const unearnedBadges = badges.filter(b => !b.earned);

  const handleAddSkill = useCallback(async () => {
    if (!selectedSkill) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(getApiUrl('/api/gamification/skill-progress/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ skill_name: selectedSkill, progress: selectedProgress }),
      });
      if (res.ok) {
        const data = await res.json();
        setSkillProgress(prev => {
          const idx = prev.findIndex(s => s.skill_name === selectedSkill);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = data;
            return updated;
          }
          return [...prev, data];
        });
        setShowSkillForm(false);
        setSelectedSkill('');
        setSelectedProgress(50);
      }
    } catch {}
    setSaving(false);
  }, [selectedSkill, selectedProgress]);

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
            <BackButton label="" />
            <h1 className="text-xl font-bold text-gray-900">Achievements</h1>
          </div>
        </header>
        <div className="max-w-4xl mx-auto p-4 text-center py-16">
          <p className="text-gray-500 text-lg">Could not load gamification data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2">
          <BackButton label="" />
          <h1 className="text-xl font-bold text-gray-900">Achievements</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4">
        {/* Level Card */}
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-6 text-white mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-green-100">Level</div>
              <div className="text-4xl font-bold">{level?.level || 1}</div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{dashboard.xp.toLocaleString()}</div>
              <div className="text-sm text-green-100">Total XP</div>
            </div>
          </div>
          <div className="w-full bg-green-800 rounded-full h-3 mb-2">
            <div
              className="bg-white rounded-full h-3 transition-all duration-500"
              style={{ width: `${(level?.progress || 0) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-green-100">
            <span>{level?.current_xp || 0} XP in this level</span>
            <span>{level?.xp_needed || 0} XP to next level</span>
          </div>
          {dashboard.login_streak > 0 && (
            <div className="mt-4 flex items-center gap-2 bg-green-800/50 rounded-lg px-3 py-2">
              <span className="text-lg">🔥</span>
              <span className="text-sm font-medium">{dashboard.login_streak} Day Streak</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-200 rounded-xl p-1 mb-6">
          {(['overview', 'badges', 'skills', 'leaderboard'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-white text-green-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{earnedBadges.length}</div>
                <div className="text-xs text-gray-500 mt-1">Badges Earned</div>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{skillProgress.length}</div>
                <div className="text-xs text-gray-500 mt-1">Skills Tracked</div>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{leaderboard.length > 0 ? `#${leaderboard.find(l => l.user.id === currentUserId)?.rank || leaderboard.length + 1}` : '—'}</div>
                <div className="text-xs text-gray-500 mt-1">Your Rank</div>
              </div>
            </div>

            {/* Recent XP */}
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-bold text-gray-900 mb-3">Recent XP</h3>
              {dashboard.recent_xp.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No XP earned yet. Start exchanging skills!</p>
              ) : (
                <div className="space-y-2">
                  {dashboard.recent_xp.map(log => (
                    <div key={log.id} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-gray-700">{log.reason || 'XP earned'}</span>
                      <span className="text-sm font-bold text-green-600">+{log.amount} XP</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Badges */}
            {earnedBadges.length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">Recent Badges</h3>
                  <button onClick={() => setActiveTab('badges')} className="text-sm text-green-600 hover:underline">View All</button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {earnedBadges.slice(0, 4).map(b => (
                    <div key={b.id} className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                      <span className="text-xl">{b.icon}</span>
                      <span className="text-sm font-medium text-gray-900">{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-bold text-gray-900 mb-1">Earned ({earnedBadges.length}/{badges.length})</h3>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2 mb-4">
                <div
                  className="bg-green-600 rounded-full h-2 transition-all duration-500"
                  style={{ width: `${badges.length > 0 ? (earnedBadges.length / badges.length) * 100 : 0}%` }}
                />
              </div>
              {earnedBadges.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No badges earned yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {earnedBadges.map(b => (
                    <div key={b.id} className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <span className="text-3xl">{b.icon}</span>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{b.name}</div>
                        <div className="text-xs text-gray-500">{b.description}</div>
                        {b.earned_at && (
                          <div className="text-xs text-green-600 mt-1">
                            Earned {new Date(b.earned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {unearnedBadges.length > 0 && (
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-bold text-gray-900 mb-3">Locked ({unearnedBadges.length})</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {unearnedBadges.map(b => (
                    <div key={b.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4 opacity-60">
                      <span className="text-3xl grayscale">{b.icon}</span>
                      <div>
                        <div className="font-bold text-gray-700 text-sm">{b.name}</div>
                        <div className="text-xs text-gray-500">{b.description}</div>
                        {b.xp_reward > 0 && (
                          <div className="text-xs text-blue-500 mt-1">+{b.xp_reward} XP reward</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Skill Progress</h3>
              <button
                onClick={() => setShowSkillForm(!showSkillForm)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
              >
                {showSkillForm ? 'Cancel' : '+ Add Skill'}
              </button>
            </div>

            {showSkillForm && (
              <div className="bg-white rounded-xl border p-5">
                <h4 className="font-bold text-gray-900 mb-3">Track Skill Progress</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Skill</label>
                    <select
                      value={selectedSkill}
                      onChange={e => setSelectedSkill(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">Select a skill...</option>
                      {ALL_SKILLS.filter(s => !skillProgress.find(sp => sp.skill_name === s)).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Progress: {selectedProgress}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={selectedProgress}
                      onChange={e => setSelectedProgress(parseInt(e.target.value))}
                      className="w-full mt-1 accent-green-600"
                    />
                  </div>
                  <button
                    onClick={handleAddSkill}
                    disabled={!selectedSkill || saving}
                    className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Add Skill'}
                  </button>
                </div>
              </div>
            )}

            {skillProgress.length === 0 ? (
              <div className="bg-white rounded-xl border p-8 text-center">
                <p className="text-gray-500">No skills tracked yet.</p>
                <p className="text-sm text-gray-400 mt-1">Add skills to track your learning progress!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {skillProgress.map(skill => (
                  <div key={skill.id} className="bg-white rounded-xl border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900 text-sm">{skill.skill_name}</span>
                      <span className="text-sm font-bold text-green-600">{skill.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 rounded-full h-2.5 transition-all duration-500"
                        style={{ width: `${skill.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-xs text-gray-400">{skill.sessions_completed} sessions completed</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-xl border">
            {leaderboard.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">No one on the leaderboard yet.</p>
                <p className="text-sm text-gray-400 mt-1">Be the first to earn XP!</p>
              </div>
            ) : (
              <div className="divide-y">
                {leaderboard.map(entry => {
                  const isMe = entry.user.id === currentUserId;
                  const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : null;
                  return (
                    <div key={entry.user.id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-green-50' : ''}`}>
                      <div className="w-8 text-center">
                        {medal ? (
                          <span className="text-xl">{medal}</span>
                        ) : (
                          <span className="text-sm font-bold text-gray-500">#{entry.rank}</span>
                        )}
                      </div>
                      <Link href={`/user/${entry.user.id}`} className="shrink-0">
                        {entry.user.profile_image ? (
                          <img src={entry.user.profile_image} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-xs">
                            {entry.user.first_name?.[0]}{entry.user.last_name?.[0]}
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {entry.user.first_name} {entry.user.last_name}
                          {isMe && <span className="text-green-600 ml-1">(You)</span>}
                        </div>
                        <div className="text-xs text-gray-500">Level {entry.level_info.level}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-600">{entry.xp.toLocaleString()} XP</div>
                        <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div className="bg-green-500 rounded-full h-1.5" style={{ width: `${(entry.level_info.progress || 0) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
