'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { getApiUrl } from '@/lib/config';

export default function Settings() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [ringtones, setRingtones] = useState<any[]>([]);
  const [uploadingRingtone, setUploadingRingtone] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchRingtones();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      if (parsedUser.profile_image) {
        setPreviewImage(getApiUrl(parsedUser.profile_image));
      }
    }
    setLoading(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(getApiUrl('/api/auth/change-password/'), {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          old_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        setMessage('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update password');
      }
    } catch (error) {
      setError('Error updating password');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!profileImage) {
      setError('Please select an image');
      return;
    }

    setMessage('');
    setError('');

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('profile_image', profileImage);

    try {
      const response = await fetch(getApiUrl('/api/auth/update-profile/'), {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('Profile picture updated successfully');
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        // Update preview image with the new profile image
        if (data.user.profile_image) {
          setPreviewImage(getApiUrl(data.user.profile_image));
        }
        // Reset the profile image file state
        setProfileImage(null);
      } else {
        setError('Failed to update profile picture');
      }
    } catch (error) {
      setError('Error uploading image');
    }
  };

  const fetchRingtones = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(getApiUrl('/api/ringtones/'), {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRingtones(data);
      }
    } catch (error) {
      console.error('Error fetching ringtones:', error);
    }
  };

  const handleRingtoneUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      setError('Please upload an audio file (MP3, WAV, etc.)');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setUploadingRingtone(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('audio_file', file);
    formData.append('name', file.name.replace(/\.[^/.]+$/, "")); // Remove extension

    try {
      const response = await fetch(getApiUrl('/api/ringtones/upload/'), {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setMessage('Ringtone uploaded successfully');
        setTimeout(() => setMessage(''), 3000);
        fetchRingtones(); // Refresh list
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to upload ringtone');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      setError('Error uploading ringtone');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUploadingRingtone(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const deleteRingtone = async (ringtoneId: number) => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(getApiUrl(`/api/ringtones/${ringtoneId}/`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        setMessage('Ringtone deleted successfully');
        setTimeout(() => setMessage(''), 3000);
        fetchRingtones(); // Refresh list
      } else {
        setError('Failed to delete ringtone');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      setError('Error deleting ringtone');
      setTimeout(() => setError(''), 3000);
    }
  };

  const activateRingtone = async (ringtoneId: number) => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(getApiUrl(`/api/ringtones/${ringtoneId}/activate/`), {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        setMessage('Ringtone activated successfully');
        setTimeout(() => setMessage(''), 3000);
        fetchRingtones(); // Refresh list
      } else {
        setError('Failed to activate ringtone');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      setError('Error activating ringtone');
      setTimeout(() => setError(''), 3000);
    }
  };

  const testRingtone = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.volume = 0.5;
    audio.play().catch(error => {
      console.error('Error playing test ringtone:', error);
      setError('Could not play ringtone');
      setTimeout(() => setError(''), 3000);
    });
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(getApiUrl('/api/auth/delete-account/'), {
        method: 'DELETE',
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } else {
        setError('Failed to delete account');
      }
    } catch (error) {
      setError('Error deleting account');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="text-gray-900 text-sm">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="pt-16">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Messages */}
          {message && (
            <div className="mb-3 p-2 bg-green-100 text-green-800 rounded text-xs">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-3 p-2 bg-red-100 text-red-800 rounded text-xs">
              {error}
            </div>
          )}

          {/* Profile Picture */}
          <div className="mb-3 border border-gray-300 rounded overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === 'profile' ? null : 'profile')}
              className="w-full px-3 py-2.5 bg-white hover:bg-gray-50 text-left flex items-center justify-between transition-colors"
            >
              <span className="text-sm font-bold text-gray-900">Profile Picture</span>
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform ${openSection === 'profile' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSection === 'profile' && (
              <div className="px-3 py-3 bg-white border-t border-gray-300">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-base font-bold overflow-hidden">
                    {previewImage ? (
                      <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user && `${user.first_name?.charAt(0) || ''}${user.last_name?.charAt(0) || ''}`
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={handleImageUpload}
                    disabled={!profileImage}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all text-xs font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Upload
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="mb-3 border border-gray-300 rounded overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === 'password' ? null : 'password')}
              className="w-full px-3 py-2.5 bg-white hover:bg-gray-50 text-left flex items-center justify-between transition-colors"
            >
              <span className="text-sm font-bold text-gray-900">Change Password</span>
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform ${openSection === 'password' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSection === 'password' && (
              <div className="px-3 py-3 bg-white border-t border-gray-300">
                <form onSubmit={handlePasswordUpdate} className="space-y-2.5">
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-all text-xs font-semibold"
                  >
                    Update Password
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Ringtone Settings */}
          <div className="mb-3 border border-gray-300 rounded overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === 'ringtone' ? null : 'ringtone')}
              className="w-full px-3 py-2.5 bg-white hover:bg-gray-50 text-left flex items-center justify-between transition-colors"
            >
              <span className="text-sm font-bold text-gray-900">Call Ringtones</span>
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform ${openSection === 'ringtone' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSection === 'ringtone' && (
              <div className="px-3 py-3 bg-white border-t border-gray-300 space-y-3">
                {/* Upload Section */}
                <div className="border border-gray-200 rounded p-2">
                  <label className="block">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleRingtoneUpload}
                      disabled={uploadingRingtone}
                      className="hidden"
                      id="ringtone-upload"
                    />
                    <div className={`px-3 py-2 ${uploadingRingtone ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white rounded transition-all text-xs font-semibold text-center cursor-pointer flex items-center justify-center gap-1.5`}>
                      {uploadingRingtone ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          Upload New Ringtone
                        </>
                      )}
                    </div>
                  </label>
                  <p className="text-[10px] text-gray-500 mt-1 text-center">
                    Max 5MB • MP3, WAV, OGG
                  </p>
                </div>

                {/* Ringtones List */}
                {ringtones.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-500">No ringtones uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700">Your Ringtones:</p>
                    {ringtones.map((ringtone) => (
                      <div
                        key={ringtone.id}
                        className={`border rounded p-2 ${ringtone.is_active ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {ringtone.is_active && (
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                            )}
                            <span className="text-xs text-gray-900 font-medium truncate">{ringtone.name}</span>
                            {ringtone.is_active && (
                              <span className="text-[10px] text-green-600 font-semibold flex-shrink-0">ACTIVE</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Test Button */}
                            <button
                              onClick={() => testRingtone(ringtone.audio_url)}
                              className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-all"
                              title="Test"
                            >
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </button>

                            {/* Activate Button */}
                            {!ringtone.is_active && (
                              <button
                                onClick={() => activateRingtone(ringtone.id)}
                                className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-all"
                                title="Set as Active"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              onClick={() => deleteRingtone(ringtone.id)}
                              className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-all"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                          Uploaded: {new Date(ringtone.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Account */}
          <div className="mb-3 border border-gray-300 rounded overflow-hidden">
            <button
              onClick={() => setOpenSection(openSection === 'account' ? null : 'account')}
              className="w-full px-3 py-2.5 bg-white hover:bg-gray-50 text-left flex items-center justify-between transition-colors"
            >
              <span className="text-sm font-bold text-gray-900">Account</span>
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform ${openSection === 'account' ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openSection === 'account' && (
              <div className="px-3 py-3 bg-white border-t border-gray-300 space-y-2">
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>

                <div className="pt-2 border-t border-gray-200">
                  <button
                    onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                    className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Account
                  </button>

                  {showDeleteConfirm && (
                    <div className="mt-3 p-3 bg-red-50 rounded">
                      <p className="text-xs text-red-800 mb-2">
                        <strong>Warning:</strong> This action cannot be undone. Type <strong>DELETE</strong> to confirm.
                      </p>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="Type DELETE"
                        className="w-full px-3 py-2 text-xs border border-red-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500 mb-2"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deleteConfirmText !== 'DELETE'}
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-all text-xs font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmText('');
                          }}
                          className="flex-1 px-3 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-all text-xs font-semibold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
