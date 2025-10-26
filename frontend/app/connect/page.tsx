'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_image?: string | null;
}

interface ConnectionStatus {
  status: string;
  is_sender?: boolean;
  connection?: {
    id: number;
    status: string;
  };
}

interface ConnectionRequest {
  id: number;
  from_user: User;
  to_user: User;
  status: string;
  created_at: string;
}

export default function Connect() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<number, ConnectionStatus>>({});
  const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchPendingRequests();
    fetchConnectedUsers();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setCurrentUserId(JSON.parse(userData).id);
    }

    try {
      const response = await fetch('http://localhost:8000/api/posts/all/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const posts = await response.json();
        // Extract unique users from posts
        const uniqueUsers = new Map<number, User>();
        posts.forEach((post: any) => {
          if (post.user.id !== JSON.parse(userData || '{}').id) {
            uniqueUsers.set(post.user.id, post.user);
          }
        });
        const usersList = Array.from(uniqueUsers.values());
        setUsers(usersList);

        // Fetch connection statuses
        fetchConnectionStatuses(usersList, token);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatuses = async (users: User[], token: string) => {
    const statuses: Record<number, ConnectionStatus> = {};

    for (const user of users) {
      try {
        const response = await fetch(`http://localhost:8000/api/messages/connection-status/${user.id}/`, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          statuses[user.id] = data;
        }
      } catch (error) {
        console.error(`Error fetching connection status for user ${user.id}:`, error);
      }
    }

    setConnectionStatuses(statuses);
  };

  const handleConnect = async (userId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:8000/api/messages/connections/send/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to_user_id: userId }),
      });

      if (response.ok) {
        // Refresh connection status
        const statusResponse = await fetch(`http://localhost:8000/api/messages/connections/status/${userId}/`, {
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

  const fetchPendingRequests = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:8000/api/messages/connections/pending/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingRequests(data);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const fetchConnectedUsers = async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:8000/api/posts/all/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const posts = await response.json();
        const uniqueUsers = new Map<number, User>();

        posts.forEach((post: any) => {
          if (post.user.id !== JSON.parse(userData || '{}').id) {
            uniqueUsers.set(post.user.id, post.user);
          }
        });

        const allUsers = Array.from(uniqueUsers.values());

        // Fetch connection statuses to filter connected users
        const connected: User[] = [];

        for (const user of allUsers) {
          try {
            const statusResponse = await fetch(`http://localhost:8000/api/messages/connections/status/${user.id}/`, {
              headers: {
                'Authorization': `Token ${token}`,
              },
            });

            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              if (statusData.status === 'accepted') {
                connected.push(user);
              }
            }
          } catch (error) {
            console.error(`Error fetching connection status for user ${user.id}:`, error);
          }
        }

        setConnectedUsers(connected);
      }
    } catch (error) {
      console.error('Error fetching connected users:', error);
    }
  };

  const handleAcceptRequest = async (connectionId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8000/api/messages/connections/${connectionId}/respond/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'accept' }),
      });

      if (response.ok) {
        // Refresh data
        fetchPendingRequests();
        fetchConnectedUsers();
      }
    } catch (error) {
      console.error('Error accepting connection request:', error);
    }
  };

  const handleRejectRequest = async (connectionId: number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8000/api/messages/connections/${connectionId}/respond/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (response.ok) {
        // Refresh pending requests
        fetchPendingRequests();
      }
    } catch (error) {
      console.error('Error rejecting connection request:', error);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="pt-16">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Pending Requests Section */}
          {pendingRequests.length > 0 && (
            <div className="mb-8">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-gray-900">Connection Requests</h2>
                <p className="text-xs text-gray-600 mt-1">
                  People who want to connect with you
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="bg-white rounded-lg border border-orange-200 p-4 hover:shadow-lg hover:border-orange-300 transition-all duration-200"
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 mb-3">
                      {request.from_user.profile_image ? (
                        <img
                          src={`http://localhost:8000${request.from_user.profile_image}`}
                          alt={`${request.from_user.first_name} ${request.from_user.last_name}`}
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center text-base font-bold">
                          {getInitials(request.from_user.first_name, request.from_user.last_name)}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {request.from_user.first_name} {request.from_user.last_name}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">@{request.from_user.username}</p>
                        <p className="text-[10px] text-orange-600 font-semibold mt-0.5">Wants to connect</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all text-xs font-semibold"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all text-xs font-semibold"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected Users Section */}
          <div className="mb-4">
            <h1 className="text-lg font-bold text-gray-900">Connected Users</h1>
            <p className="text-xs text-gray-600 mt-1">
              People you are connected with
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : connectedUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No connections yet</h3>
              <p className="text-xs text-gray-600">Start connecting with people from Home, Matches, or Posts!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg hover:border-green-300 transition-all duration-200"
                >
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-3">
                    {user.profile_image ? (
                      <img
                        src={`http://localhost:8000${user.profile_image}`}
                        alt={`${user.first_name} ${user.last_name}`}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-blue-500 text-white flex items-center justify-center text-base font-bold">
                        {getInitials(user.first_name, user.last_name)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {user.first_name} {user.last_name}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                      <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/user/${user.id}`)}
                      className="flex-1 px-3 py-1.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all text-xs font-semibold"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => router.push(`/messages/${user.id}`)}
                      className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all text-xs font-semibold"
                    >
                      Message
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
