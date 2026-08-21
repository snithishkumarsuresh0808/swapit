import { redirect } from 'next/navigation';
import { requireAuth, serverFetch } from '@/lib/server-auth';
import CallsClient from '../components/CallsClient';

export default async function CallsPage() {
  const auth = await requireAuth();
  if (!auth) redirect('/signup');

  let calls: any[] = [];
  try {
    const res = await serverFetch('/api/messages/call-history/', auth.token);
    if (res.ok) calls = await res.json();
  } catch {}

  return <CallsClient initialCalls={calls} initialCurrentUserId={auth.user?.id ?? null} />;
}
