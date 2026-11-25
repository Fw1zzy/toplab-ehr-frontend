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

function loginStoreError(operation: 'read' | 'create' | 'delete', cause: unknown): never {
  const status = cause instanceof InterclinicError ? cause.status : null;
  // Do not log the request URL, account hash, token, or upstream error body.
  console.error('[login-protection] EHR storage request failed', { operation, upstreamStatus: status });
  let message: string;
  if (status === 401) {
    message = 'The EHR rejected the app server credential. An administrator must update LIKHA_PATIENT_SERVICE_TOKEN in the deployment environment and redeploy.';
  } else if (status === 403) {
    message = `The EHR denied ${operation} access to login protection storage. An administrator must check the deployed service token's permissions for app_login_attempt and its id, account_hash, and failed_at fields.`;
  } else if (status === 404) {
    message = 'Login protection storage was not found at the configured EHR. An administrator must verify LIKHA_CMS_URL and the app_login_attempt collection in the deployment environment.';
  } else {
    message = 'Login protection storage could not be reached. An administrator must check the production EHR connection and server logs. Please try again later.';
  }
  throw new InterclinicError(message, 503);
}

export function hashLoginAccount(email: string, factor: 'password' | 'otp' = 'password') {
  const secret = process.env.INTERCLINIC_OTP_SECRET;
  if (!secret || secret.length < 32) throw new InterclinicError('Login lockout hashing is not configured on the app server.', 503);
  const prefix = factor === 'otp' ? 'login-otp' : 'login-account';
  return createHmac('sha256', secret).update(`${prefix}:${email.trim().toLowerCase()}`).digest('hex');
}

export async function readLoginAttempts(serviceToken: string, accountHash: string | string[]) {
  try {
    const query = new URLSearchParams({ limit: String(MAX_LOGIN_FAILURES), sort: '-failed_at', fields: 'id,account_hash,failed_at' });
    query.set(Array.isArray(accountHash) ? 'filter[account_hash][_in]' : 'filter[account_hash][_eq]',
      Array.isArray(accountHash) ? accountHash.join(',') : accountHash);
    const attempts = await cmsRequest<LoginAttempt[]>(serviceToken, `/items/${LOGIN_ATTEMPT_COLLECTION}?${query}`);
    if (!Array.isArray(attempts)) throw new Error('Invalid EHR login-store response.');
    return attempts;
  } catch (cause) {
    loginStoreError('read', cause);
  }
}

export async function recordLoginFailure(serviceToken: string, accountHash: string) {
  try {
    await cmsRequest(serviceToken, `/items/${LOGIN_ATTEMPT_COLLECTION}`, 'POST', {
      account_hash: accountHash,
      // Directus DateTime stores a wall-clock value; always write the UTC clock.
      failed_at: new Date().toISOString().slice(0, -1),
    });
  } catch (cause) {
    loginStoreError('create', cause);
  }
}

export async function clearLoginAttempts(serviceToken: string, attempts: LoginAttempt[]) {
  try {
    await Promise.all(attempts.map((attempt) =>
      cmsRequest(serviceToken, `/items/${LOGIN_ATTEMPT_COLLECTION}/${encodeURIComponent(attempt.id)}`, 'DELETE'),
    ));
  } catch (cause) {
    loginStoreError('delete', cause);
  }
}
