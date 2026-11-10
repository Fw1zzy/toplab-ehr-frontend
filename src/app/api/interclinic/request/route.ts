import { NextRequest, NextResponse } from 'next/server';
import {
  assertSameOrigin,
  bearerToken,
  cmsRequest,
  createEmailTransport,
  createOtp,
  getRequestContext,
  hashOtp,
  maskEmail,
  sendPatientOtp,
  writeInterclinicAudit,
  InterclinicError,
} from '@/lib/interclinicServer';

export const runtime = 'nodejs';

const transferScope = ['patient', 'encounter', 'laboratory', 'invoice'];

export async function POST(request: NextRequest) {
  let token = '';
  let consentId: string | null = null;
  try {
    assertSameOrigin(request);
    token = bearerToken(request);
    const context = await getRequestContext(token);
    const body = await request.json();
    const patientId = String(body.patientId ?? '');
    const purpose = String(body.purpose ?? '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(patientId)) throw new InterclinicError('Select a valid EHR patient record.', 400);
    if (purpose.length < 8 || purpose.length > 500) throw new InterclinicError('Enter a purpose between 8 and 500 characters.', 400);

    // Verify mail and OTP configuration before creating a pending consent record.
    createEmailTransport();
    if (!process.env.INTERCLINIC_OTP_SECRET || process.env.INTERCLINIC_OTP_SECRET.length < 32) {
      throw new InterclinicError('INTERCLINIC_OTP_SECRET must be at least 32 characters.', 503);
    }

    const patient = await cmsRequest<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      global_patient_id: string | null;
      custodian_branch: string | { id: string } | null;
      origin_branch: string | { id: string } | null;
    }>(token, `/items/patient/${encodeURIComponent(patientId)}?fields=id,first_name,last_name,email,global_patient_id,custodian_branch,origin_branch`);
    const sourceBranchId = typeof patient.custodian_branch === 'string' ? patient.custodian_branch : patient.custodian_branch?.id;
    if (!sourceBranchId) throw new InterclinicError('This patient has no current custodian branch. An EHR administrator must resolve custody before transfer.', 409);
    if (sourceBranchId === context.branch.id) throw new InterclinicError('This patient is already under your branch\'s custody.', 409);
    if (!patient.global_patient_id) throw new InterclinicError('This patient has no global patient ID. An EHR administrator must complete patient identity mapping first.', 409);
    if (!patient.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient.email)) throw new InterclinicError('The patient has no valid email address on their EHR record.', 409);

    const now = new Date();
    const recentAuditQuery = new URLSearchParams({ limit: '20', fields: 'id' });
    recentAuditQuery.set('filter[actor_user][_eq]', context.user.id);
    recentAuditQuery.set('filter[event_type][_eq]', 'request');
    recentAuditQuery.set('filter[date_created][_gte]', new Date(now.getTime() - 60 * 60 * 1000).toISOString());
    const recentRequests = await cmsRequest<Array<{ id: string }>>(token, `/items/interclinic_access_audit?${recentAuditQuery}`);
    if (recentRequests.length >= 5) throw new InterclinicError('Request limit reached. Try again later.', 429);

    const pendingQuery = new URLSearchParams({ limit: '10', fields: 'id,otp_expires_at' });
    pendingQuery.set('filter[global_patient_id][_eq]', patient.global_patient_id);
    pendingQuery.set('filter[destination_branch][_eq]', context.branch.id);
    pendingQuery.set('filter[status][_eq]', 'pending');
    const pending = await cmsRequest<Array<{ id: string; otp_expires_at: string | null }>>(token, `/items/interclinic_consent?${pendingQuery}`);
    const activePending = pending.find((entry) => entry.otp_expires_at && new Date(entry.otp_expires_at).getTime() > now.getTime());
    if (activePending) throw new InterclinicError('A valid authorization code has already been sent for this patient. Use that code or wait for it to expire.', 409);

    const code = createOtp();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const consent = await cmsRequest<{ id: string }>(token, '/items/interclinic_consent', 'POST', {
      global_patient_id: patient.global_patient_id,
      local_patient: patient.id,
      source_branch: sourceBranchId,
      destination_branch: context.branch.id,
      requested_by: context.user.id,
      purpose,
      effect: 'custody_transfer',
      scope: transferScope,
      consent_version: 'interclinic-transfer-v1',
      verification_method: 'email_otp',
      otp_hash: null,
      otp_expires_at: expiresAt,
      otp_attempt_count: 0,
      access_expires_at: null,
      status: 'pending',
    });
    consentId = consent.id;
    await cmsRequest(token, `/items/interclinic_consent/${encodeURIComponent(consent.id)}`, 'PATCH', {
      otp_hash: hashOtp(consent.id, patient.global_patient_id, context.branch.id, code),
    });
    await writeInterclinicAudit(token, {
      event_type: 'request', global_patient_id: patient.global_patient_id,
      patient: patient.id, consent: consent.id, actor_user: context.user.id,
      branch: context.branch.id, details: { scope: transferScope, effect: 'custody_transfer', verification_method: 'email_otp' },
    });
    await sendPatientOtp(patient.email, context.branch.name, code, purpose);

    return NextResponse.json({
      data: { consentId: consent.id, email: maskEmail(patient.email), expiresAt },
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    if (consentId && token) {
      try {
        await cmsRequest(token, `/items/interclinic_consent/${encodeURIComponent(consentId)}`, 'PATCH', {
          status: 'denied', denied_at: new Date().toISOString(), otp_hash: null,
        });
      } catch {
        // Preserve the original error response.
      }
    }
    const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to request patient authorization.', 500);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
