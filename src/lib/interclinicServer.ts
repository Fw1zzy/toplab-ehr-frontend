import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import nodemailer from 'nodemailer';

const cmsBaseUrl = (process.env.LIKHA_CMS_URL || 'https://ehr.zyberlab.com').replace(/\/$/, '');

export class InterclinicError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function bearerToken(request: Request) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) throw new InterclinicError('Sign in to request patient access.', 401);
  return header.slice('Bearer '.length);
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    throw new InterclinicError('Cross-origin request rejected.', 403);
  }
}

export async function cmsRequest<T = Record<string, unknown>>(token: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${cmsBaseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'curl/8.5.0',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.errors?.[0]?.message ?? `EHR request failed (${response.status}).`;
    throw new InterclinicError(message, response.status);
  }
  return payload.data as T;
}

export async function getRequestContext(token: string) {
  const code = (process.env.LIKHA_BRANCH_CODE || process.env.NEXT_PUBLIC_LIKHA_BRANCH_CODE || 'baguio').trim().toLowerCase();
  const params = new URLSearchParams({ limit: '1', fields: 'id,code,name' });
  params.set('filter[code][_eq]', code);
  const [user, branches] = await Promise.all([
    cmsRequest<{ id: string; email?: string }>(token, '/users/me?fields=id,email'),
    cmsRequest<Array<{ id: string; code: string; name: string }>>(token, `/items/branch?${params}`),
  ]);
  const branch = branches[0];
  if (!branch) throw new InterclinicError(`No EHR branch is configured for "${code}".`, 503);
  return { user, branch };
}

export async function assertNotPatientRole(serviceToken: string, userId: string) {
  const account = await cmsRequest<{ role: string | { name?: string } | null }>(
    serviceToken, `/users/${encodeURIComponent(userId)}?fields=role.name`,
  );
  const roleName = typeof account.role === 'object' && account.role
    ? account.role.name?.trim().toLowerCase()
    : account.role?.trim().toLowerCase();
  if (!roleName) throw new InterclinicError('Unable to verify the EHR account role.', 503);
  if (roleName === 'patient') throw new InterclinicError('Patient accounts cannot access staff patient-record operations.', 403);
}

export function createEmailTransport() {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'INTERCLINIC_OTP_SECRET'] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new InterclinicError(`Interclinic email is not configured on the app server (missing ${missing.join(', ')}).`, 503);
  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port <= 0) throw new InterclinicError('SMTP_PORT must be a valid port number.', 503);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
}

export async function sendPatientOtp(email: string, branchName: string, code: string, purpose: string) {
  const transport = createEmailTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Patient-record sharing authorization code',
    text: `A request was made to share your EHR patient profile with ${branchName} for: ${purpose}. If approved, your profile stays with its current home branch and authorized staff at both branches can view and update your patient profile until you revoke access. Other clinical records continue to follow their own permissions.\n\nYour one-time authorization code is ${code}. It expires in 10 minutes. If you did not request this sharing, ignore this email and contact your clinic. Do not share this code with anyone.`,
    html: `<p>A request was made to share your EHR patient profile with <strong>${escapeHtml(branchName)}</strong>.</p><p>Purpose: ${escapeHtml(purpose)}</p><p>If approved, your profile stays with its current home branch and authorized staff at both branches can view and update your patient profile until you revoke access. Other clinical records continue to follow their own permissions.</p><p>Your one-time authorization code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${code}</p><p>This code expires in 10 minutes. If you did not request this sharing, ignore this email and contact your clinic. Do not share this code with anyone.</p>`,
  });
}

export function createOtp() {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function hashOtp(consentId: string, globalPatientId: string, destinationBranchId: string, code: string) {
  const secret = process.env.INTERCLINIC_OTP_SECRET;
  if (!secret || secret.length < 32) throw new InterclinicError('INTERCLINIC_OTP_SECRET must be at least 32 characters.', 503);
  return createHmac('sha256', secret).update(`${consentId}:${globalPatientId}:${destinationBranchId}:${code}`).digest('hex');
}

export function verifyOtpHash(expected: string, consentId: string, globalPatientId: string, destinationBranchId: string, code: string) {
  const actual = Buffer.from(hashOtp(consentId, globalPatientId, destinationBranchId, code), 'hex');
  const stored = Buffer.from(expected, 'hex');
  return actual.length === stored.length && timingSafeEqual(actual, stored);
}

export function maskEmail(email: string) {
  const [name = '', domain = ''] = email.split('@');
  return `${name.slice(0, 1)}${name.length > 1 ? '***' : ''}@${domain}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character);
}

export async function writeInterclinicAudit(token: string, data: Record<string, unknown>) {
  return cmsRequest(token, '/items/interclinic_access_audit', 'POST', data);
}

function qrEncryptionKey() {
  const secret = process.env.INTERCLINIC_OTP_SECRET;
  if (!secret || secret.length < 32) throw new InterclinicError('INTERCLINIC_OTP_SECRET must be at least 32 characters.', 503);
  return createHmac('sha256', secret).update('toplab-patient-qr-encryption').digest();
}

export function hashPatientQrToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function secureHashEquals(left: string, right: string) {
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

export function encryptPatientQrToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', qrEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptPatientQrToken(value: string) {
  const [ivPart, tagPart, ciphertextPart] = value.split('.');
  if (!ivPart || !tagPart || !ciphertextPart) throw new InterclinicError('Stored patient QR is invalid. Revoke and generate a new one.', 500);
  try {
    const decipher = createDecipheriv('aes-256-gcm', qrEncryptionKey(), Buffer.from(ivPart, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextPart, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new InterclinicError('Stored patient QR cannot be decrypted. Revoke and generate a new one.', 500);
  }
}

export async function completeInterclinicShare(
  token: string,
  context: Awaited<ReturnType<typeof getRequestContext>>,
  consent: { id: string; global_patient_id: string; local_patient: string | { id: string }; source_branch: string | { id: string }; destination_branch: string | { id: string }; scope?: string[] | null },
  approvedAt: string,
  verificationMethod: 'email_otp' | 'patient_qr',
) {
  const patientId = typeof consent.local_patient === 'string' ? consent.local_patient : consent.local_patient.id;
  const sourceBranchId = typeof consent.source_branch === 'string' ? consent.source_branch : consent.source_branch.id;
  const destinationBranchId = typeof consent.destination_branch === 'string' ? consent.destination_branch : consent.destination_branch.id;
  if (destinationBranchId !== context.branch.id || sourceBranchId === destinationBranchId) {
    throw new InterclinicError('This access grant does not match the current destination branch.', 403);
  }

  const patient = await cmsRequest<{
    id: string;
    global_patient_id: string | null;
    custodian_branch: string | { id: string } | null;
  }>(token, `/items/patient/${encodeURIComponent(patientId)}?fields=id,global_patient_id,custodian_branch`);
  if (patient.global_patient_id !== consent.global_patient_id) throw new InterclinicError('The patient identity no longer matches this access request.', 409);
  const currentCustodianId = patient.custodian_branch
    ? typeof patient.custodian_branch === 'string' ? patient.custodian_branch : patient.custodian_branch.id
    : null;
  if (currentCustodianId !== sourceBranchId) {
    throw new InterclinicError('The patient’s custodian changed after this access request was started. Request access again from the current custodian.', 409);
  }

  const approvalQuery = new URLSearchParams({ limit: '1', fields: 'id' });
  approvalQuery.set('filter[consent][_eq]', consent.id);
  approvalQuery.set('filter[event_type][_eq]', 'approval');
  const existingApproval = await cmsRequest<Array<{ id: string }>>(token, `/items/interclinic_access_audit?${approvalQuery}`);
  if (!existingApproval.length) await writeInterclinicAudit(token, {
    event_type: 'approval', global_patient_id: consent.global_patient_id,
    patient: patientId, consent: consent.id, actor_user: context.user.id,
    branch: destinationBranchId,
    details: {
      action: 'share_granted', effect: 'view_only', source_branch: sourceBranchId,
      destination_branch: destinationBranchId,
      scope: consent.scope ?? ['patient', 'encounter', 'laboratory', 'invoice'],
      verification_method: verificationMethod,
    },
  });

  await cmsRequest(token, `/items/interclinic_consent/${encodeURIComponent(consent.id)}`, 'PATCH', {
    status: 'approved', effect: 'view_only',
    verified_at: approvedAt, approved_at: approvedAt,
    access_expires_at: null,
    otp_hash: null, otp_expires_at: null,
  });

  return { patientId, sourceBranchId, destinationBranchId };
}

export async function hasActiveInterclinicShare(
  token: string,
  globalPatientId: string,
  branchId: string,
  requiredScope: string,
) {
  const query = new URLSearchParams({ limit: '100', fields: 'scope,access_expires_at' });
  query.set('filter[global_patient_id][_eq]', globalPatientId);
  query.set('filter[destination_branch][_eq]', branchId);
  query.set('filter[effect][_eq]', 'view_only');
  query.set('filter[status][_eq]', 'approved');
  const grants = await cmsRequest<Array<{ scope: string[] | null; access_expires_at: string | null }>>(token, `/items/interclinic_consent?${query}`);
  return grants.some((grant) => {
    const unexpired = !grant.access_expires_at || new Date(grant.access_expires_at).getTime() > Date.now();
    return unexpired && Array.isArray(grant.scope) && grant.scope.includes(requiredScope);
  });
}
