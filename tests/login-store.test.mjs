import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@/lib/interclinicServer') return { url: 'mock:login-ehr', shortCircuit: true };
    if (specifier === './loginCooldown') return { url: new URL('../src/lib/loginCooldown.ts', import.meta.url).href, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === 'mock:login-ehr') return { shortCircuit: true, format: 'module', source: `
      export class InterclinicError extends Error { constructor(message,status) { super(message); this.status=status; } }
      export async function cmsRequest(...args) { return globalThis.loginStoreRequest(...args); }
    ` };
    const result = next(url, context);
    if (!url.endsWith('.ts')) return result;
    return { ...result, format: 'module', source: ts.transpileModule(String(result.source), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText };
  },
});

const { InterclinicError } = await import('@/lib/interclinicServer');
const store = await import('../src/lib/loginAttemptServer.ts');

test('valid login-store reads do not report a missing collection', async () => {
  globalThis.loginStoreRequest = async () => [];
  assert.deepEqual(await store.readLoginAttempts('synthetic-token', 'synthetic-hash'), []);
});

for (const [status, text] of [[401, 'credential'], [403, 'denied read access'], [404, 'not found'], [502, 'could not be reached']]) {
  test(`upstream ${status} has an accurate safe diagnosis`, async (context) => {
    const logs = [];
    context.mock.method(console, 'error', (...args) => logs.push(args));
    globalThis.loginStoreRequest = async () => { throw new InterclinicError('private-token and private-account should never be logged', status); };
    await assert.rejects(store.readLoginAttempts('private-token', 'private-account'), (error) => error.status === 503 && error.message.includes(text));
    const output = JSON.stringify(logs);
    assert.ok(output.includes(String(status)));
    assert.ok(!output.includes('private-token'));
    assert.ok(!output.includes('private-account'));
  });
}

test('malformed upstream responses fail closed instead of bypassing throttling', async (context) => {
  context.mock.method(console, 'error', () => {});
  globalThis.loginStoreRequest = async () => undefined;
  await assert.rejects(store.readLoginAttempts('token', 'hash'), (error) => error.status === 503);
});

test('create and delete failures also use safe deployment diagnostics', async (context) => {
  context.mock.method(console, 'error', () => {});
  globalThis.loginStoreRequest = async () => { throw new InterclinicError('forbidden', 403); };
  await assert.rejects(store.recordLoginFailure('token', 'hash'), /denied create access/);
  await assert.rejects(store.clearLoginAttempts('token', [{ id: 'test', account_hash: 'hash', failed_at: '' }]), /denied delete access/);
});

test('password and OTP tracking have distinct hashes without new collection fields', async () => {
  process.env.INTERCLINIC_OTP_SECRET = 'a-synthetic-test-secret-at-least-32-characters';
  const passwordHash = store.hashLoginAccount(' Test@Example.Invalid ');
  const otpHash = store.hashLoginAccount('test@example.invalid', 'otp');
  assert.notEqual(passwordHash, otpHash);
  assert.equal(passwordHash, store.hashLoginAccount('test@example.invalid', 'password'));
  let query;
  globalThis.loginStoreRequest = async (_token, path) => { query = new URL(path, 'https://ehr.test').searchParams; return []; };
  await store.readLoginAttempts('token', [passwordHash, otpHash]);
  assert.equal(query.get('filter[account_hash][_in]'), `${passwordHash},${otpHash}`);
});
