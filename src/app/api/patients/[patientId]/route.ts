import { NextRequest, NextResponse } from 'next/server';
import { assertNotPatientRole, bearerToken, cmsRequest, getRequestContext, InterclinicError } from '@/lib/interclinicServer';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ patientId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const staffToken = bearerToken(request);
    const context = await getRequestContext(staffToken);
    const serviceToken = process.env.LIKHA_PATIENT_SERVICE_TOKEN;
    if (!serviceToken) throw new InterclinicError('Patient account provisioning is not configured on the app server.', 503);
    await assertNotPatientRole(serviceToken, context.user.id);
    const { patientId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(patientId)) throw new InterclinicError('Select a valid patient record.', 400);
    const patient = await cmsRequest<Record<string, unknown> & { custodian_branch: string | { id: string } | null }>(
      serviceToken, `/items/patient/${encodeURIComponent(patientId)}?fields=*,user.avatar`,
    );
    const custodian = typeof patient.custodian_branch === 'string'
      ? patient.custodian_branch : patient.custodian_branch?.id;
    if (custodian !== context.branch.id) throw new InterclinicError('You can only view a patient record owned by your branch.', 403);
    return NextResponse.json({ data: patient }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (cause) {
    const error = cause instanceof InterclinicError ? cause : new InterclinicError('Unable to load patient details.', 500);
    return NextResponse.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
  }
}
