'use server';

import { cookies } from 'next/headers';

export async function setAuthCookie(token: string, user: string) {
  try {
    const cookieStore = cookies();
    cookieStore.set('token', token, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    cookieStore.set('user', user, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  } catch (e) {
    console.error('setAuthCookie error:', e);
    throw e;
  }
}

export async function clearAuthCookies() {
  const cookieStore = cookies();
  cookieStore.delete('token');
  cookieStore.delete('user');
}
