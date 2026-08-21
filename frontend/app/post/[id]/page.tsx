import { notFound, redirect } from 'next/navigation';
import { requireAuth, serverFetch } from '@/lib/server-auth';
import PostDetailClient from '../../components/PostDetailClient';

export default async function PostDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireAuth();
  if (!auth) redirect('/signup');

  let post = null;
  try {
    const res = await serverFetch('/api/posts/all/', auth.token);
    if (res.ok) {
      const posts = await res.json();
      post = posts.find((p: any) => p.id === Number(id)) || null;
    } else if (res.status === 401) {
      redirect('/login');
    }
  } catch {}

  return <PostDetailClient post={post} />;
}
