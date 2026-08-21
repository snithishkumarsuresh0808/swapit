import { redirect } from 'next/navigation';
import { requireAuth, serverFetch } from '@/lib/server-auth';
import SettingsClient from '../components/SettingsClient';

export default async function SettingsPage() {
  const auth = await requireAuth();
  if (!auth) redirect('/signup');

  let user: any = null;
  try {
    const res = await serverFetch('/api/auth/me/', auth.token);
    if (res.ok) user = await res.json();
  } catch {}

  return <SettingsClient initialUser={user} />;
}
