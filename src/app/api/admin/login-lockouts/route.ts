import { NextRequest, NextResponse } from 'next/server';
import { accessPolicyError, requireEhrAdministrator } from '@/lib/adminAccessServer';
import { assertSameOrigin, cmsRequest, InterclinicError } from '@/lib/interclinicServer';
import { hashLoginAccount, LOGIN_ATTEMPT_COLLECTION, MAX_LOGIN_FAILURES } from '@/lib/loginAttemptServer';
import { failureTimeUtc, remainingCooldown } from '@/lib/loginCooldown';

export const runtime = 'nodejs';

interface AttemptRow { id: string; account_hash: string; failed_at: string }
interface UserRow { id: string; email: string; first_name: string | null; last_name: string | null }

async function loadAttempts(serviceToken: string) {
  const all: AttemptRow[] = [];
  const pageSize = 500;
  for (let offset = 0; offset < 50_000; offset += pageSize) {
    const query = new URLSearchParams({ limit: String(pageSize), offset: String(offset), sort: '-failed_at', fields: 'id,account_hash,failed_at' });
    let rows: AttemptRow[];
    try {
      rows = await cmsRequest<AttemptRow[]>(serviceToken, `/items/${LOGIN_ATTEMPT_COLLECTION}?${query}`);
    } catch {
      throw new InterclinicError('The app_login_attempt EHR collection is not available.', 503);
    }
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

export async function GET(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const { serviceToken } = await requireEhrAdministrator(request);
    const [attempts, users] = await Promise.all([
      loadAttempts(serviceToken),
      cmsRequest<UserRow[]>(serviceToken, '/users?limit=2000&fields=id,email,first_name,last_name'),
    ]);
    const grouped = new Map<string, AttemptRow[]>();
    for (const attempt of attempts) {
      const rows = grouped.get(attempt.account_hash) ?? [];
      rows.push(attempt);
      grouped.set(attempt.account_hash, rows);
    }
    const userByHash = new Map(users.filter((user) => user.email).map((user) => [hashLoginAccount(user.email), user]));
    const now = Date.now();
    const data = [...grouped.entries()].flatMap(([accountHash, rows]) => {
      const user = userByHash.get(accountHash);
      if (!user || rows.length < 20) return [];
      const failedAttempts = rows.length;
      const latest = Math.max(...rows.map((row) => failureTimeUtc(row.failed_at)));
      const lastFailedAt = new Date(latest).toISOString();
      const retryAfterSeconds = remainingCooldown(failedAttempts, latest, now);
      return [{
        userId: user.id,
        email: user.email,
        name: `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email,
        failedAttempts,
        remainingAttempts: Math.max(0, MAX_LOGIN_FAILURES - failedAttempts),
        blocked: failedAttempts >= MAX_LOGIN_FAILURES,
        retryAfterSeconds,
        lastFailedAt,
      }];
    });
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = accessPolicyError(cause);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const { serviceToken } = await requireEhrAdministrator(request);
    const body = await request.json();
    const userId = String(body.userId ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new InterclinicError('Select a valid EHR account.', 400);
    const user = await cmsRequest<UserRow>(serviceToken,
      `/users/${encodeURIComponent(userId)}?fields=id,email,first_name,last_name`);
    if (!user.email) throw new InterclinicError('This account has no email address and cannot be unlocked through this screen.', 409);
    const accountHash = hashLoginAccount(user.email);
    const query = new URLSearchParams({ limit: '100', fields: 'id' });
    query.set('filter[account_hash][_eq]', accountHash);
    const attempts = await cmsRequest<Array<{ id: string }>>(serviceToken, `/items/${LOGIN_ATTEMPT_COLLECTION}?${query}`);
    await Promise.all(attempts.map((attempt) =>
      cmsRequest(serviceToken, `/items/${LOGIN_ATTEMPT_COLLECTION}/${encodeURIComponent(attempt.id)}`, 'DELETE'),
    ));
    return NextResponse.json({ data: { userId, unlocked: true } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = accessPolicyError(cause);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
