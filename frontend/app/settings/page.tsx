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
  const [selectedRingtone, setSelectedRingtone] = useState('default');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [customRingtone, setCustomRingtone] = useState<File | null>(null);
  const [customRingtoneUrl, setCustomRingtoneUrl] = useState<string | null>(null);
  const router = useRouter();

  const ringtones = [
    { id: 'default', name: 'Default Ring', file: '/sounds/ringtone.mp3' },
    { id: 'classic', name: 'Classic Phone', file: '/sounds/classic.mp3' },
    { id: 'digital', name: 'Digital Beep', file: '/sounds/digital.mp3' },
    { id: 'melodic', name: 'Melodic Tone', file: '/sounds/melodic.mp3' },
    { id: 'custom', name: 'Custom Ringtone', file: 'custom' },
  ];

  useEffect(() => {
    checkAuth();
    // Load saved ringtone preference
    const savedRingtone = localStorage.getItem('selectedRingtone') || 'default';
    setSelectedRingtone(savedRingtone);

    // Load custom ringtone URL if exists
    const customUrl = localStorage.getItem('customRingtoneUrl');
    if (customUrl) {
      setCustomRingtoneUrl(customUrl);
    }
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
      } else {
        setError('Failed to update profile picture');
      }
    } catch (error) {
      setError('Error uploading image');
    }
  };

  const handleRingtoneChange = (ringtoneId: string) => {
    setSelectedRingtone(ringtoneId);
    const ringtone = ringtones.find(r => r.id === ringtoneId);
    if (ringtone) {
      localStorage.setItem('selectedRingtone', ringtoneId);

      if (ringtoneId === 'custom' && customRingtoneUrl) {
        localStorage.setItem('ringtone', customRingtoneUrl);
      } else {
        localStorage.setItem('ringtone', ringtone.file);
      }

      setMessage('Ringtone updated successfully');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleCustomRingtoneUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

      setCustomRingtone(file);

      // Create blob URL for the audio file
      const url = URL.createObjectURL(file);
      setCustomRingtoneUrl(url);
      localStorage.setItem('customRingtoneUrl', url);

      // Automatically select custom ringtone
      setSelectedRingtone('custom');
      localStorage.setItem('selectedRingtone', 'custom');
      localStorage.setItem('ringtone', url);

      setMessage('Custom ringtone uploaded successfully');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const deleteCustomRingtone = () => {
    if (customRingtoneUrl) {
      URL.revokeObjectURL(customRingtoneUrl);
    }

    setCustomRingtone(null);
    setCustomRingtoneUrl(null);
    localStorage.removeItem('customRingtoneUrl');

    // Switch back to default ringtone
    if (selectedRingtone === 'custom') {
      setSelectedRingtone('default');
      localStorage.setItem('selectedRingtone', 'default');
      localStorage.setItem('ringtone', '/sounds/ringtone.mp3');
    }

    setMessage('Custom ringtone deleted');
    setTimeout(() => setMessage(''), 3000);
  };

  const testRingtone = () => {
    let audioUrl = '/sounds/ringtone.mp3';

    if (selectedRingtone === 'custom' && customRingtoneUrl) {
      audioUrl = customRingtoneUrl;
    } else {
      const ringtone = ringtones.find(r => r.id === selectedRingtone);
      if (ringtone && ringtone.file !== 'custom') {
        audioUrl = ringtone.file;
      }
    }

    const audio = new Audio(audioUrl);
    audio.volume = 0.5;
    audio.play().catch(error => {
      console.error('Error playing test ringtone:', error);
      setError('Could not play ringtone. File may not exist.');
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
              <span className="text-sm font-bold text-gray-900">Call Ringtone</span>
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
              <div className="px-3 py-3 bg-white border-t border-gray-300 space-y-2">
                {ringtones.map((ringtone) => (
                  <div key={ringtone.id}>
                    {ringtone.id === 'custom' ? (
                      <div className="border border-gray-200 rounded p-2 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="ringtone"
                            value={ringtone.id}
                            checked={selectedRingtone === ringtone.id}
                            onChange={() => handleRingtoneChange(ringtone.id)}
                            disabled={!customRingtoneUrl}
                            className="w-4 h-4 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-xs text-gray-900 font-medium">{ringtone.name}</span>
                          {customRingtoneUrl && (
                            <span className="text-[10px] text-green-600">(Uploaded)</span>
                          )}
                        </label>

                        <div className="flex gap-2 mt-2">
                          <label className="flex-1">
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={handleCustomRingtoneUpload}
                              className="hidden"
                              id="custom-ringtone-upload"
                            />
                            <div className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-all text-xs font-semibold text-center cursor-pointer flex items-center justify-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              Upload
                            </div>
                          </label>

                          {customRingtoneUrl && (
                            <button
                              onClick={deleteCustomRingtone}
                              className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          )}
                        </div>

                        {customRingtone && (
                          <p className="text-[10px] text-gray-500 mt-1">
                            File: {customRingtone.name} ({(customRingtone.size / 1024).toFixed(2)} KB)
                          </p>
                        )}
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="ringtone"
                          value={ringtone.id}
                          checked={selectedRingtone === ringtone.id}
                          onChange={() => handleRingtoneChange(ringtone.id)}
                          className="w-4 h-4 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-xs text-gray-900">{ringtone.name}</span>
                      </label>
                    )}
                  </div>
                ))}
                <button
                  onClick={testRingtone}
                  className="w-full mt-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                  Test Ringtone
                </button>
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
