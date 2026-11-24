import { NextRequest, NextResponse } from 'next/server';
import {
  assertSameOrigin,
  bearerToken,
  cmsRequest,
  completeInterclinicShare,
  getRequestContext,
  InterclinicError,
  verifyOtpHash,
  writeInterclinicAudit,
} from '@/lib/interclinicServer';

export const runtime = 'nodejs';

interface ConsentRecord {
  id: string;
  global_patient_id: string;
  local_patient: string | { id: string };
  source_branch: string | { id: string };
  destination_branch: string | { id: string };
  requested_by: string | { id: string };
  status: string;
  otp_hash: string | null;
  otp_expires_at: string | null;
  otp_attempt_count: number | null;
  scope: string[] | null;
  effect: string;
}

function relationId(value: string | { id: string }) {
  return typeof value === 'string' ? value : value.id;
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const token = bearerToken(request);
    const context = await getRequestContext(token);
    const body = await request.json();
    const consentId = String(body.consentId ?? '');
    const code = String(body.code ?? '').trim();
    if (!/^[0-9a-f-]{36}$/i.test(consentId) || !/^\d{6}$/.test(code)) {
      throw new InterclinicError('Enter the six-digit email authorization code.', 400);
    }

    const consent = await cmsRequest<ConsentRecord>(token,
      `/items/interclinic_consent/${encodeURIComponent(consentId)}?fields=id,global_patient_id,local_patient,source_branch,destination_branch,requested_by,status,effect,otp_hash,otp_expires_at,otp_attempt_count,scope`);
    if (consent.status !== 'pending') throw new InterclinicError('This authorization request is no longer pending.', 409);
    if (relationId(consent.destination_branch) !== context.branch.id || relationId(consent.requested_by) !== context.user.id) {
      throw new InterclinicError('This authorization request belongs to another branch or staff account.', 403);
    }
    if (consent.effect !== 'view_only') throw new InterclinicError('This request is not a view-only patient share.', 409);

    const now = new Date();
    const expiresAt = consent.otp_expires_at ? new Date(consent.otp_expires_at) : null;
    if (!expiresAt || expiresAt.getTime() <= now.getTime() || !consent.otp_hash) {
      await cmsRequest(token, `/items/interclinic_consent/${encodeURIComponent(consentId)}`, 'PATCH', {
        status: 'expired', otp_hash: null,
      });
      await writeInterclinicAudit(token, {
        event_type: 'expired', global_patient_id: consent.global_patient_id,
        consent: consent.id, actor_user: context.user.id, branch: context.branch.id,
        details: { reason: 'otp_expired' },
      });
      throw new InterclinicError('This code has expired. Start a new access request.', 410);
    }

    const attempts = consent.otp_attempt_count ?? 0;
    if (attempts >= 5) throw new InterclinicError('Too many code attempts. Start a new access request.', 429);
    const correct = verifyOtpHash(consent.otp_hash, consent.id, consent.global_patient_id, context.branch.id, code);
    if (!correct) {
      const nextAttempts = attempts + 1;
      const locked = nextAttempts >= 5;
      await cmsRequest(token, `/items/interclinic_consent/${encodeURIComponent(consentId)}`, 'PATCH', {
        otp_attempt_count: nextAttempts,
        ...(locked ? { status: 'expired', otp_hash: null } : {}),
      });
      if (locked) await writeInterclinicAudit(token, {
        event_type: 'denial', global_patient_id: consent.global_patient_id,
        consent: consent.id, actor_user: context.user.id, branch: context.branch.id,
        details: { reason: 'otp_attempt_limit' },
      });
      throw new InterclinicError(locked ? 'Too many incorrect codes. Start a new access request.' : 'The authorization code is incorrect.', locked ? 429 : 400);
    }

    const share = await completeInterclinicShare(token, context, consent, now.toISOString(), 'email_otp');
    return NextResponse.json({ data: { status: 'approved', accessExpiresAt: null, custodianBranchId: share.sourceBranchId } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to verify patient authorization.', 500);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
