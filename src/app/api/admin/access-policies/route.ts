import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { accessPolicyError, requireEhrAdministrator } from '@/lib/adminAccessServer';
import { assertSameOrigin, cmsRequest, InterclinicError } from '@/lib/interclinicServer';

export const runtime = 'nodejs';

const permissionActions = new Set(['create', 'read', 'update', 'delete', 'share']);

interface DirectusCollection {
  collection: string;
  meta?: { singleton?: boolean; system?: boolean };
}

interface AccessAssignment {
  id: string;
  role: string | { id: string } | null;
  user: string | { id: string } | null;
  policy: string | { id: string } | null;
}
type DirectusRelation = string | { id: string } | null;

interface EhrUserRecord {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string | { id: string } | null;
  tfa_secret: string | null;
}

function relationId(value: AccessAssignment['role']) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

function decodeBase32(secret: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const normalized = secret.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let buffer = 0;
  let bits = 0;
  const bytes: number[] = [];
  for (const character of normalized) {
    const value = alphabet.indexOf(character);
    if (value < 0) throw new InterclinicError('The account has an invalid authenticator secret. An administrator must re-enroll it.', 409);
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  if (!bytes.length) throw new InterclinicError('The account has an invalid authenticator secret. An administrator must re-enroll it.', 409);
  return Buffer.from(bytes);
}

function verifyTotp(secret: string, code: string) {
  if (!/^\d{6}$/.test(code)) return false;
  const key = decodeBase32(secret);
  const currentStep = Math.floor(Date.now() / 30_000);
  for (let drift = -1; drift <= 1; drift += 1) {
    const counter = Buffer.alloc(8);
    counter.writeBigUInt64BE(BigInt(currentStep + drift));
    const digest = createHmac('sha1', key).update(counter).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary = ((digest[offset] & 0x7f) << 24)
      | ((digest[offset + 1] & 0xff) << 16)
      | ((digest[offset + 2] & 0xff) << 8)
      | (digest[offset + 3] & 0xff);
    const expected = String(binary % 1_000_000).padStart(6, '0');
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) return true;
  }
  return false;
}

async function validateIds(serviceToken: string, collection: string, ids: string[], label: string) {
  if (ids.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) throw new InterclinicError(`One or more ${label} are invalid.`, 400);
  if (ids.length === 0) return;
  const query = new URLSearchParams({ limit: '2000', fields: 'id' });
  query.set('filter[id][_in]', [...new Set(ids)].join(','));
  const items = await cmsRequest<Array<{ id: string }>>(serviceToken, `/${collection}?${query}`);
  if (items.length !== new Set(ids).size) throw new InterclinicError(`One or more ${label} do not exist.`, 400);
}

async function syncAccessAssignments(
  serviceToken: string,
  field: 'policy' | 'role' | 'user',
  ownerId: string,
  relatedField: 'role' | 'user' | 'policy',
  relatedIds: string[],
) {
  const existing = await cmsRequest<Array<AccessAssignment>>(
    serviceToken,
    `/access?${new URLSearchParams({ limit: '2000', fields: `id,${relatedField}`, [`filter[${field}][_eq]`]: ownerId })}`,
  );
  const existingIds = new Set(existing.map((row) => relationId(row[relatedField])).filter((id): id is string => Boolean(id)));
  const desiredIds = new Set(relatedIds);
  for (const relatedId of desiredIds) {
    if (!existingIds.has(relatedId)) await cmsRequest(serviceToken, '/access', 'POST', { [field]: ownerId, [relatedField]: relatedId });
  }
  for (const row of existing) {
    const relatedId = relationId(row[relatedField]);
    if (!relatedId || !desiredIds.has(relatedId)) await cmsRequest(serviceToken, `/access/${encodeURIComponent(row.id)}`, 'DELETE');
  }
}

async function syncRoleUsers(serviceToken: string, roleId: string, userIds: string[], currentAdminUserId: string) {
  const currentUsers = await cmsRequest<Array<{ id: string }>>(serviceToken,
    `/users?${new URLSearchParams({ limit: '2000', fields: 'id', 'filter[role][_eq]': roleId })}`);
  const currentIds = new Set(currentUsers.map((user) => user.id));
  const desiredIds = new Set(userIds);
  if (currentIds.has(currentAdminUserId) && !desiredIds.has(currentAdminUserId)) {
    throw new InterclinicError('You cannot remove your own account from its current administrator role.', 403);
  }
  for (const userId of desiredIds) {
    if (!currentIds.has(userId)) await cmsRequest(serviceToken, `/users/${encodeURIComponent(userId)}`, 'PATCH', { role: roleId });
  }
  for (const userId of currentIds) {
    if (!desiredIds.has(userId)) await cmsRequest(serviceToken, `/users/${encodeURIComponent(userId)}`, 'PATCH', { role: null });
  }
}

async function assertAssignedUsersEnrolled(serviceToken: string, userIds: string[], roleIds: string[]) {
  const effectiveRoleIds = new Set(roleIds);
  if (roleIds.length) {
    const roles = await cmsRequest<Array<{ id: string; parent: DirectusRelation }>>(serviceToken,
      '/roles?limit=1000&fields=id,parent');
    let added = true;
    while (added) {
      added = false;
      for (const role of roles) {
        const parentId = relationId(role.parent);
        if (parentId && effectiveRoleIds.has(parentId) && !effectiveRoleIds.has(role.id)) {
          effectiveRoleIds.add(role.id);
          added = true;
        }
      }
    }
  }
  if (userIds.length === 0 && effectiveRoleIds.size === 0) return;
  const filters: Record<string, string> = {};
  let filterIndex = 0;
  if (userIds.length) filters[`filter[_or][${filterIndex++}][id][_in]`] = userIds.join(',');
  if (effectiveRoleIds.size) filters[`filter[_or][${filterIndex}][role][_in]`] = [...effectiveRoleIds].join(',');
  const users = await cmsRequest<Array<{ id: string; status: string; tfa_secret: string | null }>>(
    serviceToken,
    `/users?${new URLSearchParams({ limit: '2000', fields: 'id,status,tfa_secret', ...filters })}`,
  );
  const activeUsers = users.filter((user) => user.status === 'active');
  const missingCount = activeUsers.filter((user) => !user.tfa_secret).length;
  if (missingCount > 0) {
    throw new InterclinicError(`${missingCount} active account(s) assigned to this policy have not enrolled in an authenticator app. Each affected user must set up 2FA in Profile before policy enforcement can be enabled.`, 409);
  }
}

function jsonObject(value: unknown, field: string): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new InterclinicError(`${field} must be a JSON object or null.`, 400);
  return value as Record<string, unknown>;
}

function stringArray(value: unknown, field: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new InterclinicError(`${field} must be a list of strings.`, 400);
  }
  return value as string[];
}

export async function GET(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const { serviceToken, userId } = await requireEhrAdministrator(request);
    const currentUser = await cmsRequest<{ tfa_secret: string | null }>(
      serviceToken, `/users/${encodeURIComponent(userId)}?fields=tfa_secret`,
    );
    const [roleRows, policyRows, permissions, collections, accessRows, users] = await Promise.all([
      cmsRequest<Array<Record<string, unknown>>>(serviceToken,
        '/roles?limit=500&sort=name&fields=id,name,icon,description,parent'),
      cmsRequest<Array<Record<string, unknown>>>(serviceToken,
        '/policies?limit=500&sort=name&fields=id,name,icon,description,admin_access,app_access,ip_access,enforce_tfa'),
      cmsRequest<Array<Record<string, unknown>>>(serviceToken,
        '/permissions?limit=2000&sort=collection,action&fields=id,collection,action,permissions,validation,presets,fields,policy'),
      cmsRequest<DirectusCollection[]>(serviceToken,
        '/collections?limit=1000&fields=collection,meta'),
      cmsRequest<AccessAssignment[]>(serviceToken,
        '/access?limit=2000&fields=id,role,user,policy'),
      cmsRequest<EhrUserRecord[]>(serviceToken,
        '/users?limit=2000&sort=last_name&fields=id,first_name,last_name,email,role,tfa_secret'),
    ]);
    const safeUsers = users.map(({ tfa_secret, ...user }) => ({ ...user, tfa_enabled: !!tfa_secret }));
    const policiesById = new Map(policyRows.map((policy) => [String(policy.id), policy]));
    const rolesById = new Map(roleRows.map((role) => [String(role.id), role]));
    const roles = roleRows.map((role) => ({
      ...role,
      users: safeUsers.filter((user) => relationId(user.role) === String(role.id)),
      childRoles: roleRows.filter((candidate) => relationId(candidate.parent as AccessAssignment['role']) === String(role.id)),
      policies: accessRows.flatMap((assignment) => {
        const policyId = relationId(assignment.policy);
        return relationId(assignment.role) === String(role.id) && policyId && policiesById.has(policyId)
          ? [policiesById.get(policyId)] : [];
      }),
    }));
    const policies = policyRows.map((policy) => ({
      ...policy,
      roles: accessRows.flatMap((assignment) => {
        const roleId = relationId(assignment.role);
        return relationId(assignment.policy) === String(policy.id) && roleId && rolesById.has(roleId)
          ? [rolesById.get(roleId)] : [];
      }),
      users: accessRows.flatMap((assignment) => {
        const userId = relationId(assignment.user);
        return relationId(assignment.policy) === String(policy.id) && userId
          ? [safeUsers.find((user) => user.id === userId) ?? { id: userId, first_name: null, last_name: null, email: null, role: null, tfa_enabled: false }]
          : [];
      }),
      assignedUsers: (() => {
        const directUserIds = new Set(accessRows
          .filter((assignment) => relationId(assignment.policy) === String(policy.id) && assignment.user)
          .map((assignment) => relationId(assignment.user)!) );
        const assignedRoleIds = new Set(accessRows
          .filter((assignment) => relationId(assignment.policy) === String(policy.id) && assignment.role)
          .map((assignment) => relationId(assignment.role)!) );
        let expanded = true;
        while (expanded) {
          expanded = false;
          for (const role of roleRows) {
            const parentId = relationId(role.parent as AccessAssignment['role']);
            if (parentId && assignedRoleIds.has(parentId) && !assignedRoleIds.has(String(role.id))) {
              assignedRoleIds.add(String(role.id));
              expanded = true;
            }
          }
        }
        return safeUsers.filter((user) => directUserIds.has(user.id) || (relationId(user.role) && assignedRoleIds.has(relationId(user.role)!)));
      })(),
    }));
    return NextResponse.json({
      data: {
        roles,
        policies,
        permissions,
        users: safeUsers,
        currentUserTfaEnabled: !!currentUser.tfa_secret,
        collections: collections
          .filter((item) => !item.meta?.singleton)
          .map((item) => item.collection)
          .sort(),
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = accessPolicyError(cause);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const { serviceToken, userId: adminUserId, roleId: adminRoleId, assignedPolicyIds: adminPolicyIds } = await requireEhrAdministrator(request);
    const body = await request.json() as Record<string, unknown>;
    const action = String(body.action ?? '');

    if (action === 'user:disable-tfa') {
      const targetUserId = String(body.userId ?? '');
      const otp = String(body.otp ?? '');
      if (!/^[0-9a-f-]{36}$/i.test(targetUserId)) throw new InterclinicError('Select a valid user account.', 400);
      const target = await cmsRequest<{ id: string; role: DirectusRelation; tfa_secret: string | null }>(
        serviceToken, `/users/${encodeURIComponent(targetUserId)}?fields=id,role,tfa_secret`,
      );
      if (!target.tfa_secret) return NextResponse.json({ data: { id: target.id, tfa_enabled: false } }, { headers: { 'Cache-Control': 'no-store' } });

      const targetRoleId = relationId(target.role);
      const roleRows = targetRoleId
        ? await cmsRequest<Array<{ id: string; parent: DirectusRelation }>>(serviceToken, '/roles?limit=1000&fields=id,parent')
        : [];
      const inheritedRoleIds = new Set(targetRoleId ? [targetRoleId] : []);
      let currentRoleId = targetRoleId;
      while (currentRoleId) {
        const currentRole = roleRows.find((role) => role.id === currentRoleId);
        const parentId = currentRole ? relationId(currentRole.parent) : null;
        if (!parentId || inheritedRoleIds.has(parentId)) break;
        inheritedRoleIds.add(parentId);
        currentRoleId = parentId;
      }
      const userAccess = await cmsRequest<Array<{ policy: DirectusRelation }>>(serviceToken,
        `/access?${new URLSearchParams({ limit: '1000', fields: 'policy', 'filter[user][_eq]': targetUserId })}`);
      const roleAccess = inheritedRoleIds.size
        ? await cmsRequest<Array<{ policy: DirectusRelation }>>(serviceToken,
          `/access?${new URLSearchParams({ limit: '2000', fields: 'policy', 'filter[role][_in]': [...inheritedRoleIds].join(',') })}`)
        : [];
      const targetPolicyIds = [...new Set([...userAccess, ...roleAccess]
        .map((assignment) => relationId(assignment.policy)).filter((id): id is string => Boolean(id)))];
      if (targetPolicyIds.length) {
        const policyQuery = new URLSearchParams({ limit: '500', fields: 'id,name,enforce_tfa' });
        policyQuery.set('filter[id][_in]', targetPolicyIds.join(','));
        const enforcedPolicies = await cmsRequest<Array<{ id: string; name: string; enforce_tfa: boolean }>>(
          serviceToken, `/policies?${policyQuery}`,
        );
        const requiredPolicy = enforcedPolicies.find((policy) => policy.enforce_tfa);
        if (requiredPolicy) throw new InterclinicError(`This account cannot have 2FA reset while the “${requiredPolicy.name}” policy requires it. Turn off policy enforcement first.`, 409);
      }

      if (!verifyTotp(target.tfa_secret, otp)) throw new InterclinicError('The authenticator code is invalid or expired. Ask the account holder to enter their current code.', 401);

      await cmsRequest(serviceToken, `/users/${encodeURIComponent(targetUserId)}`, 'PATCH', { tfa_secret: null });
      return NextResponse.json({ data: { id: target.id, tfa_enabled: false } }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'policy:create' || action === 'policy:update') {
      const id = String(body.id ?? '');
      const name = String(body.name ?? '').trim();
      if (!name || name.length > 100) throw new InterclinicError('Policy name must be between 1 and 100 characters.', 400);
      if (action === 'policy:update' && !/^[0-9a-f-]{36}$/i.test(id)) throw new InterclinicError('Select a valid access policy.', 400);
      for (const field of ['admin_access', 'app_access', 'enforce_tfa'] as const) {
        if (typeof body[field] !== 'boolean') throw new InterclinicError(`${field} must be enabled or disabled.`, 400);
      }
      const roleIds = stringArray(body.roleIds, 'Roles');
      const userIds = stringArray(body.userIds, 'Users');
      await validateIds(serviceToken, 'roles', roleIds, 'roles');
      await validateIds(serviceToken, 'users', userIds, 'users');
      const policyData: Record<string, unknown> = {
        name,
        description: String(body.description ?? '').trim() || null,
        admin_access: body.admin_access,
        app_access: body.app_access,
        ip_access: String(body.ip_access ?? '').trim() || null,
        enforce_tfa: body.enforce_tfa,
      };
      if (typeof body.icon === 'string' && body.icon.trim()) policyData.icon = body.icon.trim();
      else if (action === 'policy:create') policyData.icon = 'policy';
      if (action === 'policy:create') {
        if (policyData.enforce_tfa) await assertAssignedUsersEnrolled(serviceToken, userIds, roleIds);
        const created = await cmsRequest<{ id: string }>(serviceToken, '/policies', 'POST', policyData);
        await syncAccessAssignments(serviceToken, 'policy', created.id, 'role', roleIds);
        await syncAccessAssignments(serviceToken, 'policy', created.id, 'user', userIds);
        return NextResponse.json({ data: created }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
      }

      const existingPolicy = await cmsRequest<{ id: string; admin_access: boolean }>(serviceToken,
        `/policies/${encodeURIComponent(id)}?fields=id,admin_access`);
      const directAssignments = await cmsRequest<Array<{ user: DirectusRelation; role: DirectusRelation }>>(serviceToken,
        `/access?${new URLSearchParams({ limit: '1000', fields: 'user,role', 'filter[policy][_eq]': id })}`);
      const keepsCurrentUser = directAssignments.some((assignment) =>
        relationId(assignment.user) === adminUserId && userIds.includes(adminUserId));
      const keepsCurrentRole = !!adminRoleId && directAssignments.some((assignment) =>
        relationId(assignment.role) === adminRoleId && roleIds.includes(adminRoleId));
      if ((existingPolicy.admin_access || policyData.admin_access) && adminPolicyIds.has(id)
        && (!policyData.admin_access || (!keepsCurrentUser && !keepsCurrentRole))) {
        throw new InterclinicError('Cannot remove or disable the administrator policy currently protecting your account.', 403);
      }
      if (policyData.enforce_tfa) await assertAssignedUsersEnrolled(serviceToken, userIds, roleIds);
      const saved = await cmsRequest(serviceToken, `/policies/${encodeURIComponent(id)}`, 'PATCH', policyData);
      await syncAccessAssignments(serviceToken, 'policy', id, 'role', roleIds);
      await syncAccessAssignments(serviceToken, 'policy', id, 'user', userIds);
      return NextResponse.json({ data: saved }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'role:create' || action === 'role:update') {
      const id = String(body.id ?? '');
      const name = String(body.name ?? '').trim();
      if (!name || name.length > 100) throw new InterclinicError('Role name must be between 1 and 100 characters.', 400);
      if (action === 'role:update' && !/^[0-9a-f-]{36}$/i.test(id)) throw new InterclinicError('Select a valid role.', 400);
      const policyIds = stringArray(body.policyIds, 'Policies');
      const userIds = stringArray(body.userIds, 'Users');
      const parentId = body.parent ? String(body.parent) : null;
      if (parentId && (!/^[0-9a-f-]{36}$/i.test(parentId) || parentId === id)) throw new InterclinicError('Select a valid parent role.', 400);
      await validateIds(serviceToken, 'roles', parentId ? [parentId] : [], 'parent role');
      await validateIds(serviceToken, 'users', userIds, 'users');
      if (policyIds.some((policyId) => !/^[0-9a-f-]{36}$/i.test(policyId))) throw new InterclinicError('One or more selected policies are invalid.', 400);
      let requestedAdminPolicyIds: string[] = [];
      if (policyIds.length) {
        const policyQuery = new URLSearchParams({ limit: '500', fields: 'id,admin_access,enforce_tfa' });
        policyQuery.set('filter[id][_in]', policyIds.join(','));
        const existingPolicies = await cmsRequest<Array<{ id: string; admin_access: boolean; enforce_tfa: boolean }>>(serviceToken, `/policies?${policyQuery}`);
        if (existingPolicies.length !== new Set(policyIds).size) throw new InterclinicError('One or more selected policies do not exist.', 400);
        requestedAdminPolicyIds = existingPolicies.filter((policy) => policy.admin_access).map((policy) => policy.id);
        if (existingPolicies.some((policy) => policy.enforce_tfa)) await assertAssignedUsersEnrolled(serviceToken, userIds, []);
      }
      const roleData: Record<string, unknown> = {
        name,
        description: String(body.description ?? '').trim() || null,
        parent: parentId,
      };
      if (typeof body.icon === 'string' && body.icon.trim()) roleData.icon = body.icon.trim();
      else if (action === 'role:create') roleData.icon = 'person';
      let savedRole: { id: string };
      if (action === 'role:create') {
        if (requestedAdminPolicyIds.length) throw new InterclinicError('Administrator access policies cannot be assigned to a new role from this screen.', 403);
        savedRole = await cmsRequest<{ id: string }>(serviceToken, '/roles', 'POST', roleData);
      } else {
        savedRole = await cmsRequest<{ id: string }>(serviceToken, `/roles/${encodeURIComponent(id)}`, 'PATCH', roleData);
      }

      const currentAssignments = action === 'role:update'
        ? await cmsRequest<Array<{ id: string; policy: DirectusRelation }>>(serviceToken,
          `/access?${new URLSearchParams({ limit: '1000', fields: 'id,policy', 'filter[role][_eq]': savedRole.id })}`)
        : [];
      const currentPolicyIds = currentAssignments.map((assignment) => relationId(assignment.policy)).filter((policyId): policyId is string => Boolean(policyId));
      if (action === 'role:update') {
        const currentPolicyQuery = new URLSearchParams({ limit: '500', fields: 'id,admin_access' });
        currentPolicyQuery.set('filter[id][_in]', currentPolicyIds.join(','));
        const currentAdminPolicies = await cmsRequest<Array<{ id: string; admin_access: boolean }>>(serviceToken, `/policies?${currentPolicyQuery}`);
        const currentAdminPolicyIds = currentAdminPolicies.filter((policy) => policy.admin_access).map((policy) => policy.id).sort();
        if (JSON.stringify(currentAdminPolicyIds) !== JSON.stringify(requestedAdminPolicyIds.sort())) {
          throw new InterclinicError('Administrator access policy assignments are protected to prevent locking out EHR administrators.', 403);
        }
      }
      await syncAccessAssignments(serviceToken, 'role', savedRole.id, 'policy', policyIds);

      await syncRoleUsers(serviceToken, savedRole.id, userIds, adminUserId);
      return NextResponse.json({ data: savedRole }, { status: action === 'role:create' ? 201 : 200, headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'permission:create') {
      const policyId = String(body.policy ?? '');
      const collection = String(body.collection ?? '');
      const permissionAction = String(body.permissionAction ?? '');
      if (!/^[0-9a-f-]{36}$/i.test(policyId)) throw new InterclinicError('Select a valid access policy.', 400);
      if (!permissionActions.has(permissionAction)) throw new InterclinicError('Select a valid permission action.', 400);
      const knownCollections = await cmsRequest<DirectusCollection[]>(serviceToken,
        '/collections?limit=1000&fields=collection');
      if (!knownCollections.some((item) => item.collection === collection)) throw new InterclinicError('Select a valid EHR collection.', 400);
      const created = await cmsRequest(serviceToken, '/permissions', 'POST', {
        policy: policyId,
        collection,
        action: permissionAction,
        fields: stringArray(body.fields, 'Fields'),
        permissions: jsonObject(body.permissions, 'Permissions filter') ?? {},
        validation: jsonObject(body.validation, 'Validation filter'),
        presets: jsonObject(body.presets, 'Presets'),
      });
      return NextResponse.json({ data: created }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'permission:update') {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) throw new InterclinicError('Select a valid permission.', 400);
      const current = await cmsRequest<{ id: number; policy: string | { id: string } | null }>(
        serviceToken, `/permissions/${id}?fields=id,policy`,
      );
      const policyId = typeof current.policy === 'string' ? current.policy : current.policy?.id;
      if (policyId !== String(body.policy ?? '')) throw new InterclinicError('The permission does not belong to the selected policy.', 403);
      const updated = await cmsRequest(serviceToken, `/permissions/${id}`, 'PATCH', {
        fields: stringArray(body.fields, 'Fields'),
        permissions: jsonObject(body.permissions, 'Permissions filter') ?? {},
        validation: jsonObject(body.validation, 'Validation filter'),
        presets: jsonObject(body.presets, 'Presets'),
      });
      return NextResponse.json({ data: updated }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'permission:delete') {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) throw new InterclinicError('Select a valid permission.', 400);
      await cmsRequest(serviceToken, `/permissions/${id}`, 'DELETE');
      return NextResponse.json({ data: { id, deleted: true } }, { headers: { 'Cache-Control': 'no-store' } });
    }

    throw new InterclinicError('Unknown access-policy operation.', 400);
  } catch (cause) {
    const error = accessPolicyError(cause);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
