import { redirect } from 'next/navigation';
import { requireAuth, serverFetch } from '@/lib/server-auth';
import GamificationClient from '../components/GamificationClient';

export default async function GamificationPage() {
  const auth = await requireAuth();
  if (!auth) redirect('/signup');

  let dashboard: any = null;
  let badges: any[] = [];
  let leaderboard: any[] = [];
  let skillProgress: any[] = [];

  try {
    const res = await serverFetch('/api/gamification/', auth.token);
    if (res.ok) dashboard = await res.json();
  } catch {}

  try {
    const res = await serverFetch('/api/gamification/badges/', auth.token);
    if (res.ok) badges = await res.json();
  } catch {}

  try {
    const res = await serverFetch('/api/gamification/leaderboard/', auth.token);
    if (res.ok) leaderboard = await res.json();
  } catch {}

  try {
    const res = await serverFetch('/api/gamification/skill-progress/', auth.token);
    if (res.ok) skillProgress = await res.json();
  } catch {}

  return (
    <GamificationClient
      initialDashboard={dashboard}
      initialBadges={badges}
      initialLeaderboard={leaderboard}
      initialSkillProgress={skillProgress}
      currentUserId={auth.user?.id ?? null}
    />
  );
}
