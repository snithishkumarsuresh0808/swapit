import { redirect } from 'next/navigation';
import { requireAuth, serverFetch } from '@/lib/server-auth';
import ConnectClient from '../components/ConnectClient';

export default async function Connect() {
  const auth = await requireAuth();
  if (!auth) redirect('/signup');

  let pendingRequests: any[] = [];
  let connectedUsers: any[] = [];
  try {
    const [pendRes, connRes] = await Promise.all([
      serverFetch('/api/messages/connections/pending/', auth.token),
      serverFetch('/api/messages/connections/connected/', auth.token),
    ]);
    if (pendRes.ok) pendingRequests = await pendRes.json();
    if (connRes.ok) connectedUsers = await connRes.json();
  } catch {}

  return <ConnectClient initialPendingRequests={pendingRequests} initialConnectedUsers={connectedUsers} />;
}
