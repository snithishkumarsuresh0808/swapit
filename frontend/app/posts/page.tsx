import { redirect } from 'next/navigation';
import { requireAuth, serverFetch } from '@/lib/server-auth';
import PostsClient from '../components/PostsClient';

export default async function Posts() {
  const auth = await requireAuth();
  if (!auth) redirect('/signup');

  let posts: any[] = [];
  try {
    const res = await serverFetch('/api/posts/', auth.token);
    if (res.ok) posts = await res.json();
    else if (res.status === 401) redirect('/login');
  } catch {}

  return <PostsClient initialPosts={posts} />;
}
