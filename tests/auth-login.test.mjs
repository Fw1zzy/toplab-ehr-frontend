import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { beforeEach, test } from 'node:test';
import ts from 'typescript';

process.env.LIKHA_CMS_URL = 'https://synthetic-ehr.test';
process.env.LIKHA_PATIENT_SERVICE_TOKEN = 'synthetic-service-token';
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'next/server') return { url: 'mock:next', shortCircuit: true };
    if (specifier === '@/lib/interclinicServer') return { url: 'mock:error', shortCircuit: true };
    if (specifier === '@/lib/loginAttemptServer') return { url: 'mock:attempts', shortCircuit: true };
    if (specifier === '@/lib/loginCooldown') return { url: new URL('../src/lib/loginCooldown.ts', import.meta.url).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === 'mock:next') return { format: 'module', shortCircuit: true, source: 'export const NextResponse = Response;' };
    if (url === 'mock:error') return { format: 'module', shortCircuit: true, source: 'export class InterclinicError extends Error { constructor(message,status) { super(message); this.status=status; } }' };
    if (url === 'mock:attempts') return { format: 'module', shortCircuit: true, source: `
      export const MAX_LOGIN_FAILURES=25;
      export const hashLoginAccount=(_email,factor)=> factor==='otp'?'otp-hash':'password-hash';
      export const readLoginAttempts=async()=> [...globalThis.failures].sort((a,b)=>b.failed_at.localeCompare(a.failed_at));
      export const recordLoginFailure=async(_token,hash)=> { globalThis.failures.push({id:'new',account_hash:hash,failed_at:new Date().toISOString()}); };
      export const clearLoginAttempts=async()=> { globalThis.failures=[]; };
      export const cooldownSecondsForFailures=n=> n>0 && n<25 && n%5===0 ? n/5*60 : 0;
    ` };
    const loaded = next(url, context);
    if (!url.endsWith('.ts')) return loaded;
    return { ...loaded, format: 'module', source: ts.transpileModule(String(loaded.source), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText };
  },
});

const { POST } = await import('../src/app/api/auth/login/route.ts');
let upstream;
let sent;

beforeEach(() => {
  globalThis.failures = [];
  sent = [];
  upstream = { status: 200, body: { data: { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', expires: 900000 } } };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://synthetic-ehr.test/auth/login');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers['User-Agent'], 'curl/8.5.0');
    sent.push(JSON.parse(options.body));
    return Response.json(upstream.body, { status: upstream.status });
  };
});

function request(otp) {
  const request = new Request('https://app.test/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'person@example.invalid', password: 'synthetic-password', ...(otp === undefined ? {} : { otp }) }),
  });
  request.nextUrl = new URL(request.url);
  return request;
}

test('native MFA challenge is distinct from rejection and does not count as a failure', async () => {
  upstream = { status: 401, body: { errors: [{ message: 'Invalid user OTP.', extensions: { code: 'INVALID_OTP' } }] } };
  const response = await POST(request());
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.code, 'MFA_REQUIRED');
  assert.equal(body.failedAttempts, 0);
  assert.equal(globalThis.failures.length, 0);
  assert.equal(body.data, undefined);
});

test('correct submitted OTP including leading zeroes is forwarded unchanged', async () => {
  const response = await POST(request('000042'));
  assert.equal(response.status, 200);
  assert.equal(sent[0].otp, '000042');
  assert.equal((await response.json()).data.access_token, 'synthetic-access');
});

test('spaces in pasted OTPs are normalized without changing leading zeroes', async () => {
  const response = await POST(request('000 042'));
  assert.equal(response.status, 200);
  assert.equal(sent[0].otp, '000042');
});

test('wrong OTP increments the total without starting an escalating cooldown', async () => {
  globalThis.failures = Array.from({ length: 4 }, (_, index) => ({ id: String(index), account_hash: 'password-hash', failed_at: '2020-01-01T00:00:00Z' }));
  upstream = { status: 401, body: { errors: [{ message: 'Invalid user OTP.', extensions: { code: 'INVALID_OTP' } }] } };
  const response = await POST(request('123456'));
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.code, 'INVALID_OTP');
  assert.equal(body.failedAttempts, 5);
  assert.equal(body.retryAfterSeconds, 0);
  assert.equal(globalThis.failures.at(-1).account_hash, 'otp-hash');
  assert.equal(body.data, undefined);
});

test('OTP failures alone do not pause a subsequent valid authenticator submission', async () => {
  globalThis.failures = Array.from({ length: 5 }, (_, index) => ({ id: String(index), account_hash: 'otp-hash', failed_at: new Date().toISOString() }));
  const response = await POST(request('000042'));
  assert.equal(response.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(globalThis.failures.length, 0);
});

test('adding a dummy OTP does not bypass password cooldowns', async () => {
  globalThis.failures = Array.from({ length: 4 }, (_, index) => ({ id: String(index), account_hash: 'password-hash', failed_at: '2020-01-01T00:00:00Z' }));
  upstream = { status: 401, body: { errors: [{ extensions: { code: 'INVALID_CREDENTIALS' } }] } };
  const response = await POST(request('123456'));
  const body = await response.json();
  assert.equal(response.status, 429);
  assert.equal(body.retryAfterSeconds, 60);
  const second = await POST(request('123456'));
  assert.equal(second.status, 429);
  assert.equal(sent.length, 1);
});

test('combined password and OTP failures still block at 25', async () => {
  globalThis.failures = Array.from({ length: 25 }, (_, index) => ({ id: String(index), account_hash: index < 10 ? 'password-hash' : 'otp-hash', failed_at: '2020-01-01T00:00:00Z' }));
  const response = await POST(request('000042'));
  const body = await response.json();
  assert.equal(response.status, 423);
  assert.equal(body.blocked, true);
  assert.equal(body.retryAfterSeconds, 0);
  assert.equal(sent.length, 0);
});

test('malformed code is rejected before the EHR login call', async () => {
  const response = await POST(request('12x456'));
  assert.equal(response.status, 400);
  assert.equal(sent.length, 0);
});

test('password rejection and EHR outages are not represented as MFA failures', async () => {
  upstream = { status: 401, body: { errors: [{ extensions: { code: 'INVALID_CREDENTIALS' } }] } };
  const badPassword = await POST(request());
  assert.equal((await badPassword.json()).code, 'INVALID_CREDENTIALS');
  globalThis.failures = [];
  upstream = { status: 503, body: { errors: [{ extensions: { code: 'SERVICE_UNAVAILABLE' } }] } };
  const unavailable = await POST(request('000042'));
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).code, undefined);
  assert.equal(globalThis.failures.length, 0);
});
