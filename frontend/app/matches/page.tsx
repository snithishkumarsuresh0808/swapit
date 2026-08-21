import { redirect } from 'next/navigation';
import { requireAuth, serverFetch } from '@/lib/server-auth';
import MatchesClient from '../components/MatchesClient';

type Post = {
  id: number;
  user: number;
  username: string;
  first_name: string;
  last_name: string;
  profile_image?: string | null;
  skill_offered: string;
  skill_wanted: string;
  offered_level?: string;
  wanted_level?: string;
  availability?: string;
  available_now?: boolean;
  available_weekends?: boolean;
  created_at: string;
};

function findMatches(userPosts: Post[], allPosts: Post[]): Post[] {
  if (!userPosts.length || !allPosts.length) return [];
  const myWanted = userPosts.map((p) => p.skill_wanted.toLowerCase());
  const myOffered = userPosts.map((p) => p.skill_offered.toLowerCase());
  return allPosts.filter((p) => {
    const isOwn = userPosts.some((up) => up.id === p.id);
    if (isOwn) return false;
    const iOfferWhatTheyWant = myOffered.some(
      (s) => p.skill_wanted.toLowerCase().includes(s) || s.includes(p.skill_wanted.toLowerCase())
    );
    const theyOfferWhatIWant = myWanted.some(
      (s) => p.skill_offered.toLowerCase().includes(s) || s.includes(p.skill_offered.toLowerCase())
    );
    return iOfferWhatTheyWant && theyOfferWhatIWant;
  });
}

export default async function MatchesPage() {
  const auth = await requireAuth();
  if (!auth) redirect('/signup');

  let allPosts: Post[] = [];
  let userPosts: Post[] = [];
  let smartMatches: any[] = [];

  try {
    const res = await serverFetch('/api/posts/all/', auth.token);
    if (res.ok) allPosts = await res.json();
  } catch {}

  try {
    const res = await serverFetch('/api/posts/', auth.token);
    if (res.ok) userPosts = await res.json();
  } catch {}

  try {
    const res = await serverFetch('/api/skills/discover/', auth.token);
    if (res.ok) smartMatches = await res.json();
  } catch {}

  const basicMatches = findMatches(userPosts, allPosts);

  const allUserIds = [
    ...basicMatches.map((m) => m.user),
    ...smartMatches.map((m: any) => m.matched_user_id),
  ];
  const uniqueUserIds = [...new Set(allUserIds)];

  let statuses: any[] = [];
  if (uniqueUserIds.length > 0) {
    try {
      const res = await serverFetch('/api/messages/connections/statuses/', auth.token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: uniqueUserIds }),
      });
      if (res.ok) statuses = await res.json();
    } catch {}
  }

  return (
    <MatchesClient
      initialBasicMatches={basicMatches}
      initialSmartMatches={smartMatches}
      initialStatuses={statuses}
      initialCurrentUserId={auth.user?.id ?? null}
    />
  );
}
