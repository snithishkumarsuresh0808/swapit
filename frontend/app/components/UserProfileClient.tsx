'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import BackButton from './BackButton';

interface Post {
  id: number;
  user: { id: number; username: string; email: string; first_name: string; last_name: string; profile_image?: string | null };
  skills: string[]; wanted_skills: string[]; availability: string[]; time_slots: string[];
  created_at: string; updated_at: string;
}

interface UserProfileProps {
  posts: Post[];
  userInfo: any;
  reputation: any;
  reviews: any[];
}

export default function UserProfileClient({ posts, userInfo, reputation, reviews }: UserProfileProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="pt-16 bg-gradient-to-b from-gray-50 to-white min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <BackButton />
          {userInfo && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                    {userInfo.profile_image ? (
                      <img src={userInfo.profile_image} alt={`${userInfo.first_name} ${userInfo.last_name}`} className="w-full h-full object-cover" />
                    ) : (
                      <span>{userInfo.first_name?.charAt(0)}{userInfo.last_name?.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">{userInfo.first_name} {userInfo.last_name}</h1>
                    <p className="text-xs text-gray-600">@{userInfo.username}</p>
                    <p className="text-xs text-gray-500">{userInfo.email}</p>
                  </div>
                </div>
                <button onClick={() => router.push(`/messages/${userInfo.id}`)} className="px-3 py-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all text-xs font-semibold flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  Message
                </button>
              </div>
              {reputation && reputation.total_reviews > 0 && (
                <div className="mt-3 pt-3 border-t grid grid-cols-4 gap-2 text-center">
                  <div><div className="text-lg font-bold text-green-600">{reputation.overall_rating || '—'}⭐</div><div className="text-[10px] text-gray-500">Rating</div></div>
                  <div><div className="text-lg font-bold text-gray-900">{reputation.total_reviews}</div><div className="text-[10px] text-gray-500">Reviews</div></div>
                  <div><div className="text-lg font-bold text-blue-600">{reputation.total_sessions}</div><div className="text-[10px] text-gray-500">Sessions</div></div>
                  <div><div className="text-lg font-bold text-purple-600">{reputation.response_rate}%</div><div className="text-[10px] text-gray-500">Response</div></div>
                </div>
              )}
            </div>
          )}
          <div className="mb-3"><h2 className="text-base font-bold text-gray-900">Posts ({posts.length})</h2></div>
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"><svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No posts yet</h3>
              <p className="text-xs text-gray-600">This user hasn&apos;t created any posts.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((post) => (
                <div key={post.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg hover:border-green-300 transition-all duration-200">
                  <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-blue-50">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                        {post.user.profile_image ? (<img src={post.user.profile_image} alt="" className="w-full h-full object-cover" />) : (<span>{post.user.first_name?.charAt(0)}{post.user.last_name?.charAt(0)}</span>)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{post.user.first_name} {post.user.last_name}</p>
                        <p className="text-gray-500 text-xs truncate">@{post.user.username}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {post.skills && post.skills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Can teach</p>
                        <div className="flex flex-wrap gap-1.5">{post.skills.slice(0, 3).map((skill, idx) => (<span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">{skill}</span>))}{post.skills.length > 3 && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">+{post.skills.length - 3}</span>}</div>
                      </div>
                    )}
                    {post.wanted_skills && post.wanted_skills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>Wants to learn</p>
                        <div className="flex flex-wrap gap-1.5">{post.wanted_skills.slice(0, 3).map((skill, idx) => (<span key={idx} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">{skill}</span>))}{post.wanted_skills.length > 3 && <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">+{post.wanted_skills.length - 3}</span>}</div>
                      </div>
                    )}
                  </div>
                  <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex gap-1.5">
                    <button onClick={() => router.push(`/post/${post.id}`)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all text-[10px] font-medium">View</button>
                    <button onClick={() => router.push(`/messages/${post.user.id}`)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-all text-[10px] font-medium">Chat</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {reviews.length > 0 && (
            <div className="mt-6 mb-3">
              <h2 className="text-base font-bold text-gray-900 mb-3">Reviews ({reviews.length})</h2>
              <div className="space-y-2">
                {reviews.slice(0, 5).map((r: any) => (
                  <div key={r.id} className="bg-white rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{r.reviewer.first_name} {r.reviewer.last_name}</span>
                      <span className="text-sm font-bold text-green-600">{r.average_rating}⭐</span>
                    </div>
                    {r.comment && <p className="text-xs text-gray-600 mt-1">{r.comment}</p>}
                    {r.skills_taught?.length > 0 && <div className="flex gap-1 mt-1">{r.skills_taught.map((s: string) => (<span key={s} className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded">{s}</span>))}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
