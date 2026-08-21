import { redirect } from 'next/navigation';
import { requireAuth, serverFetch } from '@/lib/server-auth';
import HomeFeedClient from './components/HomeFeedClient';

interface Post {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_image?: string | null;
  };
  skills: string[];
  wanted_skills: string[];
  availability: string[];
  time_slots: string[];
  images: Array<{ id: number; image: string; uploaded_at: string }>;
  videos: Array<{ id: number; video: string; uploaded_at: string }>;
  created_at: string;
  updated_at: string;
}

export default async function Home() {
  const auth = await requireAuth();

  if (!auth) {
    redirect('/signup');
  }

  let posts: Post[] = [];
  try {
    const res = await serverFetch('/api/posts/all/', auth.token);
    if (res.ok) {
      posts = await res.json();
    } else if (res.status === 401) {
      redirect('/login');
    }
  } catch {
    console.error('Error loading posts server-side');
  }

  return <HomeFeedClient initialPosts={posts} initialCurrentUser={auth.user} />;
}
