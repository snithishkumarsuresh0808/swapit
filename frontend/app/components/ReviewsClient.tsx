'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import BackButton from './BackButton';
import { getApiUrl } from '@/lib/config';

type Review = {
  id: number;
  reviewer: { id: number; username: string; first_name: string; last_name: string; profile_image: string | null };
  reviewed_user: { id: number; username: string; first_name: string; last_name: string };
  skill_rating: number; communication_rating: number; reliability_rating: number;
  comment: string; skills_taught: string[]; average_rating: number; created_at: string;
};

type Reputation = {
  avg_skill_rating: number | null; avg_communication_rating: number | null; avg_reliability_rating: number | null;
  overall_rating: number | null; total_reviews: number; total_sessions: number; response_rate: number;
};

const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
  <div className="flex items-center gap-2">
    <span className="text-sm text-gray-600 w-28">{label}</span>
    <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map(star => (<button key={star} onClick={() => onChange(star)} className={`text-xl ${star <= value ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>))}</div>
  </div>
);

export default function ReviewsClient({ initialReviews, initialReputation }: { initialReviews: Review[]; initialReputation: Reputation | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get('session');
  const userParam = searchParams.get('user');

  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [reputation, setReputation] = useState<Reputation | null>(initialReputation);
  const [showForm, setShowForm] = useState(!!sessionParam);
  const [form, setForm] = useState({ reviewed_user_id: userParam || '', session_id_str: sessionParam || '', skill_rating: '5', communication_rating: '5', reliability_rating: '5', comment: '', skills_taught: '' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  const fetchReviews = async (userId: string) => {
    const token = localStorage.getItem('token');
    const url = userId ? getApiUrl(`/api/skills/reviews/user/${userId}/`) : getApiUrl('/api/skills/reviews/');
    const res = await fetch(url, { headers: { Authorization: `Token ${token}` } });
    if (res.ok) setReviews(await res.json());
  };

  const fetchReputation = async (userId: string) => {
    const token = localStorage.getItem('token');
    const res = await fetch(getApiUrl(`/api/skills/reputation/${userId}/`), { headers: { Authorization: `Token ${token}` } });
    if (res.ok) setReputation(await res.json());
  };

  const handleSubmit = async () => {
    if (!form.reviewed_user_id) { setFormError('Please select a user to review'); return; }
    setFormError('');
    const token = localStorage.getItem('token');
    const res = await fetch(getApiUrl('/api/skills/reviews/'), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Token ${token}` },
      body: JSON.stringify({ reviewed_user_id: parseInt(form.reviewed_user_id), session_id_str: form.session_id_str, skill_rating: parseInt(form.skill_rating), communication_rating: parseInt(form.communication_rating), reliability_rating: parseInt(form.reliability_rating), comment: form.comment, skills_taught: form.skills_taught ? form.skills_taught.split(',').map(s => s.trim()) : [] }),
    });
    if (res.ok) { setFormSuccess(true); setShowForm(false); setTimeout(() => setFormSuccess(false), 3000); fetchReviews(userParam || ''); if (userParam) fetchReputation(userParam); } else { const data = await res.json(); setFormError(data.error || data.detail || 'Failed to submit review'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><BackButton label="" /><h1 className="text-xl font-bold text-gray-900">{userParam ? 'User Reviews' : 'My Reviews'}</h1></div>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">{showForm ? 'Cancel' : '+ Write Review'}</button>
        </div>
      </header>
      <div className="max-w-4xl mx-auto p-4">
        {formSuccess && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">Review submitted successfully!</div>}
        {reputation && (
          <div className="bg-white rounded-xl border p-5 mb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div><div className="text-3xl font-bold text-green-600">{reputation.overall_rating || '—'}</div><div className="text-sm text-gray-500 mt-1">Overall Rating</div></div>
              <div><div className="text-3xl font-bold text-gray-900">{reputation.total_reviews}</div><div className="text-sm text-gray-500 mt-1">Reviews</div></div>
              <div><div className="text-3xl font-bold text-blue-600">{reputation.total_sessions}</div><div className="text-sm text-gray-500 mt-1">Sessions</div></div>
              <div><div className="text-3xl font-bold text-purple-600">{reputation.response_rate}%</div><div className="text-sm text-gray-500 mt-1">Response Rate</div></div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              {reputation.avg_skill_rating && <div><div className="text-lg font-semibold text-yellow-600">⭐ {reputation.avg_skill_rating}</div><div className="text-xs text-gray-500">Skill Quality</div></div>}
              {reputation.avg_communication_rating && <div><div className="text-lg font-semibold text-yellow-600">💬 {reputation.avg_communication_rating}</div><div className="text-xs text-gray-500">Communication</div></div>}
              {reputation.avg_reliability_rating && <div><div className="text-lg font-semibold text-yellow-600">🤝 {reputation.avg_reliability_rating}</div><div className="text-xs text-gray-500">Reliability</div></div>}
            </div>
          </div>
        )}
        {showForm && (
          <div className="bg-white rounded-xl border p-5 mb-4">
            <h2 className="text-lg font-bold mb-3">Write a Review</h2>
            <div className="space-y-3">
              {!userParam && (<div><label className="text-sm font-medium text-gray-700">User ID to review</label><input type="number" value={form.reviewed_user_id} onChange={e => setForm({ ...form, reviewed_user_id: e.target.value })} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" placeholder="Enter user ID" /></div>)}
              <StarRating value={parseInt(form.skill_rating)} onChange={v => setForm({ ...form, skill_rating: String(v) })} label="Skill Quality" />
              <StarRating value={parseInt(form.communication_rating)} onChange={v => setForm({ ...form, communication_rating: String(v) })} label="Communication" />
              <StarRating value={parseInt(form.reliability_rating)} onChange={v => setForm({ ...form, reliability_rating: String(v) })} label="Reliability" />
              <div><label className="text-sm font-medium text-gray-700">Skills taught (comma-separated)</label><input type="text" value={form.skills_taught} onChange={e => setForm({ ...form, skills_taught: e.target.value })} placeholder="e.g., Python, React, Guitar" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700">Comment</label><textarea value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} placeholder="Share your experience..." rows={3} className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" /></div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <button onClick={handleSubmit} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">Submit Review</button>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {reviews.length === 0 ? (<div className="text-center py-12"><p className="text-gray-500 text-lg">No reviews yet</p><p className="text-gray-400 text-sm mt-2">Complete a session and leave a review to build reputation</p></div>) : reviews.map(r => (
            <div key={r.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <Link href={`/user/${r.reviewer.id}`} className="shrink-0">
                  {r.reviewer.profile_image ? (<img src={r.reviewer.profile_image} alt="" className="w-10 h-10 rounded-full object-cover" />) : (<div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm">{r.reviewer.first_name?.[0]}{r.reviewer.last_name?.[0]}</div>)}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <Link href={`/user/${r.reviewer.id}`} className="font-semibold text-gray-900 hover:underline text-sm">{r.reviewer.first_name} {r.reviewer.last_name}</Link>
                    <span className="text-lg font-bold text-green-600">{r.average_rating}⭐</span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500"><span>Skill: {r.skill_rating}/5</span><span>Communication: {r.communication_rating}/5</span><span>Reliability: {r.reliability_rating}/5</span></div>
                  {r.skills_taught.length > 0 && <div className="flex gap-1 mt-2">{r.skills_taught.map(skill => (<span key={skill} className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded">{skill}</span>))}</div>}
                  {r.comment && <p className="text-sm text-gray-600 mt-2">{r.comment}</p>}
                  <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
