import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { assertNotPatientRole, bearerToken, cmsRequest, getRequestContext, InterclinicError } from '@/lib/interclinicServer';

export const runtime = 'nodejs';

const cmsBaseUrl = (process.env.LIKHA_CMS_URL || 'https://ehr.zyberlab.com').replace(/\/$/, '');

interface UserRecord {
  id: string;
  email: string;
  role: string | { id: string };
  avatar?: string | { id: string } | null;
  first_name?: string | null;
  last_name?: string | null;
}

function relationId(value: string | { id: string } | null | undefined) {
  return typeof value === 'string' ? value : value?.id ?? null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

const civilStatusValues: Record<string, string> = {
  single: 'Single',
  married: 'Married',
  widowed: 'Widow/Widower',
  'widow/widower': 'Widow/Widower',
  separated: 'Separated',
};

function patientFields(source: Record<string, unknown>) {
  const civilStatus = stringValue(source.civil_status);
  const normalizedCivilStatus = civilStatusValues[civilStatus.toLowerCase()];
  if (civilStatus && !normalizedCivilStatus) throw new InterclinicError('Choose a valid patient civil status.', 400);
  return {
    first_name: stringValue(source.first_name),
    middle_name: stringValue(source.middle_name) || null,
    last_name: stringValue(source.last_name),
    suffixes: stringValue(source.suffix) || null,
    date_of_birth: stringValue(source.date_of_birth) || null,
    sex: stringValue(source.sex) || null,
    civil_status: normalizedCivilStatus ?? null,
    address: stringValue(source.address) || null,
    mobile_number: stringValue(source.contact_number) || null,
    email: stringValue(source.email).toLowerCase(),
    company: stringValue(source.company_id) || null,
    valid_id_presented: stringValue(source.valid_id_presented) || null,
    valid_id_number: stringValue(source.valid_id_number) || null,
  };
}

function validatePhoto(file: File) {
  if (file.size > 8 * 1024 * 1024) throw new InterclinicError('Patient photos must be 8 MB or smaller.', 413);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new InterclinicError('Upload a JPEG, PNG, or WebP patient photo.', 415);
  }
}

async function uploadAvatar(token: string, photo: File, title: string) {
  validatePhoto(photo);
  const bytes = new Uint8Array(await photo.arrayBuffer());
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes[0] === 0x89 && String.fromCharCode(...bytes.slice(1, 4)) === 'PNG';
  const isWebp = String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!isJpeg && !isPng && !isWebp) throw new InterclinicError('The uploaded file is not a valid JPEG, PNG, or WebP image.', 415);
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: photo.type }), photo.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
  form.append('title', `${title} patient avatar`);
  const response = await fetch(`${cmsBaseUrl}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new InterclinicError(payload.errors?.[0]?.message ?? 'Unable to upload patient avatar to the EHR.', response.status);
  return String(payload.data.id) as string;
}

async function patientRoleId(token: string) {
  const roles = await cmsRequest<Array<{ id: string; name: string }>>(token, '/roles?limit=200&fields=id,name');
  const patientRole = roles.find((role) => role.name.trim().toLowerCase() === 'patient');
  if (!patientRole) throw new InterclinicError('The EHR has no role named "Patient". Create that role before adding patient accounts.', 503);
  return patientRole.id;
}

async function userForEmail(token: string, email: string) {
  const query = new URLSearchParams({ limit: '1', fields: 'id,email,first_name,last_name,role,avatar' });
  query.set('filter[email][_eq]', email);
  const users = await cmsRequest<UserRecord[]>(token, `/users?${query}`);
  return users[0] ?? null;
}

async function patientsForUser(token: string, userId: string) {
  const query = new URLSearchParams({ limit: '50', fields: 'id' });
  query.set('filter[user][_eq]', userId);
  return cmsRequest<Array<{ id: string }>>(token, `/items/patient?${query}`);
}

async function deleteFile(token: string, fileId: string | null) {
  if (!fileId) return;
  try { await cmsRequest(token, `/files/${encodeURIComponent(fileId)}`, 'DELETE'); } catch { /* Best-effort cleanup. */ }
}

async function deleteUser(token: string, userId: string | null) {
  if (!userId) return;
  try { await cmsRequest(token, `/users/${encodeURIComponent(userId)}`, 'DELETE'); } catch { /* Best-effort cleanup. */ }
}

export async function POST(request: NextRequest) {
  let serviceToken = '';
  let createdFileId: string | null = null;
  let createdUserId: string | null = null;
  let canDeleteCreatedFile = true;
  let patientSaved = false;
  try {
    const staffToken = bearerToken(request);
    const context = await getRequestContext(staffToken);
    serviceToken = process.env.LIKHA_PATIENT_SERVICE_TOKEN ?? '';
    if (!serviceToken) throw new InterclinicError('Patient account provisioning is not configured on the app server.', 503);
    await assertNotPatientRole(serviceToken, context.user.id);

    const form = await request.formData();
    const dataValue = form.get('patient');
    if (typeof dataValue !== 'string') throw new InterclinicError('Patient details are required.', 400);
    let source: Record<string, unknown>;
    try { source = JSON.parse(dataValue) as Record<string, unknown>; }
    catch { throw new InterclinicError('Patient details are invalid.', 400); }
    const fields = patientFields(source);
    if (!fields.first_name || !fields.last_name) throw new InterclinicError('Patient first and last names are required.', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) throw new InterclinicError('A valid email is required to create a patient EHR user.', 400);

    const photoValue = form.get('photo');
    const photo = photoValue instanceof File && photoValue.size > 0 ? photoValue : null;
    if (photo) validatePhoto(photo);

    const roleId = await patientRoleId(serviceToken);
    const existingUser = await userForEmail(serviceToken, fields.email);
    const patientId = stringValue(source.id);
    let currentUserId: string | null = null;
    let oldUser: UserRecord | null = null;
    let userToSuspendId: string | null = null;

    if (patientId) {
      const patient = await cmsRequest<{
        id: string;
        user: string | { id: string } | null;
        custodian_branch: string | { id: string } | null;
      }>(serviceToken, `/items/patient/${encodeURIComponent(patientId)}?fields=id,user,custodian_branch`);
      if (relationId(patient.custodian_branch) !== context.branch.id) throw new InterclinicError('You can only update a patient owned by your branch.', 403);
      currentUserId = relationId(patient.user);
      if (currentUserId) {
        const linkedUser = await cmsRequest<UserRecord>(serviceToken, `/users/${encodeURIComponent(currentUserId)}?fields=id,email,first_name,last_name,role,avatar`);
        if (relationId(linkedUser.role) !== roleId) throw new InterclinicError('This patient is linked to a non-patient EHR account. Contact an administrator before changing it.', 409);
        oldUser = linkedUser;
        if (existingUser && existingUser.id !== currentUserId) {
          if (relationId(existingUser.role) !== roleId) throw new InterclinicError('This email belongs to a non-patient EHR account. No account was changed.', 409);
          const linkedPatients = await patientsForUser(serviceToken, existingUser.id);
          if (linkedPatients.some((linked) => linked.id !== patientId)) {
            throw new InterclinicError('This email is already linked to another patient record. No account was changed.', 409);
          }
          userToSuspendId = currentUserId;
          currentUserId = existingUser.id;
          oldUser = existingUser;
        }
      }
    }

    if (!currentUserId && existingUser) {
      if (relationId(existingUser.role) !== roleId) {
        throw new InterclinicError('This email belongs to a non-patient EHR account. No account was changed.', 409);
      }
      const linkedPatients = await patientsForUser(serviceToken, existingUser.id);
      if (linkedPatients.some((linked) => linked.id !== patientId)) {
        throw new InterclinicError('This email is already linked to another patient record. No account was changed.', 409);
      }
      currentUserId = existingUser.id;
      oldUser = existingUser;
    }

    if (photo) createdFileId = await uploadAvatar(serviceToken, photo, `${fields.first_name} ${fields.last_name}`);
    let userId = currentUserId;
    let existingUserUpdated = false;
    if (userId) {
      const userPatch: Record<string, unknown> = {
        email: fields.email,
        first_name: fields.first_name,
        last_name: fields.last_name,
      };
      if (createdFileId) userPatch.avatar = createdFileId;
      await cmsRequest(serviceToken, `/users/${encodeURIComponent(userId)}`, 'PATCH', userPatch);
      existingUserUpdated = Boolean(currentUserId);
      if (existingUserUpdated && createdFileId) canDeleteCreatedFile = false;
    } else {
      const user = await cmsRequest<{ id: string }>(serviceToken, '/users', 'POST', {
        email: fields.email,
        first_name: fields.first_name,
        last_name: fields.last_name,
        role: roleId,
        avatar: createdFileId,
        password: randomBytes(48).toString('base64url'),
        status: 'active',
      });
      userId = user.id;
      createdUserId = user.id;
    }

    const patientData = patientId
      ? { ...fields, user: userId }
      : {
          ...fields,
          user: userId,
          global_patient_id: globalThis.crypto.randomUUID(),
          origin_branch: context.branch.id,
          custodian_branch: context.branch.id,
          custody_state: 'active',
        };
    try {
      if (patientId) {
        await cmsRequest(serviceToken, `/items/patient/${encodeURIComponent(patientId)}`, 'PATCH', patientData);
      } else {
        const newPatient = await cmsRequest<{ id: string }>(serviceToken, '/items/patient', 'POST', patientData);
        source.id = newPatient.id;
      }
      patientSaved = true;
      if (userToSuspendId) {
        try {
          await cmsRequest(serviceToken, `/users/${encodeURIComponent(userToSuspendId)}`, 'PATCH', { status: 'suspended' });
        } catch {
          // The patient is linked to the selected Patient-role account; old-account cleanup is best-effort.
        }
      }
    } catch (cause) {
      if (existingUserUpdated && currentUserId && oldUser) {
        try {
          await cmsRequest(serviceToken, `/users/${encodeURIComponent(currentUserId)}`, 'PATCH', {
            email: oldUser.email,
            first_name: oldUser.first_name,
            last_name: oldUser.last_name,
            avatar: relationId(oldUser.avatar),
          });
          canDeleteCreatedFile = true;
        } catch {
          // Keep the uploaded file in place if rollback cannot confirm its references.
          createdFileId = null;
        }
      }
      throw cause;
    }

    const savedPatientId = patientId || String(source.id);
    let savedPatient: Record<string, unknown>;
    try {
      savedPatient = await cmsRequest<Record<string, unknown>>(serviceToken,
        `/items/patient/${encodeURIComponent(savedPatientId)}?fields=*,user.avatar`);
    } catch {
      savedPatient = { id: savedPatientId, ...patientData, user: { id: userId, avatar: createdFileId } };
    }
    return NextResponse.json({ data: savedPatient }, { status: patientId ? 200 : 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    if (serviceToken) {
      if (!patientSaved) {
        await deleteUser(serviceToken, createdUserId);
        if (canDeleteCreatedFile) await deleteFile(serviceToken, createdFileId);
      }
    }
    const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to save patient and EHR account.', 500);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
