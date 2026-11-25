import { createHmac } from 'node:crypto';
import { cmsRequest, InterclinicError } from '@/lib/interclinicServer';

export const LOGIN_ATTEMPT_COLLECTION = 'app_login_attempt';
import { MAX_LOGIN_FAILURES } from './loginCooldown';
export { MAX_LOGIN_FAILURES, cooldownSecondsForFailures } from './loginCooldown';

export interface LoginAttempt {
  id: string;
  account_hash: string;
  failed_at: string;
}

export function hashLoginAccount(email: string) {
  const secret = process.env.INTERCLINIC_OTP_SECRET;
  if (!secret || secret.length < 32) throw new InterclinicError('Login lockout hashing is not configured on the app server.', 503);
  return createHmac('sha256', secret).update(`login-account:${email.trim().toLowerCase()}`).digest('hex');
}

export async function readLoginAttempts(serviceToken: string, accountHash: string) {
  try {
    const query = new URLSearchParams({ limit: String(MAX_LOGIN_FAILURES), sort: '-failed_at', fields: 'id,account_hash,failed_at' });
    query.set('filter[account_hash][_eq]', accountHash);
    return await cmsRequest<LoginAttempt[]>(serviceToken, `/items/${LOGIN_ATTEMPT_COLLECTION}?${query}`);
  } catch {
    throw new InterclinicError('The EHR login-attempt collection is not available. Create app_login_attempt with account_hash and failed_at fields before enabling login throttling.', 503);
  }
}

export async function recordLoginFailure(serviceToken: string, accountHash: string) {
  try {
    await cmsRequest(serviceToken, `/items/${LOGIN_ATTEMPT_COLLECTION}`, 'POST', {
      account_hash: accountHash,
      // Directus DateTime stores a wall-clock value; always write the UTC clock.
      failed_at: new Date().toISOString().slice(0, -1),
    });
  } catch {
    throw new InterclinicError('Unable to record the failed login attempt. Login is blocked until attempt storage is available.', 503);
  }
}

export async function clearLoginAttempts(serviceToken: string, attempts: LoginAttempt[]) {
  await Promise.all(attempts.map((attempt) =>
    cmsRequest(serviceToken, `/items/${LOGIN_ATTEMPT_COLLECTION}/${encodeURIComponent(attempt.id)}`, 'DELETE'),
  ));
}
