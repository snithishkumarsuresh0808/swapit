'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import { getApiUrl } from '@/lib/config';

interface Post {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_image?: string | null;
  };
  skills: string[];
  wanted_skills: string[];
  availability: string[];
  time_slots: string[];
  created_at: string;
  updated_at: string;
}

export default function UserProfile() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const router = useRouter();
  const params = useParams();
  const userId = params.id;

  useEffect(() => {
    fetchUserPosts();
  }, [userId]);

  const fetchUserPosts = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await fetch(getApiUrl('/api/posts/all/'), {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const allPosts = await response.json();
        const userPosts = allPosts.filter((p: Post) => p.user.id === Number(userId));
        setPosts(userPosts);

        if (userPosts.length > 0) {
          setUserInfo(userPosts[0].user);
        }
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } catch (error) {
      console.error('Error loading user posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="text-gray-900 text-sm">Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="pt-16 bg-gradient-to-b from-gray-50 to-white min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-3 flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* User Info Header */}
          {userInfo && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                    {userInfo.profile_image ? (
                      <img
                        src={getApiUrl(userInfo.profile_image)}
                        alt={`${userInfo.first_name} ${userInfo.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{userInfo.first_name.charAt(0)}{userInfo.last_name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">
                      {userInfo.first_name} {userInfo.last_name}
                    </h1>
                    <p className="text-xs text-gray-600">@{userInfo.username}</p>
                    <p className="text-xs text-gray-500">{userInfo.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/messages/${userInfo.id}`)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all text-xs font-semibold flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Message
                </button>
              </div>
            </div>
          )}

          {/* Posts Section */}
          <div className="mb-3">
            <h2 className="text-base font-bold text-gray-900">
              Posts ({posts.length})
            </h2>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No posts yet</h3>
              <p className="text-xs text-gray-600">This user hasn't created any posts.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg hover:border-green-300 transition-all duration-200"
                >
                  {/* Post Header */}
                  <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-green-50 to-blue-50">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                        {post.user.profile_image ? (
                          <img
                            src={getApiUrl(post.user.profile_image)}
                            alt={`${post.user.first_name} ${post.user.last_name}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{post.user.first_name.charAt(0)}{post.user.last_name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {post.user.first_name} {post.user.last_name}
                        </p>
                        <p className="text-gray-500 text-xs truncate">@{post.user.username}</p>
                      </div>
                    </div>
                  </div>

                  {/* Skills Section */}
                  <div className="p-4 space-y-3">
                    {/* Skills to Offer */}
                    {post.skills && post.skills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Can teach
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {post.skills.slice(0, 3).map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                              {skill}
                            </span>
                          ))}
                          {post.skills.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                              +{post.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Wants to Learn */}
                    {post.wanted_skills && post.wanted_skills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Wants to learn
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {post.wanted_skills.slice(0, 3).map((skill, idx) => (
                            <span key={idx} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                              {skill}
                            </span>
                          ))}
                          {post.wanted_skills.length > 3 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                              +{post.wanted_skills.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Availability */}
                    {(post.availability?.length > 0 || post.time_slots?.length > 0) && (
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex gap-2 text-xs text-gray-500">
                          {post.availability && post.availability.length > 0 && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {post.availability.length} days
                            </span>
                          )}
                          {post.time_slots && post.time_slots.length > 0 && (
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {post.time_slots.length} slots
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Post Actions */}
                  <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex gap-1.5">
                    <button
                      onClick={() => router.push(`/post/${post.id}`)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all text-[10px] font-medium"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-all text-[10px] font-medium">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Chat
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
