import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin, cmsRequest, InterclinicError } from '@/lib/interclinicServer';
import { assertQuestionnairePatient, mapQuestionnaire, questionnaireAnswers, questionnaireContext, questionnaireError, questionnaireSchema, questionnaireScope } from '@/lib/questionnaireServer';

export const runtime = 'nodejs';
const headers = { 'Cache-Control': 'private, no-store' };

export async function GET(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const context = await questionnaireContext(request);
    const params = request.nextUrl.searchParams;
    if (params.get('view') === 'schema') {
      return NextResponse.json({ data: await questionnaireSchema(context.service) }, { headers });
    }
    const search = (params.get('search') ?? '').trim().slice(0, 200);
    const terms = search.split(/[\s,]+/).filter(Boolean);
    const patientSearch = terms.map((term) => ({ _or: [
      { first_name: { _icontains: term } }, { last_name: { _icontains: term } },
    ] }));
    if (params.get('view') === 'patients') {
      const query = new URLSearchParams({ fields: 'id,first_name,last_name', limit: '25', sort: 'last_name,first_name,id',
        filter: JSON.stringify({ _and: [{ custodian_branch: { _eq: context.branch.id } }, ...patientSearch] }) });
      const patients = await cmsRequest(context.token, `/items/patient?${query}`);
      return NextResponse.json({ data: patients }, { headers });
    }

    const page = Math.max(1, Math.floor(Number(params.get('page')) || 1));
    const limit = Math.min(50, Math.max(1, Math.floor(Number(params.get('limit')) || 10)));
    const status = params.get('status');
    if (status && !['draft', 'published', 'archived'].includes(status)) throw new InterclinicError('Invalid questionnaire status.', 400);
    const filter = { _and: [questionnaireScope(context.branch.id),
      ...(status ? [{ status: { _eq: status } }] : [{ status: { _neq: 'archived' } }]),
      ...patientSearch.map((searchFilter) => ({ patient: searchFilter })),
    ] };
    const query = new URLSearchParams({
      fields: 'id,patient.id,patient.first_name,patient.last_name,status,is_finalized,date_created,date_updated,submitted_at',
      sort: '-date_created,id', limit: String(limit), offset: String((page - 1) * limit), filter: JSON.stringify(filter),
    });
    const countQuery = new URLSearchParams({ filter: JSON.stringify(filter), aggregate: JSON.stringify({ count: ['id'] }) });
    const [rows, count] = await Promise.all([
      cmsRequest<Array<Record<string, unknown>>>(context.token, `/items/questionnaire_response?${query}`),
      cmsRequest<Array<{ count: { id: string } }>>(context.token, `/items/questionnaire_response?${countQuery}`),
    ]);
    return NextResponse.json({ data: rows.map((row) => mapQuestionnaire(row)), total: Number(count[0]?.count.id ?? 0) }, { headers });
  } catch (cause) {
    const error = questionnaireError(cause);
    return NextResponse.json({ error: error.error }, { status: error.status, headers });
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const context = await questionnaireContext(request);
    const body = await request.json();
    const patientId = String(body.patientId ?? '');
    await assertQuestionnairePatient(context.token, context.branch.id, patientId);
    const schema = await questionnaireSchema(context.service);
    const values = questionnaireAnswers({ status: 'draft', ...body.values }, schema, true);
    const created = await cmsRequest<{ id: string }>(context.token, '/items/questionnaire_response?fields=id', 'POST', {
      ...values, patient: patientId, submitted_at: new Date().toISOString().slice(0, -1),
    });
    return NextResponse.json({ data: { id: created.id } }, { status: 201, headers });
  } catch (cause) {
    const error = questionnaireError(cause);
    return NextResponse.json({ error: error.error }, { status: error.status, headers });
  }
}
