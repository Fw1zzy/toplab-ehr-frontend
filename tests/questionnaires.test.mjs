import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { registerHooks } from 'node:module';
import ts from 'typescript';

const root = new URL('../src/', import.meta.url);
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'next/server') return { url: 'mock:next', shortCircuit: true };
    if (specifier === '@/lib/interclinicServer') return { url: 'mock:ehr', shortCircuit: true };
    if (specifier === '@/lib/api/likha') return { url: 'mock:auth', shortCircuit: true };
    if (specifier.startsWith('@/')) return { url: new URL(`${specifier.slice(2)}.ts`, root).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === 'mock:next') return { format: 'module', shortCircuit: true, source: 'export const NextResponse = Response;' };
    if (url === 'mock:auth') return { format: 'module', shortCircuit: true, source: "export const likhaAuth = { getAccessToken: async () => 'staff-token' };" };
    if (url === 'mock:ehr') return { format: 'module', shortCircuit: true, source: `
      export class InterclinicError extends Error { constructor(message,status) { super(message); this.status=status; } }
      export function bearerToken(request) { if(!request.headers.get('authorization')) throw new InterclinicError('Unauthorized',401); return 'staff-token'; }
      export function assertSameOrigin() {}
      export async function getRequestContext() { return { user:{id:'u1'},branch:{id:'b1'} }; }
      export async function assertNotPatientRole() { if(globalThis.patientRole) throw new InterclinicError('Staff only',403); }
      export async function cmsRequest(...args) { return globalThis.fakeEhr(...args); }
    ` };
    const loaded = next(url, context);
    if (!url.endsWith('.ts')) return loaded;
    return { ...loaded, format: 'module', source: ts.transpileModule(String(loaded.source), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText };
  },
});

const { validateQuestionnaireValues } = await import('../src/lib/questionnaireModel.ts');
const { questionnaireSchema } = await import('../src/lib/questionnaireServer.ts');
const listRoute = await import('../src/app/api/questionnaire-responses/route.ts');
const detailRoute = await import('../src/app/api/questionnaire-responses/[id]/route.ts');
const { questionnaireResponses } = await import('../src/lib/api/questionnaires.ts');
const localPatient = '11111111-1111-4111-8111-111111111111';
const foreignPatient = '22222222-2222-4222-8222-222222222222';
const responseId = '33333333-3333-4333-8333-333333333333';
const otherId = '44444444-4444-4444-8444-444444444444';
let writes;
let metadata;
let responses;

function matches(row, filter) {
  return Object.entries(filter ?? {}).every(([key, condition]) => {
    if (key === '_and') return condition.every((part) => matches(row, part));
    if (key === '_or') return condition.some((part) => matches(row, part));
    return Object.entries(condition).every(([operator, value]) => {
      const field = row?.[key];
      if (operator === '_eq') return (typeof field === 'object' ? field?.id : field) === value;
      if (operator === '_neq') return field !== value;
      if (operator === '_icontains') return String(field ?? '').toLowerCase().includes(value.toLowerCase());
      return matches(field, { [operator]: value });
    });
  });
}

function request(method, params = '', body) {
  const req = new Request(`https://app.test/api/questionnaire-responses${params}`, {
    method, headers: { Authorization: 'Bearer staff-token', 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  req.nextUrl = new URL(req.url);
  return req;
}

beforeEach(() => {
  process.env.LIKHA_PATIENT_SERVICE_TOKEN = 'metadata-token';
  globalThis.patientRole = false;
  writes = [];
  metadata = [
    { field: 'status', type: 'string', schema: { is_nullable: false }, meta: { sort: 1, interface: 'select-dropdown', options: { choices: [{ text: '$t:draft', value: 'draft' }, { text: '$t:published', value: 'published' }] } } },
    { field: 'skin_disease', type: 'string', schema: {}, meta: { group: 'medical_history', interface: 'select-radio', options: { choices: [{ text: 'yes', value: 'yes' }, { text: 'no', value: 'no' }] } } },
    { field: 'height_feet', type: 'integer', schema: {}, meta: { group: 'physical_examination', interface: 'input' } },
    { field: 'heart_disease', type: 'json', schema: {}, meta: { group: 'family_history', interface: 'select-multiple-checkbox', options: { choices: [{ text: 'Father Side', value: 'father_side' }] } } },
    { field: 'BMI', type: 'string', schema: {}, meta: { group: 'physical_examination', readonly: true, interface: 'input' } },
    { field: 'user_created', type: 'uuid', schema: {}, meta: { hidden: true } },
    { field: 'physical_examination', type: 'alias', schema: null, meta: {} },
    { field: 'submitted_at', type: 'dateTime', schema: { is_nullable: true }, meta: { interface: 'datetime', readonly: false } },
  ];
  const patients = [{ id: localPatient, first_name: 'Ada', last_name: 'Local', custodian_branch: 'b1' }, { id: foreignPatient, first_name: 'Bea', last_name: 'Other', custodian_branch: 'b2' }];
  responses = [{ id: responseId, patient: patients[0], status: 'draft', skin_disease: 'no', submitted_at: '2026-01-01T10:00:00' }, { id: otherId, patient: patients[1], status: 'published' }];
  globalThis.fakeEhr = async (token, path, method = 'GET', body) => {
    if (path === '/fields/questionnaire_response') { assert.equal(token, 'metadata-token'); return metadata; }
    assert.equal(token, 'staff-token', 'clinical data must not use the metadata service token');
    const url = new URL(path, 'https://ehr.test');
    if (method !== 'GET') {
      writes.push({ path: url.pathname, method, body });
      return { id: responseId };
    }
    const filter = JSON.parse(url.searchParams.get('filter') ?? '{}');
    if (url.pathname === '/items/patient') return patients.filter((row) => matches(row, filter));
    const rows = responses.filter((row) => matches(row, filter));
    if (url.searchParams.has('aggregate')) return [{ count: { id: String(rows.length) } }];
    return rows;
  };
  globalThis.fetch = async (path) => {
    const url = new URL(path, 'https://app.test');
    return listRoute.GET(request('GET', url.search));
  };
});

test('schema follows EHR groups/choice values, excludes aliases and audit controls', async () => {
  const schema = await questionnaireSchema('metadata-token');
  assert.equal(schema.fields.find((field) => field.name === 'status').choices[0].label, 'Draft');
  assert.ok(schema.fields.some((field) => field.name === 'BMI' && field.readonly));
  assert.ok(!schema.fields.some((field) => field.name === 'user_created' || field.name === 'physical_examination'));
  assert.ok(schema.fields.find((field) => field.name === 'submitted_at').readonly);
});

test('validation rejects read-only fields, invalid choices, and fractional integers', async () => {
  const { fields } = await questionnaireSchema('metadata-token');
  assert.throws(() => validateQuestionnaireValues({ BMI: '24' }, fields, false));
  assert.throws(() => validateQuestionnaireValues({ submitted_at: '2000-01-01T00:00:00' }, fields, false));
  assert.throws(() => validateQuestionnaireValues({ height_feet: '5.5' }, fields, false));
  assert.throws(() => validateQuestionnaireValues({ skin_disease: 'maybe' }, fields, false));
  assert.throws(() => validateQuestionnaireValues({ heart_disease: ['not_allowed'] }, fields, false));
  assert.throws(() => validateQuestionnaireValues({}, fields, true));
  assert.deepEqual(validateQuestionnaireValues({ status: 'draft', skin_disease: null, height_feet: '5', heart_disease: ['father_side'] }, fields, true), {
    status: 'draft', skin_disease: null, height_feet: 5, heart_disease: ['father_side'],
  });
});

test('listing and count are restricted to branch ownership', async () => {
  const res = await listRoute.GET(request('GET'));
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.total, 1);
  assert.deepEqual(json.data.map((row) => row.id), [responseId]);
});

test('create uses EHR field keys and defaults draft without system flags', async () => {
  const res = await listRoute.POST(request('POST', '', { patientId: localPatient, values: { skin_disease: 'yes' } }));
  assert.equal(res.status, 201);
  const { submitted_at: submittedAt, ...answers } = writes[0].body;
  assert.deepEqual(answers, { status: 'draft', skin_disease: 'yes', patient: localPatient });
  assert.ok(Math.abs(Date.now() - Date.parse(`${submittedAt}Z`)) < 5000);
});

test('foreign-patient create and foreign response update are denied', async () => {
  const create = await listRoute.POST(request('POST', '', { patientId: foreignPatient, values: {} }));
  assert.equal(create.status, 403);
  const update = await detailRoute.PATCH(request('PATCH', '', { values: { skin_disease: 'yes' } }), { params: Promise.resolve({ id: otherId }) });
  assert.equal(update.status, 404);
  assert.equal(writes.length, 0);
});

test('editing preserves unmodified answers and rejects patient reassignment', async () => {
  const denied = await detailRoute.PATCH(request('PATCH', '', { patientId: foreignPatient, values: { skin_disease: 'yes' } }), { params: Promise.resolve({ id: responseId }) });
  assert.equal(denied.status, 400);
  const res = await detailRoute.PATCH(request('PATCH', '', { patientId: localPatient, values: { skin_disease: 'yes' } }), { params: Promise.resolve({ id: responseId }) });
  assert.equal(res.status, 200);
  assert.deepEqual(writes[0].body, { skin_disease: 'yes' });
});

test('patient accounts cannot use staff questionnaire operations', async () => {
  globalThis.patientRole = true;
  const res = await listRoute.GET(request('GET'));
  assert.equal(res.status, 403);
  assert.equal(writes.length, 0);
});

test('combined patient selector queries the backend by full name and remains branch scoped', async () => {
  const results = await questionnaireResponses.patients('ada local');
  assert.deepEqual(results.map((patient) => patient.id), [localPatient]);
  const commaSearch = await questionnaireResponses.patients('Local, Ada');
  assert.deepEqual(commaSearch.map((patient) => patient.id), [localPatient]);
  assert.deepEqual(await questionnaireResponses.patients('Bea Other'), []);
});

test('legacy responses receive a server timestamp on first edit and existing timestamps are preserved', async () => {
  responses[0].submitted_at = null;
  const update = await detailRoute.PATCH(request('PATCH', '', { values: { skin_disease: 'yes' } }), { params: Promise.resolve({ id: responseId }) });
  assert.equal(update.status, 200);
  assert.ok(Math.abs(Date.now() - Date.parse(`${writes[0].body.submitted_at}Z`)) < 5000);
  responses[0].submitted_at = '2026-01-01T10:00:00';
  const detail = await detailRoute.GET(request('GET'), { params: Promise.resolve({ id: responseId }) });
  assert.equal((await detail.json()).data.submitted_at, '2026-01-01T10:00:00Z');
});

test('clients cannot override the save-generated submitted timestamp', async () => {
  const res = await listRoute.POST(request('POST', '', { patientId: localPatient, values: { submitted_at: '2000-01-01T00:00:00' } }));
  assert.equal(res.status, 400);
  assert.equal(writes.length, 0);
});
