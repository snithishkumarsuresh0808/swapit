'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './components/Sidebar';
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

interface ConnectionStatus {
  status: string;
  is_sender?: boolean;
  connection?: {
    id: number;
    status: string;
  };
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<number, ConnectionStatus>>({});
  const router = useRouter();

  useEffect(() => {
    checkAuthAndFetchPosts();
  }, []);

  const checkAuthAndFetchPosts = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/signup');
      return;
    }

    setIsLoggedIn(true);

    try {
      const response = await fetch(getApiUrl('/api/posts/all/'), {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data);

        // Fetch connection statuses for all post users
        fetchConnectionStatuses(data, token);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatuses = async (posts: Post[], token: string) => {
    const statuses: Record<number, ConnectionStatus> = {};

    for (const post of posts) {
      try {
        const response = await fetch(getApiUrl(`/api/messages/connections/status/${post.user.id}/`), {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          statuses[post.user.id] = data;
        }
      } catch (error) {
        console.error(`Error fetching connection status for user ${post.user.id}:`, error);
      }
    }

    setConnectionStatuses(statuses);
  };

  const handleConnect = async (userId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(getApiUrl('/api/messages/connections/send/'), {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to_user_id: userId }),
      });

      if (response.ok) {
        // Refresh connection status
        const statusResponse = await fetch(getApiUrl(`/api/messages/connections/status/${userId}/`), {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (statusResponse.ok) {
          const data = await statusResponse.json();
          setConnectionStatuses(prev => ({
            ...prev,
            [userId]: data
          }));
        }
      }
    } catch (error) {
      console.error('Error sending connection request:', error);
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
          <div className="text-gray-900 text-xl">Loading feed...</div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="pt-16 bg-gradient-to-b from-gray-50 to-white min-h-screen">
        {/* Feed */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No posts yet</h3>
              <p className="text-sm text-gray-600">Be the first to create a post and start swapping skills!</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto bg-white rounded-lg border border-gray-200">
              {posts.map((post, index) => (
                <div
                  key={post.id}
                  className={`px-4 py-4 ${index !== posts.length - 1 ? 'border-b border-gray-200' : ''} hover:bg-gray-50 transition-colors`}
                >
                  {/* Post Header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      onClick={() => router.push(`/user/${post.user.id}`)}
                      className="w-11 h-11 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-green-400 transition-all flex-shrink-0"
                    >
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
                      <div
                        onClick={() => router.push(`/user/${post.user.id}`)}
                        className="cursor-pointer hover:underline"
                      >
                        <p className="font-bold text-gray-900 text-sm">
                          {post.user.first_name} {post.user.last_name}
                        </p>
                      </div>
                      <p className="text-gray-500 text-xs">@{post.user.username}</p>
                    </div>
                    <button
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/post/${post.id}`;
                        if (navigator.share) {
                          navigator.share({
                            title: `${post.user.first_name} ${post.user.last_name}'s Post`,
                            text: `Check out this skill swap post from ${post.user.first_name}!`,
                            url: shareUrl,
                          });
                        } else {
                          navigator.clipboard.writeText(shareUrl);
                          alert('Link copied to clipboard!');
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-all"
                      title="Share post"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                  </div>

                  {/* Skills Section */}
                  <div className="space-y-2.5 mb-3 ml-14">
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
                  <div className="flex gap-2 mt-3 ml-14">
                    <button
                      onClick={() => router.push(`/post/${post.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-all text-xs font-semibold"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Details
                    </button>
                    {(() => {
                      const status = connectionStatuses[post.user.id];

                      if (!status || status.status === 'none') {
                        return (
                          <button
                            onClick={() => handleConnect(post.user.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-all text-xs font-semibold"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            Connect
                          </button>
                        );
                      } else if (status.status === 'pending') {
                        return (
                          <button
                            disabled
                            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 bg-gray-100 rounded-full text-xs font-semibold cursor-not-allowed"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pending
                          </button>
                        );
                      } else if (status.status === 'accepted') {
                        return (
                          <button
                            onClick={() => router.push(`/messages/${post.user.id}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-full transition-all text-xs font-semibold"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Message
                          </button>
                        );
                      }

                      return null;
                    })()}
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
