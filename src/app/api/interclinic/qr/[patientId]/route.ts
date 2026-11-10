import { randomBytes, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  assertSameOrigin,
  bearerToken,
  cmsRequest,
  decryptPatientQrToken,
  encryptPatientQrToken,
  getRequestContext,
  hashPatientQrToken,
  InterclinicError,
  writeInterclinicAudit,
} from '@/lib/interclinicServer';

export const runtime = 'nodejs';

interface AuditEvent {
  id: string;
  details: Record<string, unknown> | string | null;
}

interface PatientRecord {
  id: string;
  global_patient_id: string | null;
  custodian_branch: string | { id: string } | null;
}

function detailsObject(value: AuditEvent['details']) {
  if (typeof value === 'string') {
    try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
  }
  return value ?? {};
}

function branchId(value: PatientRecord['custodian_branch']) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

async function loadQrEvents(token: string, globalPatientId: string) {
  const query = new URLSearchParams({ limit: '500', fields: 'id,details' });
  query.set('filter[global_patient_id][_eq]', globalPatientId);
  query.set('filter[event_type][_eq]', 'qr_credential');
  return cmsRequest<AuditEvent[]>(token, `/items/interclinic_access_audit?${query}`);
}

function currentCredential(events: AuditEvent[]) {
  const entries = events.map((event) => ({ event, details: detailsObject(event.details) }));
  const issued = entries.filter(({ details }) => details.action === 'issued' && typeof details.credential_id === 'string');
  return issued
    .filter(({ details }) => {
      const revokedAt = entries
        .filter((entry) => entry.details.action === 'revoked' && entry.details.credential_id === details.credential_id)
        .map((entry) => String(entry.details.revoked_at ?? ''))
        .sort()
        .at(-1);
      return !revokedAt || revokedAt < String(details.issued_at ?? '');
    })
    .sort((a, b) => String(b.details.issued_at ?? '').localeCompare(String(a.details.issued_at ?? '')))[0] ?? null;
}

type RouteContext = { params: Promise<{ patientId: string }> };

async function getPatientAndEvents(request: NextRequest, patientId: string) {
  assertSameOrigin(request);
  const token = bearerToken(request);
  const context = await getRequestContext(token);
  const patient = await cmsRequest<PatientRecord>(token,
    `/items/patient/${encodeURIComponent(patientId)}?fields=id,global_patient_id,custodian_branch`);
  if (!patient.global_patient_id) throw new InterclinicError('This patient has no global patient ID.', 409);
  if (branchId(patient.custodian_branch) !== context.branch.id) {
    throw new InterclinicError('Only the current custodian branch can generate or revoke this patient QR.', 403);
  }
  const events = await loadQrEvents(token, patient.global_patient_id);
  return { token, context, patient, events };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { patientId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(patientId)) throw new InterclinicError('Select a valid EHR patient record.', 400);
    const { events } = await getPatientAndEvents(request, patientId);
    const current = currentCredential(events);
    if (!current) return NextResponse.json({ data: { active: false } }, { headers: { 'Cache-Control': 'no-store' } });
    const encrypted = String(current.details.encrypted_token ?? '');
    return NextResponse.json({
      data: {
        active: true,
        qrPayload: decryptPatientQrToken(encrypted),
        createdAt: String(current.details.issued_at ?? ''),
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to load the patient QR.', 500);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { patientId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(patientId)) throw new InterclinicError('Select a valid EHR patient record.', 400);
    const { token, context, patient, events } = await getPatientAndEvents(request, patientId);
    const body = await request.json();
    const action = body.action === 'revoke' ? 'revoke' : 'issue';
    const current = currentCredential(events);

    if (action === 'issue' && current) {
      return NextResponse.json({ data: {
        active: true,
        qrPayload: decryptPatientQrToken(String(current.details.encrypted_token ?? '')),
        createdAt: String(current.details.issued_at ?? ''),
      } }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (action === 'revoke') {
      if (!current) return NextResponse.json({ data: { active: false } }, { headers: { 'Cache-Control': 'no-store' } });
      await writeInterclinicAudit(token, {
        event_type: 'qr_credential', global_patient_id: patient.global_patient_id,
        patient: patient.id, actor_user: context.user.id, branch: context.branch.id,
        details: {
          action: 'revoked', credential_id: current.details.credential_id,
          revoked_at: new Date().toISOString(),
        },
      });
      return NextResponse.json({ data: { active: false } }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const credentialId = randomUUID();
    const secret = randomBytes(32).toString('base64url');
    const qrPayload = `TOPLAB-QRP1:${patient.id}:${credentialId}:${secret}`;
    const issuedAt = new Date().toISOString();
    await writeInterclinicAudit(token, {
      event_type: 'qr_credential', global_patient_id: patient.global_patient_id,
      patient: patient.id, actor_user: context.user.id, branch: context.branch.id,
      details: {
        action: 'issued', credential_id: credentialId,
        token_hash: hashPatientQrToken(qrPayload),
        encrypted_token: encryptPatientQrToken(qrPayload),
        issued_at: issuedAt,
        expires_at: null,
      },
    });
    return NextResponse.json({ data: { active: true, qrPayload, createdAt: issuedAt } }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to update the patient QR.', 500);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
