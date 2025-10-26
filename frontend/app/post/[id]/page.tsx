'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '../../components/Sidebar';

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
  images: Array<{
    id: number;
    image: string;
    uploaded_at: string;
  }>;
  videos: Array<{
    id: number;
    video: string;
    uploaded_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

export default function PostDetail() {
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const postId = params.id;

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      // Fetch from all posts endpoint to view any user's post
      const response = await fetch('http://localhost:8000/api/posts/all/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const posts = await response.json();
        const foundPost = posts.find((p: Post) => p.id === Number(postId));
        if (foundPost) {
          setPost(foundPost);
        } else {
          router.push('/');
        }
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } catch (error) {
      console.error('Error loading post:', error);
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
          <div className="text-gray-900 text-xl">Loading post...</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="text-gray-900 text-xl">Post not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-4 py-4">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="mb-3 flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Feed
          </button>

          {/* Post Detail Card */}
          <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <div
                  onClick={() => router.push(`/user/${post.user.id}`)}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold overflow-hidden cursor-pointer hover:ring-2 hover:ring-green-400 transition-all"
                >
                  {post.user.profile_image ? (
                    <img
                      src={`http://localhost:8000${post.user.profile_image}`}
                      alt={`${post.user.first_name} ${post.user.last_name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{post.user.first_name.charAt(0)}{post.user.last_name.charAt(0)}</span>
                  )}
                </div>
                <div
                  onClick={() => router.push(`/user/${post.user.id}`)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <h1 className="text-base font-bold text-gray-900">
                    {post.user.first_name} {post.user.last_name}
                  </h1>
                  <p className="text-xs text-gray-600">{post.user.email}</p>
                  <p className="text-[10px] text-gray-500">Posted on {formatDate(post.created_at)}</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-3 space-y-4">
              {/* Skills Section */}
              {post.skills && post.skills.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Skills I Can Teach
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {post.skills.map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Wanted Skills Section */}
              {post.wanted_skills && post.wanted_skills.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Skills I Want to Learn
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {post.wanted_skills.map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Availability Section */}
              {post.availability && post.availability.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Available Days
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {post.availability.map((day, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold capitalize">
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Slots Section */}
              {post.time_slots && post.time_slots.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Available Time Slots
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {post.time_slots.map((slot, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold capitalize">
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Images Section */}
              {post.images && post.images.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Images
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {post.images.map((imageObj) => (
                      <img
                        key={imageObj.id}
                        src={`http://localhost:8000${imageObj.image}`}
                        alt={`Post image ${imageObj.id}`}
                        className="w-full h-32 object-cover rounded border border-gray-200"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Videos Section */}
              {post.videos && post.videos.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Videos
                  </h2>
                  <div className="space-y-2">
                    {post.videos.map((videoObj) => (
                      <video
                        key={videoObj.id}
                        controls
                        src={`http://localhost:8000${videoObj.video}`}
                        className="w-full rounded border border-gray-200"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex gap-2">
              <button className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-all text-xs font-semibold flex items-center justify-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Message
              </button>
              <button className="px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-all text-xs font-semibold flex items-center justify-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
