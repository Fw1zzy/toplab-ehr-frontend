import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin, bearerToken, cmsRequest, InterclinicError, writeInterclinicAudit } from '@/lib/interclinicServer';

export const runtime = 'nodejs';

interface Relation { id: string; name?: string; code?: string }
interface ConsentRecord {
  id: string;
  global_patient_id: string;
  purpose: string;
  scope: string[] | null;
  status: string;
  effect: string;
  approved_at: string | null;
  access_expires_at: string | null;
  destination_branch: Relation | string;
}

function relationId(value: Relation | string | null) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

function branchLabel(value: Relation | string) {
  return typeof value === 'string' ? value : value.name || value.code || value.id;
}

async function getPatientIdentity(userToken: string) {
  const serviceToken = process.env.LIKHA_PATIENT_SERVICE_TOKEN;
  if (!serviceToken) throw new InterclinicError('Patient sharing controls are not configured.', 503);
  const currentUser = await cmsRequest<{ id: string }>(userToken, '/users/me?fields=id');
  const account = await cmsRequest<{ role: string | { name?: string } | null }>(
    serviceToken, `/users/${encodeURIComponent(currentUser.id)}?fields=role.name`,
  );
  const roleName = typeof account.role === 'object' && account.role
    ? account.role.name?.trim().toLowerCase() : account.role?.trim().toLowerCase();
  if (roleName !== 'patient') throw new InterclinicError('Only the patient can manage their sharing permissions here.', 403);
  const patientQuery = new URLSearchParams({ limit: '10', fields: 'id,global_patient_id' });
  patientQuery.set('filter[user][_eq]', currentUser.id);
  const patients = await cmsRequest<Array<{ id: string; global_patient_id: string | null }>>(
    serviceToken, `/items/patient?${patientQuery}`,
  );
  const patient = patients.find((item) => item.global_patient_id);
  if (!patient?.global_patient_id) throw new InterclinicError('No patient record is linked to this EHR account.', 404);
  return { serviceToken, userId: currentUser.id, patient };
}

export async function GET(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const { serviceToken, patient } = await getPatientIdentity(bearerToken(request));
    const query = new URLSearchParams({
      limit: '200',
      sort: '-approved_at',
      fields: 'id,global_patient_id,purpose,scope,status,effect,approved_at,access_expires_at,destination_branch.id,destination_branch.name,destination_branch.code',
    });
    query.set('filter[global_patient_id][_eq]', patient.global_patient_id!);
    query.set('filter[effect][_eq]', 'view_only');
    query.set('filter[status][_in]', 'approved,revoked,expired');
    const grants = await cmsRequest<ConsentRecord[]>(serviceToken, `/items/interclinic_consent?${query}`);
    const data = grants.map((grant) => ({
      id: grant.id,
      destinationBranch: branchLabel(grant.destination_branch),
      purpose: grant.purpose,
      scope: grant.scope ?? [],
      status: grant.status === 'approved' && grant.access_expires_at && new Date(grant.access_expires_at).getTime() <= Date.now()
        ? 'expired' : grant.status,
      approvedAt: grant.approved_at,
      accessExpiresAt: grant.access_expires_at,
      canRevoke: grant.status === 'approved' && (!grant.access_expires_at || new Date(grant.access_expires_at).getTime() > Date.now()),
    }));
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to load your sharing permissions.', 500);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const userToken = bearerToken(request);
    const { serviceToken, userId, patient } = await getPatientIdentity(userToken);
    const body = await request.json();
    const consentId = String(body.consentId ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(consentId)) throw new InterclinicError('Select a valid sharing permission.', 400);

    const consent = await cmsRequest<ConsentRecord>(serviceToken,
      `/items/interclinic_consent/${encodeURIComponent(consentId)}?fields=id,global_patient_id,status,effect,destination_branch`);
    if (consent.global_patient_id !== patient.global_patient_id || consent.effect !== 'view_only') {
      throw new InterclinicError('This sharing permission does not belong to your patient record.', 403);
    }
    if (consent.status !== 'approved') throw new InterclinicError('This sharing permission is no longer active.', 409);

    const revokedAt = new Date().toISOString();
    const destinationBranchId = relationId(consent.destination_branch);
    await cmsRequest(serviceToken, `/items/interclinic_consent/${encodeURIComponent(consent.id)}`, 'PATCH', {
      status: 'revoked', revoked_at: revokedAt, revoked_by: userId,
    });
    await writeInterclinicAudit(serviceToken, {
      event_type: 'revoked', global_patient_id: patient.global_patient_id,
      patient: patient.id, consent: consent.id, actor_user: userId,
      ...(destinationBranchId ? { branch: destinationBranchId } : {}),
      details: { reason: 'patient_revoked_share', effect: 'view_only' },
    });
    return NextResponse.json({ data: { id: consent.id, status: 'revoked', revokedAt } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to revoke this sharing permission.', 500);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
