'use client';

import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import CreatePostModal from '../components/CreatePostModal';
import { getApiUrl } from '@/lib/config';

interface Post {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
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

export default function Posts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  useEffect(() => {
    // Load all posts from current user
    const loadPosts = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(getApiUrl('/api/posts/'), {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPosts(data);
        } else if (response.status === 404) {
          setPosts([]);
        }
      } catch (error) {
        console.error('Error loading posts:', error);
      }
    };

    loadPosts();
  }, []);

  const handleDeletePost = async (id: number) => {
    if (confirm('Are you sure you want to delete this post?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(getApiUrl(`/api/posts/${id}/`), {
          method: 'DELETE',
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (response.ok || response.status === 204) {
          const updatedPosts = posts.filter(post => post.id !== id);
          setPosts(updatedPosts);
        }
      } catch (error) {
        console.error('Error deleting post:', error);
      }
    }
  };

  const handleCreatePost = async (post: {
    skills: string[];
    wantedSkills: string[];
    availability: { [key: string]: boolean };
    timeSlots: { [key: string]: boolean };
    images?: File[];
    videos?: File[];
  }) => {
    try {
      const token = localStorage.getItem('token');

      // Convert availability and timeSlots objects to arrays
      const selectedDays = Object.entries(post.availability)
        .filter(([_, isSelected]) => isSelected)
        .map(([day]) => day);

      const selectedTimeSlots = Object.entries(post.timeSlots)
        .filter(([_, isSelected]) => isSelected)
        .map(([slot]) => slot);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('skills', JSON.stringify(post.skills));
      formData.append('wanted_skills', JSON.stringify(post.wantedSkills));
      formData.append('availability', JSON.stringify(selectedDays));
      formData.append('time_slots', JSON.stringify(selectedTimeSlots));

      // Append images
      if (post.images) {
        post.images.forEach((image) => {
          formData.append('images', image);
        });
      }

      // Append videos
      if (post.videos) {
        post.videos.forEach((video) => {
          formData.append('videos', video);
        });
      }

      const response = await fetch(getApiUrl('/api/posts/'), {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const newPost = await response.json();
        setPosts([...posts, newPost]);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Make sure the backend is running.');
    }
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setIsModalOpen(true);
  };

  const handleUpdatePost = async (postData: {
    skills: string[];
    wantedSkills: string[];
    availability: { [key: string]: boolean };
    timeSlots: { [key: string]: boolean };
    images?: File[];
    videos?: File[];
  }) => {
    if (!editingPost) return;

    try {
      const token = localStorage.getItem('token');

      // Convert availability and timeSlots objects to arrays
      const selectedDays = Object.entries(postData.availability)
        .filter(([_, isSelected]) => isSelected)
        .map(([day]) => day);

      const selectedTimeSlots = Object.entries(postData.timeSlots)
        .filter(([_, isSelected]) => isSelected)
        .map(([slot]) => slot);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('skills', JSON.stringify(postData.skills));
      formData.append('wanted_skills', JSON.stringify(postData.wantedSkills));
      formData.append('availability', JSON.stringify(selectedDays));
      formData.append('time_slots', JSON.stringify(selectedTimeSlots));

      // Append new images
      if (postData.images) {
        postData.images.forEach((image) => {
          formData.append('images', image);
        });
      }

      // Append new videos
      if (postData.videos) {
        postData.videos.forEach((video) => {
          formData.append('videos', video);
        });
      }

      const response = await fetch(getApiUrl(`/api/posts/${editingPost.id}/`), {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(posts.map(p => p.id === updatedPost.id ? updatedPost : p));
        setEditingPost(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post. Make sure the backend is running.');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingPost(null);
  };

  const handleModalSubmit = async (postData: {
    skills: string[];
    wantedSkills: string[];
    availability: { [key: string]: boolean };
    timeSlots: { [key: string]: boolean };
    images?: File[];
    videos?: File[];
  }) => {
    if (editingPost) {
      await handleUpdatePost(postData);
    } else {
      await handleCreatePost(postData);
    }
    handleModalClose();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="pt-16">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Posts</h1>
              <p className="text-gray-600">View and manage all your posts</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Post
            </button>
          </div>

          {/* Posts Grid */}
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
              <p className="text-gray-600 mb-6">Create your first post to start swapping skills</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Post
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  {/* User Info */}
                  <div className="mb-4 pb-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">{post.user.first_name} {post.user.last_name}</p>
                    <p className="text-xs text-gray-500">{post.user.email}</p>
                  </div>

                  {/* Skills */}
                  {post.skills && post.skills.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Your Skills:</p>
                      <div className="flex flex-wrap gap-2">
                        {post.skills.filter(skill => skill).map((skill, idx) => (
                          <span key={idx} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Wanted Skills */}
                  {post.wanted_skills && post.wanted_skills.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Want to Learn:</p>
                      <div className="flex flex-wrap gap-2">
                        {post.wanted_skills.filter(skill => skill).map((skill, idx) => (
                          <span key={idx} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Availability */}
                  {post.availability && post.availability.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Availability:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {post.availability.filter(day => day).map((day, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium capitalize">
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Time Slots */}
                  {post.time_slots && post.time_slots.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Time Slots:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {post.time_slots.filter(slot => slot).map((slot, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium capitalize">
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Images */}
                  {post.images && post.images.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Images:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {post.images.map((img) => (
                          <img
                            key={img.id}
                            src={getApiUrl(img.image)}
                            alt="Post image"
                            className="w-full h-20 object-cover rounded border border-gray-200"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos */}
                  {post.videos && post.videos.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Videos:</p>
                      <div className="space-y-1.5">
                        {post.videos.map((vid) => (
                          <video
                            key={vid.id}
                            src={getApiUrl(vid.video)}
                            controls
                            className="w-full rounded border border-gray-200"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mb-4 pt-2">
                    Posted: {formatDate(post.created_at)}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button className="flex-1 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-all text-sm font-medium">
                      View
                    </button>
                    <button
                      onClick={() => handleEditPost(post)}
                      className="flex-1 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Post Modal */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleModalSubmit}
        initialData={editingPost || undefined}
        isEditing={!!editingPost}
      />
    </div>
  );
}
