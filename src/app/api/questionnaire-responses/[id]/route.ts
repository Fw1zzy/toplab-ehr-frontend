import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin, cmsRequest, InterclinicError } from '@/lib/interclinicServer';
import { assertQuestionnairePatient, mapQuestionnaire, questionnaireAnswers, questionnaireContext, questionnaireError, questionnaireSchema, questionnaireScope, responseFields } from '@/lib/questionnaireServer';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const context = await questionnaireContext(request);
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new InterclinicError('Invalid questionnaire response.', 400);
    const schema = await questionnaireSchema(context.service);
    const query = new URLSearchParams({ limit: '1', fields: responseFields(schema),
      filter: JSON.stringify({ _and: [{ id: { _eq: id } }, questionnaireScope(context.branch.id)] }) });
    const rows = await cmsRequest<Array<Record<string, unknown>>>(context.token, `/items/questionnaire_response?${query}`);
    if (!rows[0]) throw new InterclinicError('This questionnaire response was not found or is not accessible to your branch.', 404);
    return NextResponse.json({ data: mapQuestionnaire(rows[0], schema) }, { headers });
  } catch (cause) {
    const error = questionnaireError(cause);
    return NextResponse.json({ error: error.error }, { status: error.status, headers });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const context = await questionnaireContext(request);
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new InterclinicError('Invalid questionnaire response.', 400);
    const query = new URLSearchParams({ limit: '1', fields: 'id,patient',
      filter: JSON.stringify({ _and: [{ id: { _eq: id } }, questionnaireScope(context.branch.id)] }) });
    const rows = await cmsRequest<Array<{ id: string; patient: string | { id: string } }>>(context.token, `/items/questionnaire_response?${query}`);
    if (!rows[0]) throw new InterclinicError('This questionnaire response was not found or is not accessible to your branch.', 404);
    const patientId = typeof rows[0].patient === 'string' ? rows[0].patient : rows[0].patient.id;
    await assertQuestionnairePatient(context.token, context.branch.id, patientId);
    const body = await request.json();
    if (body.patientId && body.patientId !== patientId) throw new InterclinicError('An existing response cannot be reassigned to another patient.', 400);
    const schema = await questionnaireSchema(context.service);
    const values = questionnaireAnswers(body.values, schema, false);
    if (!Object.keys(values).length) throw new InterclinicError('No questionnaire changes were supplied.', 400);
    await cmsRequest(context.token, `/items/questionnaire_response/${encodeURIComponent(id)}?fields=id`, 'PATCH', values);
    return NextResponse.json({ data: { id } }, { headers });
  } catch (cause) {
    const error = questionnaireError(cause);
    return NextResponse.json({ error: error.error }, { status: error.status, headers });
  }
}
