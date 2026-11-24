import { NextRequest, NextResponse } from 'next/server';
import {
  assertSameOrigin,
  bearerToken,
  cmsRequest,
  completeInterclinicShare,
  getRequestContext,
  hashPatientQrToken,
  InterclinicError,
  secureHashEquals,
  writeInterclinicAudit,
} from '@/lib/interclinicServer';

export const runtime = 'nodejs';

interface Relation { id: string }
interface PatientRecord {
  id: string;
  global_patient_id: string | null;
  custodian_branch: string | Relation | null;
}
interface QrAuditEvent {
  id: string;
  details: Record<string, unknown> | string | null;
}

function relationId(value: string | Relation | null) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

function eventDetails(value: QrAuditEvent['details']) {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
  }
  return value ?? {};
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const token = bearerToken(request);
    const context = await getRequestContext(token);
    const body = await request.json();
    const patientId = String(body.patientId ?? '');
    const purpose = String(body.purpose ?? '').trim();
    const qrPayload = String(body.qrPayload ?? '');
    const match = /^TOPLAB-QRP1:([0-9a-f-]{36}):([0-9a-f-]{36}):([A-Za-z0-9_-]{43})$/i.exec(qrPayload);
    if (!/^[0-9a-f-]{36}$/i.test(patientId) || !match || match[1].toLowerCase() !== patientId.toLowerCase()) {
      throw new InterclinicError('Upload a valid TOPLAB patient QR image.', 400);
    }
    if (purpose.length < 8 || purpose.length > 500) throw new InterclinicError('Enter a purpose between 8 and 500 characters.', 400);

    const patient = await cmsRequest<PatientRecord>(token,
      `/items/patient/${encodeURIComponent(patientId)}?fields=id,global_patient_id,custodian_branch`);
    if (!patient.global_patient_id) throw new InterclinicError('This patient has no global patient ID.', 409);
    const sourceBranchId = relationId(patient.custodian_branch);
    if (!sourceBranchId) throw new InterclinicError('This patient has no current custodian branch.', 409);
    if (sourceBranchId === context.branch.id) throw new InterclinicError('This patient is already under your branch’s custody.', 409);

    const qrQuery = new URLSearchParams({ limit: '500', fields: 'id,details' });
    qrQuery.set('filter[global_patient_id][_eq]', patient.global_patient_id);
    qrQuery.set('filter[event_type][_in]', 'request,revoked,qr_credential');
    const qrEvents = await cmsRequest<QrAuditEvent[]>(token, `/items/interclinic_access_audit?${qrQuery}`);
    const credentialId = match[2];
    const issue = qrEvents
      .map((event) => ({ event, details: eventDetails(event.details) }))
      .find(({ details }) => details.action === 'issued' && details.credential_id === credentialId);
    if (!issue || !secureHashEquals(String(issue.details.token_hash ?? ''), hashPatientQrToken(qrPayload))) {
      throw new InterclinicError('This patient QR is invalid or has been revoked.', 403);
    }
    const issueDate = String(issue.details.issued_at ?? '');
    const revokeDate = qrEvents
      .map((event) => eventDetails(event.details))
      .filter((details) => details.action === 'revoked' && details.credential_id === credentialId)
      .map((details) => String(details.revoked_at ?? ''))
      .sort()
      .at(-1);
    if (revokeDate && revokeDate >= issueDate) throw new InterclinicError('This patient QR has been revoked.', 403);

    const recentAuditQuery = new URLSearchParams({ limit: '20', fields: 'id' });
    recentAuditQuery.set('filter[actor_user][_eq]', context.user.id);
    recentAuditQuery.set('filter[event_type][_eq]', 'request');
    recentAuditQuery.set('filter[date_created][_gte]', new Date(Date.now() - 60 * 60 * 1000).toISOString());
    const recent = await cmsRequest<Array<{ id: string }>>(token, `/items/interclinic_access_audit?${recentAuditQuery}`);
    if (recent.length >= 5) throw new InterclinicError('Request limit reached. Try again later.', 429);

    const now = new Date().toISOString();
    const consent = await cmsRequest<{ id: string }>(token, '/items/interclinic_consent', 'POST', {
      global_patient_id: patient.global_patient_id,
      local_patient: patient.id,
      source_branch: sourceBranchId,
      destination_branch: context.branch.id,
      requested_by: context.user.id,
      purpose,
      effect: 'view_only',
      scope: ['patient', 'encounter', 'laboratory', 'invoice'],
      consent_version: 'interclinic-share-qr-v1',
      verification_method: null,
      otp_hash: null,
      otp_expires_at: null,
      otp_attempt_count: 0,
      access_expires_at: null,
      status: 'pending',
    });
    await writeInterclinicAudit(token, {
      event_type: 'request', global_patient_id: patient.global_patient_id,
      patient: patient.id, consent: consent.id, actor_user: context.user.id,
      branch: context.branch.id,
      details: { effect: 'view_only', verification_method: 'patient_qr', qr_credential_id: credentialId },
    });
    await completeInterclinicShare(token, context, {
      ...consent,
      global_patient_id: patient.global_patient_id,
      local_patient: patient.id,
      source_branch: sourceBranchId,
      destination_branch: context.branch.id,
      scope: ['patient', 'encounter', 'laboratory', 'invoice'],
    }, now, 'patient_qr');

    return NextResponse.json({ data: { status: 'approved', custodianBranchId: sourceBranchId } }, {
      status: 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (cause) {
    const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to share patient access using this QR.', 500);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
