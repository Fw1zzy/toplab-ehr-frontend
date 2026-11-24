import { NextRequest, NextResponse } from 'next/server';
import { assertNotPatientRole, bearerToken, cmsRequest, getRequestContext, hasActiveInterclinicShare, InterclinicError } from '@/lib/interclinicServer';

export const runtime = 'nodejs';
const cmsBaseUrl = (process.env.LIKHA_CMS_URL || 'https://ehr.zyberlab.com').replace(/\/$/, '');

type RouteContext = { params: Promise<{ fileId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const staffToken = bearerToken(request);
    const context = await getRequestContext(staffToken);
    const serviceToken = process.env.LIKHA_PATIENT_SERVICE_TOKEN;
    if (!serviceToken) throw new InterclinicError('Patient account provisioning is not configured on the app server.', 503);
    await assertNotPatientRole(serviceToken, context.user.id);
    const { fileId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(fileId)) throw new InterclinicError('Select a valid patient avatar.', 400);

    const userQuery = new URLSearchParams({ limit: '100', fields: 'id' });
    userQuery.set('filter[avatar][_eq]', fileId);
    const users = await cmsRequest<Array<{ id: string }>>(serviceToken, `/users?${userQuery}`);
    const patientChecks = await Promise.all(users.map(async (user) => {
      const patientQuery = new URLSearchParams({ limit: '5', fields: 'id,global_patient_id,custodian_branch' });
      patientQuery.set('filter[user][_eq]', user.id);
      const patients = await cmsRequest<Array<{
        id: string;
        global_patient_id: string | null;
        custodian_branch: string | { id: string } | null;
      }>>(serviceToken, `/items/patient?${patientQuery}`);
      const accessChecks = await Promise.all(patients.map(async (patient) => {
        const custodianId = typeof patient.custodian_branch === 'string' ? patient.custodian_branch : patient.custodian_branch?.id;
        if (custodianId === context.branch.id) return true;
        if (!patient.global_patient_id) return false;
        return hasActiveInterclinicShare(serviceToken, patient.global_patient_id, context.branch.id, 'patient');
      }));
      return accessChecks.some(Boolean);
    }));
    if (!patientChecks.some(Boolean)) throw new InterclinicError('This avatar is not attached to a patient owned by your branch.', 403);

    const upstream = await fetch(`${cmsBaseUrl}/assets/${encodeURIComponent(fileId)}`, {
      headers: { Authorization: `Bearer ${serviceToken}` }, cache: 'no-store',
    });
    if (!upstream.ok || !upstream.body) throw new InterclinicError('Unable to load the stored patient photo.', upstream.status || 502);
    return new NextResponse(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (cause) {
    const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to load this patient avatar.', 500);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
