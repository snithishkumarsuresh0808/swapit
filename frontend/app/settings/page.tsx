'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';

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
  const router = useRouter();

  useEffect(() => {
    checkAuth();
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
        setPreviewImage(`http://localhost:8000${parsedUser.profile_image}`);
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
      const response = await fetch('http://localhost:8000/api/auth/change-password/', {
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
      const response = await fetch('http://localhost:8000/api/auth/update-profile/', {
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
              <div className="px-3 py-3 bg-white border-t border-gray-300">
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-all text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
