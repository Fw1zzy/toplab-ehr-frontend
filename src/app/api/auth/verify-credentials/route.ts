import { NextRequest, NextResponse } from 'next/server';
import { bearerToken, cmsRequest, InterclinicError } from '@/lib/interclinicServer';

export const runtime = 'nodejs';

const cmsBaseUrl = (process.env.LIKHA_CMS_URL || 'https://ehr.zyberlab.com').replace(/\/$/, '');

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).origin !== request.nextUrl.origin) {
      throw new InterclinicError('Cross-origin request rejected.', 403);
    }
    const userToken = bearerToken(request);
    const currentUser = await cmsRequest<{ email: string }>(userToken, '/users/me?fields=email');
    const body = await request.json();
    const password = typeof body.password === 'string' ? body.password : '';
    const otp = typeof body.otp === 'string' ? body.otp : '';
    if (!password) throw new InterclinicError('Enter your current password to continue.', 400);
    if (otp && !/^\d{6}$/.test(otp)) throw new InterclinicError('Enter a valid six-digit authenticator code.', 400);

    const upstream = await fetch(`${cmsBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: currentUser.email, password, mode: 'json', ...(otp ? { otp } : {}) }),
      cache: 'no-store',
    });
    if (!upstream.ok) {
      await upstream.body?.cancel();
      throw new InterclinicError('Password or authenticator code could not be verified.', 401);
    }
    await upstream.body?.cancel();
    return NextResponse.json({ data: { verified: true } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to verify account credentials.', 500);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
