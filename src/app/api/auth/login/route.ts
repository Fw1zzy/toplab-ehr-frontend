import { NextRequest, NextResponse } from 'next/server';
import { InterclinicError } from '@/lib/interclinicServer';
import { failureTimeUtc, remainingCooldown } from '@/lib/loginCooldown';
import { clearLoginAttempts, cooldownSecondsForFailures, hashLoginAccount, MAX_LOGIN_FAILURES, readLoginAttempts, recordLoginFailure } from '@/lib/loginAttemptServer';

export const runtime = 'nodejs';

const cmsBaseUrl = (process.env.LIKHA_CMS_URL || 'https://ehr.zyberlab.com').replace(/\/$/, '');

function failureResponse(status: number, message: string, failedAttempts: number, retryAfterSeconds = 0) {
  const remainingAttempts = Math.max(0, MAX_LOGIN_FAILURES - failedAttempts);
  return NextResponse.json({
    error: message,
    failedAttempts,
    remainingAttempts,
    retryAfterSeconds,
    warning: failedAttempts >= 20 && failedAttempts < MAX_LOGIN_FAILURES,
    blocked: failedAttempts >= MAX_LOGIN_FAILURES,
  }, { status, headers: { 'Cache-Control': 'no-store', ...(retryAfterSeconds > 0 ? { 'Retry-After': String(retryAfterSeconds) } : {}) } });
}

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).origin !== request.nextUrl.origin) throw new InterclinicError('Cross-origin request rejected.', 403);
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const otp = typeof body.otp === 'string' && body.otp ? body.otp : undefined;
    if (!email || !password) throw new InterclinicError('Email and password are required.', 400);
    if (otp && !/^\d{6}$/.test(otp)) throw new InterclinicError('Enter a valid six-digit authenticator code.', 400);

    const serviceToken = process.env.LIKHA_PATIENT_SERVICE_TOKEN;
    if (!serviceToken) throw new InterclinicError('Login protection is not configured on the app server.', 503);
    const accountHash = hashLoginAccount(email);
    const attempts = await readLoginAttempts(serviceToken, accountHash);
    const failedAttempts = attempts.length;
    if (failedAttempts >= MAX_LOGIN_FAILURES) {
      return failureResponse(423, 'This account is blocked after 25 failed login attempts. Contact an EHR administrator to unlock it.', failedAttempts);
    }

    const cooldownSeconds = cooldownSecondsForFailures(failedAttempts);
    if (cooldownSeconds > 0 && attempts[0]) {
      const retryAfterSeconds = remainingCooldown(failedAttempts, failureTimeUtc(attempts[0].failed_at));
      if (retryAfterSeconds > 0) {
        return failureResponse(429, 'Too many failed attempts. Please wait before trying again.', failedAttempts, retryAfterSeconds);
      }
    }

    const upstream = await fetch(`${cmsBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, mode: 'json', ...(otp ? { otp } : {}) }),
      cache: 'no-store',
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const authCode = result.errors?.[0]?.extensions?.code;
      const invalidOtp = authCode === 'INVALID_OTP' || /invalid user otp/i.test(String(result.errors?.[0]?.message ?? ''));
      if (invalidOtp && !otp) return failureResponse(401, 'Invalid user OTP.', failedAttempts);
      if (!invalidOtp && authCode !== 'INVALID_CREDENTIALS' && !(upstream.status === 401 && !authCode)) {
        return NextResponse.json({ error: 'The EHR could not complete sign-in. No failed attempt was recorded.' }, { status: upstream.status, headers: { 'Cache-Control': 'no-store' } });
      }
      await recordLoginFailure(serviceToken, accountHash);
      const newFailureCount = failedAttempts + 1;
      if (newFailureCount >= MAX_LOGIN_FAILURES) {
        return failureResponse(423, 'This account is blocked after 25 failed login attempts. Contact an EHR administrator to unlock it.', newFailureCount);
      }
      const delaySeconds = cooldownSecondsForFailures(newFailureCount);
      const message = invalidOtp
        ? 'Invalid user OTP.'
        : 'Invalid email or password.';
      return failureResponse(delaySeconds ? 429 : 401, message, newFailureCount, delaySeconds);
    }

    await clearLoginAttempts(serviceToken, attempts);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to complete login.', 500);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
