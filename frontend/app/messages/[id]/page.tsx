import { redirect, notFound } from 'next/navigation';
import { requireAuth, serverFetch } from '@/lib/server-auth';
import ConversationClient from '../../components/ConversationClient';

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const auth = await requireAuth();
  if (!auth) redirect('/signup');

  const otherUserId = parseInt(params.id);
  if (isNaN(otherUserId)) notFound();

  let messages: any[] = [];
  let otherUser: any = null;

  try {
    const res = await serverFetch(`/api/messages/${otherUserId}/`, auth.token);
    if (res.ok) messages = await res.json();
  } catch {}

  try {
    const res = await serverFetch(`/api/auth/user/${otherUserId}/`, auth.token);
    if (res.ok) otherUser = await res.json();
  } catch {}

  if (!otherUser) notFound();

  return (
    <ConversationClient
      initialMessages={messages}
      initialOtherUser={otherUser}
      otherUserId={otherUserId}
    />
  );
}
