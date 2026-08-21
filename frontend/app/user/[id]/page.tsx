import { notFound } from 'next/navigation';
import { requireAuth, serverFetch } from '@/lib/server-auth';
import UserProfileClient from '../../components/UserProfileClient';

export default async function UserProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth) notFound();

  let posts: any[] = [];
  let userInfo: any = null;
  let reputation: any = null;
  let reviews: any[] = [];

  try {
    const [postsRes, repRes, revRes] = await Promise.all([
      serverFetch('/api/posts/all/', auth.token),
      serverFetch(`/api/skills/reputation/${id}/`, auth.token),
      serverFetch(`/api/skills/reviews/user/${id}/`, auth.token),
    ]);

    if (postsRes.ok) {
      const allPosts = await postsRes.json();
      posts = allPosts.filter((p: any) => p.user.id === Number(id));
      if (posts.length > 0) userInfo = posts[0].user;
    }
    if (repRes.ok) reputation = await repRes.json();
    if (revRes.ok) reviews = await revRes.json();
  } catch {}

  return <UserProfileClient posts={posts} userInfo={userInfo} reputation={reputation} reviews={reviews} />;
}
