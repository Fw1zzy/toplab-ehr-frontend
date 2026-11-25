import { bearerToken, cmsRequest, InterclinicError } from '@/lib/interclinicServer';

type Relation = string | { id?: string; name?: string } | null;

function relationId(value: Relation) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

export async function requireEhrAdministrator(request: Request) {
  const userToken = bearerToken(request);
  const serviceToken = process.env.LIKHA_PATIENT_SERVICE_TOKEN;
  if (!serviceToken) throw new InterclinicError('Admin policy management is not configured on the app server.', 503);

  const currentUser = await cmsRequest<{ id: string }>(userToken, '/users/me?fields=id');
  const account = await cmsRequest<{ id: string; role: Relation }>(
    serviceToken, `/users/${encodeURIComponent(currentUser.id)}?fields=id,role`,
  );
  const roleId = relationId(account.role);
  const [directUserAccess, roleAccess] = await Promise.all([
    cmsRequest<Array<{ policy: Relation }>>(serviceToken,
      `/access?${new URLSearchParams({ limit: '500', fields: 'policy', 'filter[user][_eq]': currentUser.id })}`),
    roleId
      ? cmsRequest<Array<{ policy: Relation }>>(serviceToken,
          `/access?${new URLSearchParams({ limit: '500', fields: 'policy', 'filter[role][_eq]': roleId })}`)
      : Promise.resolve([]),
  ]);
  const directPolicyIds = new Set(directUserAccess
    .map((access) => relationId(access.policy)).filter((id): id is string => Boolean(id)));
  const assignedPolicyIds = new Set([...directUserAccess, ...roleAccess]
    .map((access) => relationId(access.policy)).filter((id): id is string => Boolean(id)));
  if (assignedPolicyIds.size === 0) throw new InterclinicError('This account does not have EHR administrator access.', 403);

  const query = new URLSearchParams({ limit: '200', fields: 'id,admin_access' });
  query.set('filter[id][_in]', [...assignedPolicyIds].join(','));
  const policies = await cmsRequest<Array<{ id: string; admin_access: boolean }>>(
    serviceToken, `/policies?${query}`,
  );
  if (!policies.some((policy) => policy.admin_access)) {
    throw new InterclinicError('This account does not have EHR administrator access.', 403);
  }

  return { userId: currentUser.id, roleId, assignedPolicyIds, directPolicyIds, serviceToken };
}

export function accessPolicyError(cause: unknown) {
  return cause instanceof InterclinicError
    ? cause
    : new InterclinicError('Unable to complete the EHR access-policy request.', 500);
}
