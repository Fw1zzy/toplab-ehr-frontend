import { NextRequest, NextResponse } from 'next/server';
import { bearerToken, cmsRequest, InterclinicError } from '@/lib/interclinicServer';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).origin !== request.nextUrl.origin) {
      throw new InterclinicError('Cross-origin request rejected.', 403);
    }
    const userToken = bearerToken(request);
    const serviceToken = process.env.LIKHA_PATIENT_SERVICE_TOKEN;
    if (!serviceToken) throw new InterclinicError('Two-factor settings are not configured on the app server.', 503);
    const currentUser = await cmsRequest<{ id: string }>(userToken, '/users/me?fields=id');
    const account = await cmsRequest<{ role: string | { id: string } | null; tfa_secret: string | null }>(
      serviceToken, `/users/${encodeURIComponent(currentUser.id)}?fields=role,tfa_secret`,
    );
    const roleId = typeof account.role === 'string' ? account.role : account.role?.id;
    const roleRows = roleId
      ? await cmsRequest<Array<{ id: string; parent: string | { id: string } | null }>>(serviceToken, '/roles?limit=1000&fields=id,parent')
      : [];
    const roleIds = new Set(roleId ? [roleId] : []);
    let currentRoleId = roleId;
    while (currentRoleId) {
      const currentRole = roleRows.find((role) => role.id === currentRoleId);
      const parentId = currentRole?.parent
        ? typeof currentRole.parent === 'string' ? currentRole.parent : currentRole.parent.id
        : null;
      if (!parentId || roleIds.has(parentId)) break;
      roleIds.add(parentId);
      currentRoleId = parentId;
    }
    const [userAccess, roleAccess] = await Promise.all([
      cmsRequest<Array<{ policy: string | { id: string } }>>(serviceToken,
        `/access?${new URLSearchParams({ limit: '500', fields: 'policy', 'filter[user][_eq]': currentUser.id })}`),
      roleIds.size
        ? cmsRequest<Array<{ policy: string | { id: string } }>>(serviceToken,
          `/access?${new URLSearchParams({ limit: '1000', fields: 'policy', 'filter[role][_in]': [...roleIds].join(',') })}`)
        : Promise.resolve([]),
    ]);
    const policyIds = [...new Set([...userAccess, ...roleAccess].map((access) =>
      typeof access.policy === 'string' ? access.policy : access.policy.id,
    ))];
    const policies = policyIds.length
      ? await cmsRequest<Array<{ enforce_tfa: boolean }>>(serviceToken,
        `/policies?${new URLSearchParams({ limit: '500', fields: 'enforce_tfa', 'filter[id][_in]': policyIds.join(',') })}`)
      : [];
    return NextResponse.json({
      data: { enabled: !!account.tfa_secret, requiredByPolicy: policies.some((policy) => policy.enforce_tfa) },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to check authenticator status.', 500);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
