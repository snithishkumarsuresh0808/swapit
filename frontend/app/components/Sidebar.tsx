'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [matchCount, setMatchCount] = useState<number>(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(0);
  const [pendingConnectionCount, setPendingConnectionCount] = useState<number>(0);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchMatchCount();
    fetchUnreadMessages();
    fetchPendingConnections();

    // Auto-refresh notifications every 5 seconds
    const interval = setInterval(() => {
      fetchMatchCount();
      fetchUnreadMessages();
      fetchPendingConnections();
    }, 5000);

    return () => clearInterval(interval);
  }, [pathname]);

  const fetchMatchCount = async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) return;

    // Check if user has visited matches page before
    const lastVisit = localStorage.getItem('lastMatchesVisit');

    try {
      // Fetch all posts
      const postsResponse = await fetch('http://localhost:8000/api/posts/all/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (postsResponse.ok) {
        const allPosts = await postsResponse.json();

        // Fetch current user's posts
        const userPostsResponse = await fetch('http://localhost:8000/api/posts/', {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (userPostsResponse.ok) {
          const userPosts = await userPostsResponse.json();

          // Get my skills
          const mySkills: string[] = [];
          const myWantedSkills: string[] = [];

          userPosts.forEach((post: any) => {
            mySkills.push(...post.skills);
            myWantedSkills.push(...post.wanted_skills);
          });

          // Count matches created after last visit
          const currentUserId = JSON.parse(userData).id;
          const lastVisitDate = lastVisit ? new Date(lastVisit) : new Date(0);
          let count = 0;
          const processedUsers = new Set<number>();

          allPosts.forEach((post: any) => {
            if (post.user.id === currentUserId || processedUsers.has(post.user.id)) return;

            // Only count if post was created after last visit
            const postCreated = new Date(post.created_at);
            if (postCreated <= lastVisitDate) return;

            const theyCanTeachMe = post.skills.filter((skill: string) =>
              myWantedSkills.some(wantedSkill => wantedSkill.toLowerCase().trim() === skill.toLowerCase().trim())
            );

            const canTeachThem = post.wanted_skills.filter((skill: string) =>
              mySkills.some(mySkill => mySkill.toLowerCase().trim() === skill.toLowerCase().trim())
            );

            if (theyCanTeachMe.length > 0 || canTeachThem.length > 0) {
              count++;
              processedUsers.add(post.user.id);
            }
          });

          setMatchCount(count);
        }
      }
    } catch (error) {
      console.error('Error fetching match count:', error);
    }
  };

  const fetchUnreadMessages = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:8000/api/messages/conversations/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const conversations = await response.json();
        const totalUnread = conversations.reduce((sum: number, conv: any) => sum + conv.unread_count, 0);
        setUnreadMessageCount(totalUnread);
      }
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  };

  const fetchPendingConnections = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:8000/api/messages/connections/pending/', {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (response.ok) {
        const pendingRequests = await response.json();
        setPendingConnectionCount(pendingRequests.length);
      }
    } catch (error) {
      console.error('Error fetching pending connections:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const menuItems = [
    {
      name: 'Home',
      path: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: 'Connect',
      path: '/connect',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: 'Posts',
      path: '/posts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
    },
    {
      name: 'Find Matches',
      path: '/matches',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Messages',
      path: '/messages',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Image
              src="/logo.png"
              alt="SwapIt Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <h1 className="text-xl font-bold text-gray-900 hidden sm:block">SwapIt</h1>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1">
            {menuItems.map((item) => {
              // Highlight Home when on root path (/) or dashboard path (/dashboard)
              // Highlight Messages when on /messages or /messages/[id]
              const isActive = item.name === 'Home'
                ? (pathname === '/' || pathname === '/dashboard')
                : item.name === 'Messages'
                ? pathname?.startsWith('/messages')
                : pathname === item.path;

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`relative flex items-center space-x-2 px-2 sm:px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-green-50 text-green-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-green-700'
                  }`}
                  title={item.name}
                >
                  {item.icon}
                  <span className="text-sm hidden lg:inline">{item.name}</span>
                  {item.name === 'Connect' && pendingConnectionCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full animate-pulse">
                      {pendingConnectionCount > 99 ? '99+' : pendingConnectionCount}
                    </span>
                  )}
                  {item.name === 'Find Matches' && matchCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full animate-pulse">
                      {matchCount > 99 ? '99+' : matchCount}
                    </span>
                  )}
                  {item.name === 'Messages' && unreadMessageCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full animate-pulse">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* More Menu Button */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center space-x-2 px-2 sm:px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-green-700 transition-all duration-200"
              title="More"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-sm hidden lg:inline">More</span>
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <>
                {/* Backdrop to close menu when clicking outside */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                ></div>

                {/* Menu Items */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <Link
                    href="/calendar"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Calendar
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>

                  <div className="border-t border-gray-200 my-1"></div>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
