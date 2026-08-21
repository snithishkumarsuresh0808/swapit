'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/config';
import BackButton from '../components/BackButton';

type RecommendedSkill = { name: string; category: string; relevance_score: number; reasons: string[] };
type GeneratedProfile = { about_me: string; skills: string[]; wanted_skills: string[]; availability: string[]; time_slots: string[] };
type GeneratedPost = { title: string; description: string; skills: string[]; wanted_skills: string[]; availability: string[]; level: string; time_slots: string[] };

export default function AIPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'recommend' | 'profile' | 'post'>('recommend');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <BackButton label="" />
          <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-sm text-gray-500">Powered by smart algorithms</p>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-3 flex gap-1">
          {[
            { key: 'recommend' as const, label: 'Skill Advisor', icon: '🎯' },
            { key: 'profile' as const, label: 'Profile Writer', icon: '✍️' },
            { key: 'post' as const, label: 'Post Generator', icon: '📝' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-green-600 text-white'
                  : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4">
        {activeTab === 'recommend' && <SkillAdvisor />}
        {activeTab === 'profile' && <ProfileWriter />}
        {activeTab === 'post' && <PostGenerator />}
      </div>
    </div>
  );
}


// ============================================================
// Feature 1: AI Skill Advisor
// ============================================================

function SkillAdvisor() {
  const [input, setInput] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [result, setResult] = useState<{ recommended_skills: RecommendedSkill[]; match_insight: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [token] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const addSkill = () => {
    const trimmed = input.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setInput('');
    }
  };

  const removeSkill = (s: string) => setSkills(skills.filter(x => x !== s));

  const analyze = async () => {
    if (skills.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/skills/ai/recommend/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ skills }),
      });
      if (res.ok) setResult(await res.json());
    } catch {} finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-1">What do you know?</h2>
        <p className="text-sm text-gray-500 mb-3">Enter your current skills and we&apos;ll suggest what to learn next</p>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSkill()}
            placeholder="e.g., Python, JavaScript, Guitar..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <button onClick={addSkill} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Add</button>
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {skills.map(s => (
              <span key={s} className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                {s}
                <button onClick={() => removeSkill(s)} className="hover:text-red-500 ml-0.5">✕</button>
              </span>
            ))}
          </div>
        )}

        <button
          onClick={analyze}
          disabled={skills.length === 0 || loading}
          className="mt-4 w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Get Recommendations'}
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          {result.match_insight && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-800 font-medium">💡 {result.match_insight}</p>
            </div>
          )}

          <h3 className="font-bold text-gray-900">Recommended Skills</h3>
          {result.recommended_skills.length === 0 ? (
            <p className="text-gray-500 text-sm">No recommendations found. Try adding more skills.</p>
          ) : (
            <div className="grid gap-2">
              {result.recommended_skills.map((rec, i) => (
                <div key={i} className="bg-white rounded-xl border p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{rec.name}</span>
                      {rec.category && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{rec.category}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{rec.reasons[0]}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">
                      {rec.relevance_score}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ============================================================
// Feature 2: AI Profile Writer
// ============================================================

function ProfileWriter() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ generated_profile: GeneratedProfile; suggested_wanted_skills: string[]; confidence: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [token] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const examples = [
    "I'm a 2nd year CS student. I know Python and basic Django. I want to learn React.",
    "I'm a frontend developer with 2 years of experience in JavaScript and React. Looking to learn backend development and Node.js.",
    "I know Hindi and English. I want to learn Japanese. Available on weekends.",
    "I'm a graphic designer skilled in Figma and Photoshop. I want to learn UI/UX design and web development.",
    "I know cooking, especially Indian cuisine. I want to learn French cooking and baking. Available evenings.",
  ];

  const generate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/skills/ai/profile-assistant/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ text: input }),
      });
      if (res.ok) setResult(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const applyToProfile = async () => {
    if (!result) return;
    setApplying(true);
    try {
      const res = await fetch(getApiUrl('/api/profile/'), {
        method: 'GET',
        headers: { Authorization: `Token ${token}` },
      });
      const method = res.ok ? 'PUT' : 'POST';

      const profileRes = await fetch(getApiUrl('/api/profile/'), {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({
          skills: result.generated_profile.skills,
          wanted_skills: result.generated_profile.wanted_skills,
          availability: result.generated_profile.availability,
          time_slots: result.generated_profile.time_slots,
        }),
      });
      if (profileRes.ok) {
        alert('Profile updated successfully!');
        router.push('/settings');
      }
    } catch {} finally { setApplying(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Tell us about yourself</h2>
        <p className="text-sm text-gray-500 mb-3">Describe your skills, what you want to learn, and availability in plain English</p>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="e.g., I'm a 2nd year CS student. I know Python and basic Django. I want to learn React. Available on weekends..."
          rows={4}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
        />

        <div className="flex flex-wrap gap-1 mt-2">
          <span className="text-xs text-gray-400 mr-1">Try:</span>
          {examples.slice(0, 3).map((ex, i) => (
            <button
              key={i}
              onClick={() => setInput(ex)}
              className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 truncate max-w-[200px]"
            >
              {ex}
            </button>
          ))}
        </div>

        <button
          onClick={generate}
          disabled={!input.trim() || loading}
          className="mt-3 w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : 'Generate Profile'}
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
            result.confidence === 'high' ? 'bg-green-50 text-green-700' :
            result.confidence === 'medium' ? 'bg-yellow-50 text-yellow-700' :
            'bg-red-50 text-red-700'
          }`}>
            Confidence: {result.confidence.toUpperCase()}
          </div>

          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-bold text-gray-900 mb-2">Generated Profile</h3>

            {result.generated_profile.about_me && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase">About Me</p>
                <p className="text-sm text-gray-700 mt-1">{result.generated_profile.about_me}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {result.generated_profile.skills.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">{s}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Wants to Learn</p>
                <div className="flex flex-wrap gap-1">
                  {result.generated_profile.wanted_skills.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{s}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Availability</p>
                <div className="flex flex-wrap gap-1">
                  {result.generated_profile.availability.length > 0
                    ? result.generated_profile.availability.map(d => (
                        <span key={d} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{d}</span>
                      ))
                    : <span className="text-xs text-gray-400">Not specified</span>
                  }
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Time Slots</p>
                <div className="flex flex-wrap gap-1">
                  {result.generated_profile.time_slots.length > 0
                    ? result.generated_profile.time_slots.map(t => (
                        <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{t}</span>
                      ))
                    : <span className="text-xs text-gray-400">Not specified</span>
                  }
                </div>
              </div>
            </div>
          </div>

          {result.suggested_wanted_skills.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Suggested Additional Skills to Learn</p>
              <div className="flex flex-wrap gap-1">
                {result.suggested_wanted_skills.map(s => (
                  <span key={s} className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded cursor-pointer hover:bg-purple-200">
                    + {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={applyToProfile}
            disabled={applying}
            className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {applying ? 'Applying...' : 'Apply to My Profile'}
          </button>
        </div>
      )}
    </div>
  );
}


// ============================================================
// Feature 3: AI Post Generator
// ============================================================

function PostGenerator() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ generated_post: GeneratedPost; avail_text: string; confidence: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [token] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  const examples = [
    "I can teach Python. Want to learn React.",
    "I know JavaScript and can help you learn web development. Looking to learn machine learning.",
    "I can teach guitar - chords, strumming, fingerpicking. Want to learn piano. Available weekends.",
    "I know digital marketing, SEO, and social media. Want to learn data analysis with Python.",
    "I can teach cooking, especially Indian and Italian cuisine. Want to learn French baking.",
  ];

  const generate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/skills/ai/post-generator/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
        body: JSON.stringify({ text: input }),
      });
      if (res.ok) setResult(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const applyToPost = async () => {
    if (!result) return;
    setApplying(true);
    try {
      const gp = result.generated_post;
      const res = await fetch(getApiUrl('/api/posts/'), {
        method: 'POST',
        headers: { Authorization: `Token ${token}` },
        body: (() => {
          const fd = new FormData();
          fd.append('skills', JSON.stringify(gp.skills));
          fd.append('wanted_skills', JSON.stringify(gp.wanted_skills));
          fd.append('availability', JSON.stringify(gp.availability));
          fd.append('time_slots', JSON.stringify(gp.time_slots));
          return fd;
        })(),
      });
      if (res.ok) {
        alert('Post created successfully!');
        router.push('/posts');
      }
    } catch {} finally { setApplying(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-5">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Describe your exchange</h2>
        <p className="text-sm text-gray-500 mb-3">Tell us what you can teach and what you want to learn</p>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="e.g., I can teach Python. Want to learn React. Available on weekends..."
          rows={3}
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
        />

        <div className="flex flex-wrap gap-1 mt-2">
          <span className="text-xs text-gray-400 mr-1">Try:</span>
          {examples.slice(0, 3).map((ex, i) => (
            <button
              key={i}
              onClick={() => setInput(ex)}
              className="text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 truncate max-w-[200px]"
            >
              {ex}
            </button>
          ))}
        </div>

        <button
          onClick={generate}
          disabled={!input.trim() || loading}
          className="mt-3 w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Generating...' : 'Generate Post'}
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
            result.confidence === 'high' ? 'bg-green-50 text-green-700' :
            result.confidence === 'medium' ? 'bg-yellow-50 text-yellow-700' :
            'bg-red-50 text-red-700'
          }`}>
            Confidence: {result.confidence.toUpperCase()}
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-blue-500 p-4 text-white">
              <h3 className="text-lg font-bold">{result.generated_post.title}</h3>
              <p className="text-sm text-green-100 mt-1">{result.avail_text} · {result.generated_post.level}</p>
            </div>

            <div className="p-4">
              <div className="whitespace-pre-line text-sm text-gray-700 mb-4">{result.generated_post.description}</div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-green-600 uppercase mb-1">Can Teach</p>
                  <div className="flex flex-wrap gap-1">
                    {result.generated_post.skills.map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">{s}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-600 uppercase mb-1">Wants to Learn</p>
                  <div className="flex flex-wrap gap-1">
                    {result.generated_post.wanted_skills.map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={applyToPost}
            disabled={applying}
            className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {applying ? 'Creating...' : 'Create This Post'}
          </button>
        </div>
      )}
    </div>
  );
}
