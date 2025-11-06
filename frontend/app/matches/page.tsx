'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import { getApiUrl } from '@/lib/config';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_image?: string | null;
}

interface Post {
  id: number;
  user: User;
  skills: string[];
  wanted_skills: string[];
  availability: string[];
  time_slots: string[];
  created_at: string;
  updated_at: string;
}

interface Match {
  user: User;
  post: Post;
  matchScore: number;
  matchedSkills: string[];
  canTeach: string[];
}

interface ConnectionStatus {
  status: string;
  is_sender?: boolean;
  connection?: {
    id: number;
    status: string;
  };
}

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<number, ConnectionStatus>>({});
  const router = useRouter();

  useEffect(() => {
    fetchMatches();
    // Mark matches as viewed when visiting this page
    localStorage.setItem('lastMatchesVisit', new Date().toISOString());
  }, []);

  const fetchMatches = async () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token) {
      router.push('/login');
      return;
    }

    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }

    try {
      // Fetch all posts
      const postsResponse = await fetch(getApiUrl('/api/posts/all/'), {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });

      if (postsResponse.ok) {
        const allPosts: Post[] = await postsResponse.json();

        // Fetch current user's posts to get their skills
        const userPostsResponse = await fetch(getApiUrl('/api/posts/'), {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (userPostsResponse.ok) {
          const userPosts: Post[] = await userPostsResponse.json();

          // Get current user's skills from their latest post
          const mySkills: string[] = [];
          const myWantedSkills: string[] = [];

          userPosts.forEach(post => {
            mySkills.push(...post.skills);
            myWantedSkills.push(...post.wanted_skills);
          });

          // Find matches
          const foundMatches = findMatches(allPosts, mySkills, myWantedSkills, userData ? JSON.parse(userData).id : 0);
          setMatches(foundMatches);

          // Fetch connection statuses for all matches
          fetchConnectionStatuses(foundMatches, token);
        }
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatuses = async (matches: Match[], token: string) => {
    const statuses: Record<number, ConnectionStatus> = {};

    for (const match of matches) {
      try {
        const response = await fetch(getApiUrl(`/api/messages/connections/status/${match.user.id}/`), {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          statuses[match.user.id] = data;
        }
      } catch (error) {
        console.error(`Error fetching connection status for user ${match.user.id}:`, error);
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

  const findMatches = (
    allPosts: Post[],
    mySkills: string[],
    myWantedSkills: string[],
    myUserId: number
  ): Match[] => {
    const matchesList: Match[] = [];
    const processedUsers = new Set<number>();

    // AI-powered matching algorithm
    allPosts.forEach(post => {
      // Skip own posts
      if (post.user.id === myUserId) return;

      // Skip if we already matched with this user (take their best post)
      if (processedUsers.has(post.user.id)) return;

      // AI Logic 1: Find exact skill matches (case-insensitive)
      const canTeachThem = post.wanted_skills.filter(skill =>
        mySkills.some(mySkill => mySkill.toLowerCase().trim() === skill.toLowerCase().trim())
      );

      const theyCanTeachMe = post.skills.filter(skill =>
        myWantedSkills.some(wantedSkill => wantedSkill.toLowerCase().trim() === skill.toLowerCase().trim())
      );

      // AI Logic 2: Find partial/fuzzy matches (contains keyword)
      const partialMatchesTheyTeach = post.skills.filter(skill =>
        myWantedSkills.some(wantedSkill => {
          const skillLower = skill.toLowerCase().trim();
          const wantedLower = wantedSkill.toLowerCase().trim();
          return skillLower.includes(wantedLower) || wantedLower.includes(skillLower);
        }) && !theyCanTeachMe.includes(skill)
      );

      const partialMatchesITeach = post.wanted_skills.filter(skill =>
        mySkills.some(mySkill => {
          const skillLower = skill.toLowerCase().trim();
          const mySkillLower = mySkill.toLowerCase().trim();
          return skillLower.includes(mySkillLower) || mySkillLower.includes(skillLower);
        }) && !canTeachThem.includes(skill)
      );

      // Combine all matches
      const allTeachMatches = [...theyCanTeachMe, ...partialMatchesTheyTeach];
      const allLearnMatches = [...canTeachThem, ...partialMatchesITeach];

      // AI Logic 3: Calculate intelligent match score
      // Exact matches worth more than partial matches
      const exactMatchScore = (canTeachThem.length * 2) + (theyCanTeachMe.length * 2);
      const partialMatchScore = partialMatchesTheyTeach.length + partialMatchesITeach.length;
      const totalMatchScore = exactMatchScore + partialMatchScore;

      // AI Logic 4: Boost score for mutual skill exchange (bidirectional match)
      let matchScore = totalMatchScore;
      if (canTeachThem.length > 0 && theyCanTeachMe.length > 0) {
        matchScore += 5; // Bonus for mutual exchange
      }

      // AI Logic 5: Consider availability alignment
      if (post.availability && post.availability.length > 0) {
        matchScore += 1; // Bonus for having availability set
      }

      // Only add if there's any match
      if (allTeachMatches.length > 0 || allLearnMatches.length > 0) {
        matchesList.push({
          user: post.user,
          post: post,
          matchScore: matchScore,
          matchedSkills: [...new Set([...allLearnMatches, ...allTeachMatches])],
          canTeach: allTeachMatches,
        });

        processedUsers.add(post.user.id);
      }
    });

    // AI Logic 6: Sort by match score (highest compatibility first)
    return matchesList.sort((a, b) => {
      // Primary sort: Match score
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      // Secondary sort: More matched skills
      return b.matchedSkills.length - a.matchedSkills.length;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="text-gray-900 text-sm">Finding your matches...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      <div className="pt-16 bg-gradient-to-b from-gray-50 to-white min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="mb-4">
            <h1 className="text-lg font-bold text-gray-900">Your Matches</h1>
            <p className="text-xs text-gray-600 mt-1">
              People who can teach what you want to learn, and want to learn what you can teach
            </p>
          </div>

          {matches.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">No matches found</h3>
              <p className="text-xs text-gray-600">Create a post with your skills to find matches!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matches.map((match, index) => (
                <div
                  key={`${match.user.id}-${index}`}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg hover:border-green-300 transition-all duration-200"
                >
                  {/* User Info */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                      {match.user.profile_image ? (
                        <img
                          src={getApiUrl(match.user.profile_image)}
                          alt={`${match.user.first_name} ${match.user.last_name}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{match.user.first_name.charAt(0)}{match.user.last_name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {match.user.first_name} {match.user.last_name}
                      </p>
                      <p className="text-gray-500 text-xs truncate">@{match.user.username}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 rounded-full">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs font-bold text-green-700">{match.matchScore}</span>
                    </div>
                  </div>

                  {/* Match Info */}
                  <div className="space-y-2 mb-3">
                    {match.canTeach.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Can teach you
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {match.canTeach.map((skill, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {match.post.skills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                          <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          All their skills
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {match.post.skills.map((skill, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {match.post.wanted_skills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                          <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Wants to learn
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {match.post.wanted_skills.map((skill, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-200">
                    <button
                      onClick={() => router.push(`/user/${match.user.id}`)}
                      className="flex-1 px-2 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-all text-xs font-semibold"
                    >
                      Profile
                    </button>
                    {(() => {
                      const status = connectionStatuses[match.user.id];

                      if (!status || status.status === 'none') {
                        return (
                          <button
                            onClick={() => handleConnect(match.user.id)}
                            className="flex-1 px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all text-xs font-semibold"
                          >
                            Connect
                          </button>
                        );
                      } else if (status.status === 'pending') {
                        return (
                          <button
                            disabled
                            className="flex-1 px-2 py-1.5 bg-gray-300 text-gray-600 rounded text-xs font-semibold cursor-not-allowed"
                          >
                            Pending
                          </button>
                        );
                      } else if (status.status === 'accepted') {
                        return (
                          <button
                            onClick={() => router.push(`/messages/${match.user.id}`)}
                            className="flex-1 px-2 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-all text-xs font-semibold"
                          >
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