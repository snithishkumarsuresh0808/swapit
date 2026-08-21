import { cookies } from 'next/headers';

const API_BASE = process.env.BACKEND_URL || 'http://localhost:8001';

export async function requireAuth(): Promise<{ token: string; user: any } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const userCookie = cookieStore.get('user')?.value;

  if (!token || !userCookie) return null;

  try {
    const user = JSON.parse(userCookie);
    return { token, user };
  } catch {
    return null;
  }
}

export async function serverFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });
}
