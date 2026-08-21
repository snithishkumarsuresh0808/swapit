import { redirect } from 'next/navigation';
import { requireAuth, serverFetch } from '@/lib/server-auth';
import MessagesClient from '../components/MessagesClient';

export default async function MessagesPage() {
  const auth = await requireAuth();
  if (!auth) redirect('/signup');

  let conversations: any[] = [];
  try {
    const res = await serverFetch('/api/messages/conversations/', auth.token);
    if (res.ok) conversations = await res.json();
  } catch {}

  return <MessagesClient initialConversations={conversations} initialCurrentUserId={auth.user?.id ?? null} />;
}
