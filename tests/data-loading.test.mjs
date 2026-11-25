import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test, beforeEach } from 'node:test';
import ts from 'typescript';

// Exercise the actual adapter against a synthetic EHR, without patient data or credentials.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@likha-erp/likha-sdk') return { url: 'mock:sdk', shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === 'mock:sdk') return { format: 'module', shortCircuit: true, source: `
      export const authentication = (_mode, options) => { globalThis.mockStorage = options.storage; return {}; }, rest = () => ({});
      export const readItems = (collection, query) => ({ collection, query });
      export const readItem = (collection, id, query) => ({ collection, id, query });
      export const createLikha = () => ({ with() { return this; }, getToken: async () => 'test-token', request: (command) => globalThis.mockSdk(command) });
      export const createItem = () => {}, readMe = () => {}, readRole = () => {}, readRolesMe = () => {}, triggerFlow = () => {}, uploadFiles = () => {}, updateItem = () => {}, updateMe = () => {};
    ` };
    const loaded = next(url, context);
    if (!url.endsWith('.ts')) return loaded;
    return { ...loaded, format: 'module', source: ts.transpileModule(String(loaded.source), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText };
  },
});

const adapter = await import('../src/lib/api/likha/index.ts');
let tables;
let requests;
let grantReads;

function matches(row, filter) {
  if (!row) return false;
  return Object.entries(filter ?? {}).every(([field, condition]) => {
    if (field === '_and') return condition.every((part) => matches(row, part));
    if (field === '_or') return condition.some((part) => matches(row, part));
    const value = row[field];
    const id = value && typeof value === 'object' ? value.id : value;
    return Object.entries(condition).every(([operator, expected]) => {
      if (operator === '_eq') return String(id).toLowerCase() === String(expected).toLowerCase();
      if (operator === '_neq') return id !== expected;
      if (operator === '_null') return expected ? value == null : value != null;
      if (operator === '_starts_with') return String(value ?? '').startsWith(expected);
      if (operator === '_in') return expected.includes(id);
      if (operator === '_nin') return !expected.includes(id);
      if (operator === '_icontains') return String(value ?? '').toLowerCase().includes(expected.toLowerCase());
      if (operator === '_gte') return value >= expected;
      if (operator === '_lt') return value < expected;
      return matches(value, { [operator]: expected });
    });
  });
}

beforeEach(() => {
  adapter.resetDataSession();
  globalThis.mockStorage.set(null);
  requests = [];
  grantReads = 0;
  const local = { id: 'p1', first_name: 'Ada', last_name: 'Local', custodian_branch: 'b1' };
  const shared = { id: 'p2', first_name: 'Bea', last_name: 'Shared', custodian_branch: 'b2' };
  const denied = { id: 'p3', first_name: 'Cal', last_name: 'Denied', custodian_branch: 'b2' };
  tables = {
    branch: [{ id: 'b1', code: 'baguio' }], patient: [local, shared, denied],
    interclinic_consent: [
      { id: 'g1', destination_branch: 'b1', effect: 'view_only', status: 'approved', local_patient: 'p2', scope: ['patient', 'laboratory'], access_expires_at: null },
      { id: 'g2', destination_branch: 'b1', effect: 'view_only', status: 'revoked', local_patient: 'p3', scope: ['patient', 'laboratory'] },
    ],
    encounter: [
      { id: 'e1', patient: local, status: 'Completed', encounter_date: '2026-01-03', service: [] },
      { id: 'e2', patient: shared, status: 'not_completed', encounter_date: '2026-01-02', service: [] },
      { id: 'e3', patient: denied, status: 'not_completed', encounter_date: '2026-01-01', service: [] },
    ],
    invoice: [],
  };
  tables.results_hematology = tables.encounter.map((encounter, index) => ({ id: `r${index}`, encounter, Status: 'for_encoding' }));
  tables.results_hematology.push({ id: 'orphan', encounter: null, Status: 'for_encoding' });
  globalThis.mockSdk = async ({ collection, query }) => {
    if (collection === 'interclinic_consent') grantReads += 1;
    return (tables[collection] ?? []).filter((row) => matches(row, query.filter));
  };
  globalThis.fetch = async (url, options) => {
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const parsed = new URL(url);
    const collection = parsed.pathname.split('/').at(-1);
    const query = Object.fromEntries(parsed.searchParams);
    requests.push({ collection, ...query });
    let rows = (tables[collection] ?? []).filter((row) => matches(row, JSON.parse(query.filter ?? '{}')));
    if (query.aggregate) {
      const aggregate = JSON.parse(query.aggregate);
      const operation = Object.keys(aggregate)[0];
      const field = aggregate[operation][0];
      return Response.json({ data: [{ [operation]: { [field]: operation === 'count' ? rows.length : rows.reduce((sum, row) => sum + (row[field] ?? 0), 0) } }] });
    }
    for (const sort of (query.sort ?? '').split(',').reverse()) {
      const desc = sort.startsWith('-');
      const path = sort.replace(/^-/, '').split('.');
      const val = (row) => path.reduce((value, key) => value?.[key], row) ?? '';
    rows.sort((a, b) => (typeof val(a) === 'number' && typeof val(b) === 'number'
      ? val(a) - val(b) : String(val(a)).localeCompare(String(val(b)))) * (desc ? -1 : 1));
    }
    rows = rows.slice(Number(query.offset ?? 0), Number(query.offset ?? 0) + Number(query.limit ?? 100));
    return Response.json({ data: rows });
  };
});

test('patient search and pagination are authorized before counts and page slicing', async () => {
  const result = await adapter.likhaPatients.getAll({ page: 2, limit: 1 });
  assert.equal(result.total, 2);
  assert.equal(result.data[0].id, 'p2');
  assert.equal(result.data[0].interclinic_access, true);
  assert.ok(requests.some((query) => query.collection === 'patient' && query.offset === '1' && query.limit === '1'));
  const search = await adapter.likhaPatients.getAll({ search: 'Ada Local', page: 1, limit: 10 });
  assert.deepEqual(search.data.map((row) => row.id), ['p1']);
});

test('clinical scopes do not inherit patient-only grants and concurrent checks share one snapshot', async () => {
  const [patients, encounters, invoices] = await Promise.all([
    adapter.likhaPatients.getAll({ limit: 10 }), adapter.likhaEncounters.getAll({ limit: 10 }), adapter.likhaInvoices.getAll({ limit: 10 }),
  ]);
  assert.equal(patients.total, 2);
  assert.deepEqual(encounters.data.map((row) => row.id), ['e1']);
  assert.equal(invoices.total, 0);
  assert.equal(grantReads, 1);
  tables.interclinic_consent[0].status = 'revoked';
  assert.equal((await adapter.likhaPatients.getAll({ limit: 10 })).total, 1);
});

test('labs exclude unauthorized and orphan records, select category, and merge pages', async () => {
  const result = await adapter.likhaLabResults.getAll({ category: 'hematology', page: 2, limit: 1 });
  assert.equal(result.total, 2);
  assert.deepEqual(result.data.map((row) => row.id), ['r1']);
  assert.ok(requests.every((query) => query.collection.startsWith('results_hematology')));
  assert.ok(requests.filter((query) => !query.aggregate).every((query) => query.limit === '2'));
  const selected = await adapter.likhaLabResults.getAll({ patientId: 'p1', category: 'hematology', limit: 10 });
  assert.deepEqual(selected.data.map((row) => row.id), ['r0']);
});

test('expired shares are not returned and scoped queue excludes foreign patients', async () => {
  tables.interclinic_consent[0].access_expires_at = '2000-01-01T00:00:00Z';
  assert.equal((await adapter.likhaPatients.getAll({ limit: 10 })).total, 1);
  const today = new Date().toISOString();
  tables.encounter.forEach((row) => { row.encounter_date = today; row.status = 'not_completed'; });
  assert.deepEqual((await adapter.likhaDashboard.getQueue()).map((row) => row.id), ['e1']);
});

test('dashboard uses scoped aggregates instead of downloading clinical tables', async () => {
  const result = await adapter.likhaDashboard.getMetrics();
  assert.equal(result.totalPatients, 2);
  assert.equal(result.pendingLabResults, 2);
  assert.ok(requests.every((query) => query.aggregate));
});

test('obsolete requests can be cancelled without fetching page data', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(adapter.likhaPatients.getAll({ limit: 10 }, controller.signal), { name: 'AbortError' });
});

test('a response from the previous data session cannot be returned after logout', async () => {
  const originalFetch = globalThis.fetch;
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  let started;
  const ready = new Promise((resolve) => { started = resolve; });
  globalThis.fetch = async (...args) => {
    const response = await originalFetch(...args);
    started();
    await pending;
    return response;
  };
  const request = adapter.likhaPatients.getAll({ limit: 10 });
  await ready;
  adapter.resetDataSession();
  finish();
  await assert.rejects(request, /signed-in account changed/);
});

test('lab detail is a bounded authorized lookup, not a fetch of every result', async () => {
  const result = await adapter.likhaLabResults.getCollectionRecord('results_hematology', 'r1');
  assert.equal(result.id, 'r1');
  assert.ok(requests.every((query) => query.collection === 'results_hematology' && query.limit === '1'));
  assert.equal(await adapter.likhaLabResults.getCollectionRecord('results_hematology', 'r2'), null);
});

test('encounter filters apply before total and pagination, across more than 100 rows', async () => {
  const patient = tables.patient[0];
  tables.encounter = Array.from({ length: 120 }, (_, index) => ({
    id: `e${String(index).padStart(3, '0')}`, patient,
    status: index % 2 ? 'Completed' : 'not_completed',
    encounter_type: 'OPD', encounter_date: '2026-01-01', service: [],
  }));
  const result = await adapter.likhaEncounters.getAll({ page: 6, limit: 10, status: 'completed', search: 'Ada', kind: 'outpatient' });
  assert.equal(result.total, 60);
  assert.equal(result.data.length, 10);
  assert.equal(result.data[0].id, 'e101');
});

test('invoice type/status/search filters do not return another patient’s invoice', async () => {
  tables.invoice = [
    { id: 'i1', patient: tables.patient[0], invoice_number: 'OPD-001', status: 'paid', type: 'Outpatient', total_amount: 100 },
    { id: 'i2', patient: tables.patient[2], invoice_number: 'OPD-002', status: 'paid', type: 'Outpatient', total_amount: 100 },
    { id: 'i3', patient: tables.patient[0], invoice_number: 'CORP-001', status: 'draft', type: 'Corporate', total_amount: 100 },
  ];
  const result = await adapter.likhaInvoices.getAll({ page: 1, limit: 10, search: 'Ada', status: 'paid', type: 'Outpatient' });
  assert.equal(result.total, 1);
  assert.deepEqual(result.data.map((row) => row.id), ['i1']);
});

test('full-name lab search matches separated name fields', async () => {
  const result = await adapter.likhaLabResults.getAll({ search: 'Ada Local', category: 'hematology', limit: 10 });
  assert.equal(result.total, 1);
});

test('integer hematology IDs remain in numeric order across page prefixes', async () => {
  tables.results_hematology = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, encounter: tables.encounter[0], Status: 'for_encoding' }));
  const ids = [];
  for (let page = 1; page <= 6; page += 1) {
    const result = await adapter.likhaLabResults.getAll({ category: 'hematology', page, limit: 2 });
    ids.push(...result.data.map((row) => Number(row.id)));
  }
  assert.deepEqual(ids, Array.from({ length: 12 }, (_, index) => index + 1));
});

test('result lookup never sends integer ID predicates to UUID collections or vice versa', async () => {
  tables.results_hematology[0].id = 1;
  assert.equal((await adapter.likhaLabResults.getOne('1')).id, '1');
  assert.ok(requests.every((query) => query.collection === 'results_hematology'));
  requests = [];
  await adapter.likhaLabResults.getOne('054f0df0-3678-475c-9489-966f3b775e0c');
  assert.ok(requests.every((query) => query.collection !== 'results_hematology'));
});

test('a delayed sign-in cannot restore a signed-out session or erase its replacement', async (context) => {
  globalThis.window = {};
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  context.after(() => { delete globalThis.window; delete globalThis.sessionStorage; });
  let finish;
  globalThis.fetch = () => new Promise((resolve) => { finish = () => resolve(Response.json({ data: { access_token: 'old', expires: 900000 } })); });
  const login = adapter.likhaAuth.login('test@example.invalid', 'test-password');
  adapter.resetDataSession();
  globalThis.mockStorage.set({ access_token: 'replacement' });
  finish();
  await assert.rejects(login, /superseded/);
  assert.equal(globalThis.mockStorage.get().access_token, 'replacement');
});
