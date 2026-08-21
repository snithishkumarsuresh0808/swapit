import { redirect } from 'next/navigation';
import { requireAuth, serverFetch } from '@/lib/server-auth';
import DiscoverClient from '../components/DiscoverClient';

export default async function DiscoverPage() {
  const auth = await requireAuth();
  if (!auth) redirect('/signup');

  let matches: any[] = [];
  try {
    const res = await serverFetch('/api/skills/discover/', auth.token);
    if (res.ok) {
      const data = await res.json();
      matches = data.all_matches || [];
    }
  } catch {}

  return <DiscoverClient initialMatches={matches} />;
}
