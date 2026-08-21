import { redirect } from 'next/navigation';
import { requireAuth, serverFetch } from '@/lib/server-auth';
import SessionsClient from '../components/SessionsClient';

export default async function SessionsPage() {
  const auth = await requireAuth();
  if (!auth) redirect('/signup');

  let sessions: any[] = [];
  let users: any[] = [];

  try {
    const res = await serverFetch('/api/skills/sessions/', auth.token);
    if (res.ok) sessions = await res.json();
  } catch {}

  try {
    const res = await serverFetch('/api/messages/connections/', auth.token);
    if (res.ok) {
      const connections = await res.json();
      users = connections.map((c: any) =>
        c.from_user.id === auth.user?.id ? c.to_user : c.from_user
      );
    }
  } catch {}

  return <SessionsClient initialSessions={sessions} initialUsers={users} />;
}
