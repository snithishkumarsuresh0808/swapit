import { redirect } from 'next/navigation';
import { requireAuth, serverFetch } from '@/lib/server-auth';
import ReviewsClient from '../components/ReviewsClient';

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ session?: string; user?: string }> }) {
  const auth = await requireAuth();
  if (!auth) redirect('/signup');

  const { user: userParam } = await searchParams;

  let reviews: any[] = [];
  let reputation: any = null;
  try {
    const url = userParam ? `/api/skills/reviews/user/${userParam}/` : '/api/skills/reviews/';
    const [revRes, repRes] = await Promise.all([
      serverFetch(url, auth.token),
      userParam ? serverFetch(`/api/skills/reputation/${userParam}/`, auth.token) : Promise.resolve(null),
    ]);
    if (revRes.ok) reviews = await revRes.json();
    if (repRes && repRes.ok) reputation = await repRes.json();
  } catch {}

  return <ReviewsClient initialReviews={reviews} initialReputation={reputation} />;
}
