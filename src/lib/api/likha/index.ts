import {
  authentication,
  createLikha,
  createItem,
  readItem,
  readItems,
  readMe,
  readRole,
  readRolesMe,
  rest,
  triggerFlow,
  uploadFiles,
  updateItem,
  updateMe,
} from '@likha-erp/likha-sdk';
import type { CurrentUser, Patient, Encounter, Invoice, Company, CorporateRequest, Employee, CatalogService, InventoryItem } from '@/types';

type CmsRecord = Record<string, unknown> & { id: string };
interface CmsSchema {
  patient: CmsRecord[];
  branch: CmsRecord[];
  interclinic_consent: CmsRecord[];
  encounter: CmsRecord[];
  encounter_catalog_service: CmsRecord[];
  invoice: CmsRecord[];
  invoice_line_item: CmsRecord[];
  service_request: CmsRecord[];
  company: CmsRecord[];
  corporate_request: CmsRecord[];
  employee: CmsRecord[];
  inventory_item: CmsRecord[];
  catalog_service: CmsRecord[];
  results_hematology: CmsRecord[];
  results_hematology_cbc: CmsRecord[];
  results_hematology_pbs: CmsRecord[];
  results_clinical_chemistry: CmsRecord[];
  results_urinalysis: CmsRecord[];
  results_serology: CmsRecord[];
  results_serology_new: CmsRecord[];
  results_immunochemistry: CmsRecord[];
  results_microbiology_koh: CmsRecord[];
  results_parasitology: CmsRecord[];
  results_sperm_analysis: CmsRecord[];
  results_covid_antigen: CmsRecord[];
  results_drug_test: CmsRecord[];
  results_ecg: CmsRecord[];
  results_os_xray: CmsRecord[];
  results_ultrasound: CmsRecord[];
  results_pap_smear: CmsRecord[];
  results_xray: CmsRecord[];
  results_others: CmsRecord[];
}

const apiUrl = typeof window === 'undefined'
  ? 'http://localhost:3000/api/likha'
  : `${window.location.origin}/api/likha`;
type LikhaAuthData = { access_token: string | null; refresh_token: string | null; expires: number | null; expires_at: number | null };
let inMemoryAuth: LikhaAuthData | null = null;
const authStorage = {
  get() {
    if (typeof window === 'undefined') return null;
    if (inMemoryAuth?.access_token) return inMemoryAuth;
    try {
      const saved = JSON.parse(sessionStorage.getItem('likha_auth') || 'null') as { refresh_token?: string } | null;
      return saved?.refresh_token
        ? { access_token: null, refresh_token: saved.refresh_token, expires: null, expires_at: null }
        : null;
    } catch {
      return null;
    }
  },
  set(value: LikhaAuthData | null) {
    if (typeof window === 'undefined') return;
    inMemoryAuth = value?.access_token ? value : null;
    try {
      if (value?.refresh_token) sessionStorage.setItem('likha_auth', JSON.stringify({ refresh_token: value.refresh_token }));
      else sessionStorage.removeItem('likha_auth');
    } catch {
      // Keep the access token usable for the current tab if storage is unavailable.
    }
  },
};
let sessionRefreshPromise: Promise<CurrentUser | null> | null = null;
let dataSession = 0;

export function resetDataSession() {
  dataSession += 1;
  currentBranchPromise = null;
  shareRequest = null;
}

export const likha = createLikha<CmsSchema>(apiUrl)
  .with(authentication('json', { storage: authStorage, credentials: 'include' }))
  .with(rest({ credentials: 'include' }));

const value = (row: CmsRecord, key: string) => row[key] as string | number | boolean | null | undefined;
const text = (row: CmsRecord, key: string) => {
  const result = value(row, key);
  return result == null ? null : String(result);
};
const number = (row: CmsRecord, key: string) => Number(value(row, key) ?? 0);
const relationId = (input: unknown): string | null => {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object' && 'id' in input) return String(input.id);
  return null;
};
const paginated = <T,>(data: T[], total = data.length, page = 1, limit = data.length || 1) => ({
  data: data.slice((page - 1) * limit, page * limit), total,
});

async function list<C extends keyof CmsSchema>(collection: C, params?: {
  filter?: Record<string, unknown>;
  page?: number;
  limit?: number;
  offset?: number;
  sort?: string[];
  fields?: string[];
}) {
  const limit = Math.min(params?.limit ?? 100, 100);
  const filter = { ...params?.filter } as Record<string, unknown>;
  const session = dataSession;
  const rows = await likha.request(readItems(collection, {
    filter: Object.keys(filter).length ? filter : undefined,
    limit,
    ...(params?.offset ? { offset: params.offset } : {}),
    sort: params?.sort as never,
    fields: params?.fields as never,
  }));
  if (session !== dataSession) throw new Error('The signed-in account changed.');
  return rows;
}

async function listAll<C extends keyof CmsSchema>(collection: C, options?: {
  fields?: string[];
  filter?: Record<string, unknown>;
  sort?: string[];
}) {
  const all: CmsRecord[] = [];
  const pageSize = 100;
  while (true) {
    const rows = await list(collection, { ...options, sort: options?.sort ?? ['id'], limit: pageSize, offset: all.length });
    const batch = (rows ?? []) as CmsRecord[];
    all.push(...batch);
    if (batch.length < pageSize) break;
  }
  return all;
}

type ItemQuery = { filter?: Record<string, unknown>; fields?: string[]; sort?: string[]; limit?: number; offset?: number };

async function requestItems<T>(collection: keyof CmsSchema, query: Record<string, unknown>, signal?: AbortSignal) {
  const session = dataSession;
  const token = await likha.getToken();
  if (!token || session !== dataSession) throw new Error('Sign in again to load EHR records.');
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
  const response = await fetch(`${apiUrl}/items/${collection}?${params}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal,
  });
  const body = await response.json();
  if (session !== dataSession) throw new Error('The signed-in account changed.');
  if (!response.ok) throw Object.assign(new Error(body.errors?.[0]?.message ?? 'Unable to load EHR records.'), { status: response.status });
  return body.data as T;
}

async function itemRows(collection: keyof CmsSchema, query: ItemQuery, signal?: AbortSignal) {
  return requestItems<CmsRecord[]>(collection, {
    ...query, fields: query.fields?.join(','), sort: query.sort?.join(','),
  }, signal);
}

async function aggregateValue(collection: keyof CmsSchema, filter: Record<string, unknown>, operation: 'count' | 'sum' = 'count', field = 'id', signal?: AbortSignal) {
  const rows = await requestItems<Array<Record<string, Record<string, string | number>>>>(collection, {
    filter, aggregate: { [operation]: [field] },
  }, signal);
  return Number(rows[0]?.[operation]?.[field] ?? 0);
}

async function itemPage(collection: keyof CmsSchema, query: ItemQuery, page?: number, limit?: number, signal?: AbortSignal) {
  // Callers without page bounds (e.g. exports) retain complete-list behavior.
  if (page === undefined && limit === undefined) {
    const rows: CmsRecord[] = [];
    while (true) {
      const batch = await itemRows(collection, { ...query, limit: 100, offset: rows.length }, signal);
      rows.push(...batch);
      if (batch.length < 100) return { data: rows, total: rows.length };
    }
  }
  const size = Math.max(1, Math.floor(limit ?? 10));
  const offset = (Math.max(1, page ?? 1) - 1) * size;
  const [data, total] = await Promise.all([
    itemRows(collection, { ...query, limit: size, offset }, signal),
    aggregateValue(collection, query.filter ?? {}, 'count', 'id', signal),
  ]);
  return { data, total };
}

const currentBranchCode = (process.env.NEXT_PUBLIC_LIKHA_BRANCH_CODE || 'baguio').trim().toLowerCase();
let currentBranchPromise: Promise<CmsRecord> | null = null;

async function getCurrentBranch() {
  if (!currentBranchPromise) {
    currentBranchPromise = (async () => {
      const rows = await list('branch', { limit: 10, filter: { code: { _eq: currentBranchCode } } });
      const branch = (rows ?? []).find((row) => text(row as CmsRecord, 'code')?.toLowerCase() === currentBranchCode) as CmsRecord | undefined;
      if (!branch) throw new Error(`The EHR has no branch configured for "${currentBranchCode}".`);
      return branch;
    })().catch((error) => {
      currentBranchPromise = null;
      throw error;
    });
  }
  return currentBranchPromise;
}

let shareRequest: { session: number; promise: Promise<CmsRecord[]> } | null = null;

async function patientAccessFilter(scope: 'patient' | 'encounter' | 'laboratory' | 'invoice') {
  const session = dataSession;
  const branch = await getCurrentBranch();
  if (session !== dataSession) throw new Error('The signed-in account changed.');
  if (!shareRequest || shareRequest.session !== session) {
    const request = { session, promise: listAll('interclinic_consent', {
      fields: ['local_patient', 'scope', 'access_expires_at'],
      filter: { destination_branch: { _eq: String(branch.id) }, effect: { _eq: 'view_only' }, status: { _eq: 'approved' } },
    }) };
    shareRequest = request;
    // Only deduplicate concurrent work; never cache authorization after completion.
    void request.promise.finally(() => { if (shareRequest === request) shareRequest = null; }).catch(() => undefined);
  }
  const grants = await shareRequest.promise;
  if (session !== dataSession) throw new Error('The signed-in account changed.');
  const sharedIds: string[] = [];
  for (const grant of grants) {
    const scopes = value(grant, 'scope');
    const patientId = relationId(grant.local_patient);
    const expiresAt = text(grant, 'access_expires_at');
    const unexpired = !expiresAt || new Date(expiresAt).getTime() > Date.now();
    if (patientId && unexpired && Array.isArray(scopes) && scopes.includes(scope)) sharedIds.push(patientId);
  }
  return { _or: [{ custodian_branch: { _eq: String(branch.id) } }, { id: { _in: [...new Set(sharedIds)] } }] };
}

async function isPatientCustodian(patientId: string) {
  const branch = await getCurrentBranch();
  const patient = await likha.request(readItem('patient', patientId, { fields: ['id', 'custodian_branch'] })) as CmsRecord;
  return relationId(patient.custodian_branch) === String(branch.id);
}

async function hasPatientScopeAccess(patientId: string, scope: 'patient' | 'encounter' | 'laboratory' | 'invoice') {
  const filter = await patientAccessFilter(scope);
  const rows = await itemRows('patient', { fields: ['id'], limit: 1, filter: { _and: [filter, { id: { _eq: patientId } }] } });
  return rows.length > 0;
}

function mapPatient(row: CmsRecord): Patient {
  const civilStatus = text(row, 'civil_status')?.toLowerCase();
  const user = row.user && typeof row.user === 'object' ? row.user as CmsRecord : null;
  return {
    id: row.id,
    patient_id: row.id,
    first_name: text(row, 'first_name') ?? '',
    middle_name: text(row, 'middle_name'),
    last_name: text(row, 'last_name') ?? '',
    suffix: text(row, 'suffixes'),
    date_of_birth: text(row, 'date_of_birth'),
    sex: text(row, 'sex')?.toLowerCase() as Patient['sex'],
    civil_status: (civilStatus === 'widow/widower' ? 'widowed' : civilStatus) as Patient['civil_status'],
    address: text(row, 'address'),
    contact_number: text(row, 'mobile_number'),
    email: text(row, 'email'),
    company_id: relationId(row.company),
    valid_id_presented: text(row, 'valid_id_presented'),
    valid_id_number: text(row, 'valid_id_number'),
    global_patient_id: text(row, 'global_patient_id'),
    origin_branch_id: relationId(row.origin_branch),
    custodian_branch_id: relationId(row.custodian_branch),
    custody_state: text(row, 'custody_state') as Patient['custody_state'],
    user_id: relationId(row.user),
    avatar_id: user ? relationId(user.avatar) : null,
  };
}

const encounterFields = [
  'id', 'encounter_date', 'patient.id', 'patient.first_name', 'patient.last_name',
  'status', 'encounter_type', 'company', 'corporate_request', 'payment_route',
  'service.catalog_service_id.id', 'service.catalog_service_id.name',
  'service.catalog_service_id.department', 'service.saved_price',
];

function mapEncounter(row: CmsRecord): Encounter {
  const cmsStatus = (text(row, 'status') ?? '').toLowerCase();
  const status = cmsStatus === 'completed' ? 'completed'
    : cmsStatus === 'not_completed' || cmsStatus === 'in progress' ? 'in_progress'
    : 'unknown';
  const serviceLinks = Array.isArray(row.service)
    ? row.service as CmsRecord[]
    : row.service && typeof row.service === 'object' ? [row.service as CmsRecord] : [];
  const selectedServices = serviceLinks.flatMap((link) => {
    const catalogService = link.catalog_service_id;
    if (!catalogService || typeof catalogService !== 'object') return [];
    const serviceId = relationId(catalogService);
    if (!serviceId) return [];
    return [{
      id: serviceId,
      name: text(catalogService as CmsRecord, 'name') ?? '',
      price: number(link, 'saved_price'),
      department: text(catalogService as CmsRecord, 'department'),
    }];
  });
  const serviceName = selectedServices.map((service) => service.name).filter(Boolean).join(', ')
    || text(row, 'display_service');
  const encounterType = text(row, 'encounter_type');
  const paymentRoute = text(row, 'payment_route');
  return {
    id: row.id,
    encounter_date: text(row, 'encounter_date') ?? '',
    patient_id: row.patient && typeof row.patient === 'object'
      ? { id: relationId(row.patient) ?? '', first_name: text(row.patient as CmsRecord, 'first_name') ?? '', last_name: text(row.patient as CmsRecord, 'last_name') ?? '' }
      : relationId(row.patient) ?? '',
    service: serviceName,
    service_id: selectedServices[0]?.id ?? null,
    status,
    encounter_type: encounterType as Encounter['encounter_type'],
    company: relationId(row.company),
    corporate_request: relationId(row.corporate_request),
    payment_route: paymentRoute === 'personal_upfront' ? 'Personal Upfront'
      : paymentRoute === 'company_billed' ? 'Company Billed'
      : paymentRoute as Encounter['payment_route'],
    services_selected: selectedServices,
  };
}

function mapInvoice(row: CmsRecord): Invoice {
  const companyId = relationId(row.company);
  const status = text(row, 'status')?.toLowerCase() as Invoice['status'];
  return {
    id: row.id,
    invoice_number: text(row, 'invoice_number'),
    patient_id: row.patient && typeof row.patient === 'object'
      ? { id: relationId(row.patient) ?? '', first_name: text(row.patient as CmsRecord, 'first_name') ?? '', last_name: text(row.patient as CmsRecord, 'last_name') ?? '' }
      : relationId(row.patient) ?? '',
    company_id: companyId,
    type: text(row, 'type') as Invoice['type'],
    status,
    total_amount: number(row, 'total_amount'),
  };
}

function userFromToken(accessToken: string, email: string): CurrentUser {
  let claims: { id?: string; role?: string; admin_access?: boolean; first_name?: string; last_name?: string } = {};
  try {
    const segment = accessToken.split('.')[1];
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
  } catch {
    // The authenticated email remains enough to enter the app if token claims are opaque.
  }
  const roleName = claims.admin_access ? 'Administrator' : 'User';
  return {
    id: claims.id ?? email,
    first_name: claims.first_name ?? '',
    last_name: claims.last_name ?? '',
    email,
    avatar: null,
    role: roleName,
    roleName,
    status: 'active',
    last_access: null,
    last_page: null,
    permissions: [],
  };
}

export const likhaAuth = {
  hasAccessToken() {
    return Boolean(inMemoryAuth?.access_token && (inMemoryAuth.expires_at ?? 0) > Date.now());
  },
  async getAccessToken() {
    return likha.getToken();
  },
  mapUser(user: { id: string; role: unknown; first_name: string | null; last_name: string | null; email: string | null; avatar: unknown; status: string; last_access: string | null; last_page: string | null }) {
    const roleValue = user.role as { name?: string } | string | null;
    const roleName = typeof roleValue === 'object' && roleValue
      ? roleValue.name ?? 'User'
      : typeof roleValue === 'string' && !/^[0-9a-f-]{36}$/i.test(roleValue)
        ? roleValue
        : 'User';
    return {
      id: user.id,
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      email: user.email ?? '',
      avatar: relationId(user.avatar),
      role: roleName,
      status: user.status as CurrentUser['status'],
      last_access: user.last_access ?? null,
      last_page: user.last_page ?? null,
      roleName,
      permissions: [],
    } satisfies CurrentUser;
  },
  async readProfile() {
    const user = await likha.request(readMe());
    const roleId = typeof user.role === 'string' && /^[0-9a-f-]{36}$/i.test(user.role) ? user.role : null;
    if (!roleId) return this.mapUser(user);
    try {
      const role = await likha.request(readRole(roleId, { fields: ['name'] }));
      return this.mapUser({ ...user, role: role.name });
    } catch {
      try {
        const roles = await likha.request(readRolesMe({ fields: ['id', 'name'] }));
        const role = roles.find((item) => item.id === roleId);
        if (role) return this.mapUser({ ...user, role: role.name });
      } catch {
        // Role metadata may be restricted; do not expose its UUID as a label.
      }
      return this.mapUser(user);
    }
  },
  async login(email: string, password: string, otp?: string) {
    if (sessionRefreshPromise) await sessionRefreshPromise;
    const loginSession = dataSession;
    authStorage.set(null);
    // Preserve the stored email's case; some EHR deployments use case-sensitive comparisons.
    const normalizedEmail = email.trim();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password, ...(otp ? { otp } : {}) }),
        cache: 'no-store',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const loginError = new Error(result.error ?? 'Authentication failed. Please try again.') as Error & {
          failedAttempts?: number;
          remainingAttempts?: number;
          retryAfterSeconds?: number;
          warning?: boolean;
          blocked?: boolean;
        };
        loginError.failedAttempts = result.failedAttempts;
        loginError.remainingAttempts = result.remainingAttempts;
        loginError.retryAfterSeconds = result.retryAfterSeconds;
        loginError.warning = result.warning;
        loginError.blocked = result.blocked;
        if (result.blocked) loginError.name = 'LoginBlockedError';
        else if (result.code === 'MFA_REQUIRED' || result.code === 'INVALID_OTP') loginError.name = 'MfaAuthenticationError';
        else if (result.retryAfterSeconds) loginError.name = 'LoginCooldownError';
        else if (result.warning) loginError.name = 'LoginWarningError';
        else if (typeof result.failedAttempts === 'number') loginError.name = 'LoginFailureError';
        throw loginError;
      }
      const session = result.data as { access_token?: string; refresh_token?: string; expires?: number } | undefined;
      if (!session?.access_token) throw new Error('The EHR login response did not include an access token.');
      if (loginSession !== dataSession) throw new Error('The sign-in request was superseded by another session.');
      authStorage.set({
        access_token: session.access_token,
        refresh_token: session.refresh_token ?? null,
        expires: session.expires ?? null,
        expires_at: session.expires ? Date.now() + session.expires : null,
      });
      return { user: userFromToken(session.access_token, normalizedEmail) };
    } catch (error) {
      if (loginSession === dataSession) authStorage.set(null);
      throw error;
    }
  },
  async verifyCredentials(password: string, otp?: string) {
    const token = await likha.getToken();
    if (!token) throw new Error('Sign in again before confirming your password.');
    const response = await fetch('/api/auth/verify-credentials', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, ...(otp ? { otp } : {}) }),
      cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? 'Password or authenticator code could not be verified.');
    return true;
  },
  async generateTwoFactorSecret(password: string) {
    const token = await likha.getToken();
    if (!token) throw new Error('Sign in again before setting up two-factor authentication.');
    const response = await fetch('/api/likha/users/me/tfa/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }), cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.errors?.[0]?.message ?? 'Unable to start authenticator setup.');
    return result.data as { secret: string; otpauth_url: string };
  },
  async enableTwoFactor(secret: string, otp: string) {
    const token = await likha.getToken();
    if (!token) throw new Error('Sign in again before finishing authenticator setup.');
    const response = await fetch('/api/likha/users/me/tfa/enable', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, otp }), cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.errors?.[0]?.message ?? 'The authenticator code could not be verified.');
    return true;
  },
  async disableTwoFactor(otp: string) {
    const token = await likha.getToken();
    if (!token) throw new Error('Sign in again before disabling two-factor authentication.');
    const response = await fetch('/api/likha/users/me/tfa/disable', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp }), cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.errors?.[0]?.message ?? 'The authenticator code could not be verified.');
    return true;
  },
  async logout() {
    try {
      if (sessionRefreshPromise) await sessionRefreshPromise;
      await likha.logout({ mode: 'json' });
    } finally {
      authStorage.set(null);
    }
  },
  async getCurrentUser() {
    try {
      return await this.readProfile();
    } catch {
      return null;
    }
  },
  async updateProfile(data: Pick<CurrentUser, 'first_name' | 'last_name'>) {
    await likha.request(updateMe({
      first_name: data.first_name,
      last_name: data.last_name,
    }));
    return this.readProfile();
  },
  refreshSession() {
    if (!authStorage.get()?.refresh_token) return Promise.resolve(null);
    if (sessionRefreshPromise) return sessionRefreshPromise;
    sessionRefreshPromise = (async () => {
      try {
        await likha.refresh({ mode: 'json' });
        return await likhaAuth.readProfile();
      } catch {
        return null;
      }
    })().finally(() => { sessionRefreshPromise = null; });
    return sessionRefreshPromise;
  },
};

async function postInterclinic(path: string, data: Record<string, unknown>) {
  const token = await likha.getToken();
  if (!token) throw new Error('Sign in again before requesting interclinic access.');
  const response = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? `Interclinic request failed (${response.status}).`);
  return result.data;
}

export const likhaInterclinic = {
  requestShare(input: { patientId: string; purpose: string }) {
    return postInterclinic('/api/interclinic/request', input);
  },
  verifyShare(input: { consentId: string; code: string }) {
    return postInterclinic('/api/interclinic/verify', input);
  },
  shareUsingQr(input: { patientId: string; purpose: string; qrPayload: string }) {
    return postInterclinic('/api/interclinic/transfer-qr', input);
  },
  async getPatientQr(patientId: string) {
    const token = await likha.getToken();
    if (!token) throw new Error('Sign in again to view the patient QR.');
    const response = await fetch(`/api/interclinic/qr/${encodeURIComponent(patientId)}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? `Unable to load patient QR (${response.status}).`);
    return result.data as { active: boolean; qrPayload?: string; createdAt?: string };
  },
  createPatientQr(patientId: string) {
    return postInterclinic(`/api/interclinic/qr/${encodeURIComponent(patientId)}`, { action: 'issue' });
  },
  revokePatientQr(patientId: string) {
    return postInterclinic(`/api/interclinic/qr/${encodeURIComponent(patientId)}`, { action: 'revoke' });
  },
  async getHistory(patientId: string) {
    const token = await likha.getToken();
    if (!token) throw new Error('Sign in again to view interclinic history.');
    const response = await fetch(`/api/interclinic/history/${encodeURIComponent(patientId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? `Unable to load history (${response.status}).`);
    return result.data as {
      transactions: Array<{
        id: string;
        status: string;
        effect: string;
        purpose: string;
        scope: string[];
        sourceBranch: string;
        destinationBranch: string;
        requestedAt: string | null;
        approvedAt: string | null;
        accessExpiresAt: string | null;
      }>;
      events: Array<{
        id: string;
        consentId: string | null;
        eventType: string;
        branch: string;
        occurredAt: string | null;
      }>;
    };
  },
};

async function savePatientRecord(data: Partial<Patient>, photo?: File, id?: string) {
  const token = await likha.getToken();
  if (!token) throw new Error('Sign in again before saving a patient.');
  const form = new FormData();
  form.append('patient', JSON.stringify({ ...data, ...(id ? { id } : {}) }));
  if (photo) form.append('photo', photo, photo.name);
  const response = await fetch('/api/patients', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
    cache: 'no-store',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? `Unable to save patient (${response.status}).`);
  return mapPatient(result.data as CmsRecord);
}

export const likhaPatients = {
  async getAll(params?: { search?: string; page?: number; limit?: number }, signal?: AbortSignal) {
    const branch = await getCurrentBranch();
    const access = await patientAccessFilter('patient');
    const terms = params?.search?.trim().split(/\s+/).filter(Boolean) ?? [];
    const result = await itemPage('patient', {
      fields: ['id', 'first_name', 'middle_name', 'last_name', 'suffixes', 'date_of_birth', 'sex', 'mobile_number', 'email', 'company', 'global_patient_id', 'origin_branch', 'custodian_branch', 'custody_state'],
      filter: { _and: [access, ...terms.map((term) => ({ _or: [
        { first_name: { _icontains: term } }, { last_name: { _icontains: term } },
        { mobile_number: { _icontains: term } },
        ...(/^[0-9a-f-]{36}$/i.test(term) ? [{ id: { _eq: term } }] : []),
      ] }))] },
      sort: ['last_name', 'first_name', 'id'],
    }, params?.page, params?.limit, signal);
    const data = result.data.map((row) => {
      const patient = mapPatient(row as CmsRecord);
      return { ...patient, interclinic_access: patient.custodian_branch_id !== String(branch.id) };
    });
    return { data, total: result.total };
  },
  async getOne(id: string, signal?: AbortSignal) {
    try {
      const token = await likha.getToken();
      if (!token) return null;
      const response = await fetch(`/api/patients/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) return null;
      return { ...mapPatient(result.data as CmsRecord), interclinic_access: result.interclinic_access === true };
    }
    catch { return null; }
  },
  async searchOtherBranchesByName(search: string, limit = 50) {
    const query = search.trim();
    if (query.length < 2) return [];
    const branch = await getCurrentBranch();
    const rows = await itemRows('patient', {
      filter: {
        custodian_branch: { _neq: String(branch.id) },
        _or: [
          { first_name: { _icontains: query } },
          { last_name: { _icontains: query } },
        ],
      },
      fields: ['id', 'first_name', 'last_name'],
      sort: ['last_name', 'first_name', 'id'], limit: Math.max(1, Math.min(limit, 50)),
    });
    const access = await patientAccessFilter('patient');
    const visibleRows = rows.length ? await itemRows('patient', { fields: ['id'], limit: 50,
      filter: { _and: [access, { id: { _in: rows.map((row) => row.id) } }] } }) : [];
    const accessible = new Set(visibleRows.map((row) => row.id));
    return rows
      .map((row) => ({
        id: String(row.id),
        name: `${text(row, 'first_name') ?? ''} ${text(row, 'last_name') ?? ''}`.trim(),
        hasAccess: accessible.has(String(row.id)),
      }))
      .slice(0, Math.max(1, Math.min(limit, 50)));
  },
  async create(data: Partial<Patient>, photo?: File) {
    return savePatientRecord(data, photo);
  },
  async update(id: string, data: Partial<Patient>, photo?: File) {
    return savePatientRecord(data, photo, id);
  },
};

export const likhaEncounters = {
  async getAll(params?: { patientId?: string; status?: string; page?: number; limit?: number; dateFrom?: string; dateTo?: string; search?: string; kind?: string }, signal?: AbortSignal) {
    const access = await patientAccessFilter('encounter');
    const filters: Record<string, unknown>[] = [{ patient: access }];
    if (params?.patientId) filters.push({ patient: { _eq: params.patientId } });
    if (params?.status) filters.push({ status: params.status === 'completed' ? { _eq: 'Completed' }
      : params.status === 'in_progress' ? { _in: ['not_completed', 'In Progress'] } : { _nin: ['Completed', 'not_completed', 'In Progress'] } });
    if (params?.dateFrom || params?.dateTo) filters.push({ encounter_date: {
      ...(params.dateFrom ? { _gte: params.dateFrom } : {}), ...(params.dateTo ? { _lt: params.dateTo } : {}),
    } });
    if (params?.kind === 'outpatient') filters.push({ _or: [{ encounter_type: { _starts_with: 'OPD' } }, { encounter_type: { _null: true } }] });
    if (params?.kind === 'corporate') filters.push({ _or: [{ encounter_type: { _starts_with: 'PEME' } }, { encounter_type: { _starts_with: 'APE' } }] });
    for (const term of params?.search?.trim().split(/\s+/).filter(Boolean) ?? []) filters.push({ _or: [
      { patient: { first_name: { _icontains: term } } }, { patient: { last_name: { _icontains: term } } },
      { encounter_type: { _icontains: term } }, { service: { catalog_service_id: { name: { _icontains: term } } } },
    ] });
    const result = await itemPage('encounter', {
      filter: { _and: filters }, sort: ['-encounter_date', 'id'], fields: encounterFields,
    }, params?.page, params?.limit, signal);
    return { data: result.data.map(mapEncounter), total: result.total };
  },
  async getOne(id: string, signal?: AbortSignal) {
    try {
      const rows = await itemRows('encounter', { fields: ['*', ...encounterFields], limit: 1,
        filter: { _and: [{ id: { _eq: id } }, { patient: await patientAccessFilter('encounter') }] } }, signal);
      return rows[0] ? mapEncounter(rows[0]) : null;
    }
    catch { return null; }
  },
  async create(data: Partial<Encounter>) {
    const patientId = relationId(data.patient_id);
    if (!patientId || !await isPatientCustodian(patientId)) {
      throw new Error('You cannot create or modify encounters for a patient outside your branch.');
    }
    const cmsEncounterType = data.encounter_type === 'OPD' ? 'OPD (Outpatient)'
      : data.encounter_type === 'PEME' ? 'PEME (Newly Hired)'
      : data.encounter_type === 'APE' ? 'APE (Long-time employee)'
      : data.encounter_type;
    const created = await likha.request(createItem('encounter', {
      patient: data.patient_id, encounter_date: data.encounter_date,
      encounter_type: cmsEncounterType,
      payment_route: data.payment_route === 'Personal Upfront' ? 'personal_upfront'
        : data.payment_route === 'Company Billed' ? 'company_billed' : data.payment_route,
      company: data.company, corporate_request: data.corporate_request,
      status: data.status === 'completed' ? 'Completed' : 'not_completed',
    })) as CmsRecord;
    const serviceLinks = data.services_selected ?? [];
    if (serviceLinks.length) {
      await Promise.all(serviceLinks.map((service) => likha.request(createItem('encounter_catalog_service', {
        encounter_id: created.id,
        catalog_service_id: service.id,
        saved_price: service.price,
      }))));
    }
    return mapEncounter({
      ...created,
      service: serviceLinks.map((service) => ({
        catalog_service_id: { id: service.id, name: service.name, department: service.department }, saved_price: service.price,
      })),
    } as CmsRecord);
  },
};

export const likhaInvoices = {
  async getSummary(signal?: AbortSignal) {
    const rows = await requestItems<Array<{ status: string | null; count: { id: string }; sum: { total_amount: string | null } }>>('invoice', {
      filter: { patient: await patientAccessFilter('invoice') },
      groupBy: 'status', aggregate: { count: ['id'], sum: ['total_amount'] },
    }, signal);
    return rows.reduce((totals, row) => {
      totals.total += Number(row.count.id);
      if (row.status?.toLowerCase() === 'draft') totals.draft += Number(row.count.id);
      if (row.status?.toLowerCase() === 'paid') totals.paidValue += Number(row.sum.total_amount ?? 0);
      if (['issued', 'unpaid'].includes(row.status?.toLowerCase() ?? '')) totals.unpaidValue += Number(row.sum.total_amount ?? 0);
      return totals;
    }, { total: 0, draft: 0, paidValue: 0, unpaidValue: 0 });
  },
  async hasOutpatientInvoiceForEncounter(encounterId: string) {
    const encounter = await likhaEncounters.getOne(encounterId);
    const patientId = encounter ? relationId(encounter.patient_id) : null;
    if (!patientId || !await hasPatientScopeAccess(patientId, 'invoice')) return false;

    const serviceRequests = await listAll('service_request', {
      fields: ['id'],
      filter: { encounter: { _eq: encounterId } },
    });
    const serviceRequestIds = (serviceRequests ?? []).map((row) => String(row.id));
    if (serviceRequestIds.length === 0) return false;

    const lineItems = await listAll('invoice_line_item', {
      fields: ['invoice'],
      filter: { service_request: { _in: serviceRequestIds } },
    });
    const invoiceIds = [...new Set((lineItems ?? []).map((row) => relationId((row as CmsRecord).invoice)).filter((id): id is string => Boolean(id)))];
    if (invoiceIds.length === 0) return false;

    const invoices = await listAll('invoice', {
      fields: ['id', 'type'],
      filter: { id: { _in: invoiceIds } },
    });
    return (invoices ?? []).some((row) => text(row as CmsRecord, 'type')?.toLowerCase() === 'outpatient');
  },
  async getAll(params?: { patientId?: string; status?: string; page?: number; limit?: number; search?: string; type?: string }, signal?: AbortSignal) {
    const access = await patientAccessFilter('invoice');
    const terms = params?.search?.trim().split(/\s+/).filter(Boolean) ?? [];
    const filter = {
      _and: [{ patient: access }, ...(params?.patientId ? [{ patient: { _eq: params.patientId } }] : []),
        ...terms.map((term) => ({ _or: [
          { patient: { first_name: { _icontains: term } } }, { patient: { last_name: { _icontains: term } } },
          { company: { name: { _icontains: term } } }, { invoice_number: { _icontains: term } },
        ] })),
      ],
      ...(params?.status ? { status: { _eq: params.status } } : {}),
      ...(params?.type ? { type: { _eq: params.type } } : {}),
    };
    const result = await itemPage('invoice', { filter, sort: ['id'], fields: ['id', 'invoice_number', 'patient.id', 'patient.first_name', 'patient.last_name', 'company', 'type', 'status', 'total_amount'] }, params?.page, params?.limit, signal);
    return { data: result.data.map(mapInvoice), total: result.total };
  },
  async getOne(id: string, signal?: AbortSignal) {
    try {
      const rows = await itemRows('invoice', { fields: ['*', 'patient.id', 'patient.first_name', 'patient.last_name'], limit: 1,
        filter: { _and: [{ id: { _eq: id } }, { patient: await patientAccessFilter('invoice') }] } }, signal);
      return rows[0] ? mapInvoice(rows[0]) : null;
    }
    catch { return null; }
  },
  async getLineItems(invoiceId: string): Promise<import('@/types').InvoiceLineItem[]> {
    if (!await this.getOne(invoiceId)) return [];
    const rows = await list('invoice_line_item', { limit: 100, filter: { invoice: { _eq: invoiceId } } });
    return (rows ?? []).map((row) => {
      const item = row as CmsRecord;
      return {
        id: String(item.id), invoice_id: relationId(item.invoice) ?? invoiceId,
        description: text(item, 'description') ?? '', amount: number(item, 'amount'),
        service_request: relationId(item.service_request),
      };
    });
  },
  async generateForEncounter(encounter: Encounter) {
    const patientId = relationId(encounter.patient_id);
    if (!patientId || !await isPatientCustodian(patientId)) throw new Error('Interclinic records are read-only.');
    if (encounter.encounter_type?.startsWith('OPD')) {
      if (!encounter.services_selected?.length) throw new Error('Select at least one service before generating an outpatient invoice.');
      if (await likhaInvoices.hasOutpatientInvoiceForEncounter(encounter.id)) throw new Error('An outpatient invoice has already been generated for this encounter.');
      return likha.request(triggerFlow('POST', '0ad6cb38-ee22-4779-8d16-9d8f1ee953ea', {
        keys: [encounter.id],
        collection: 'encounter',
      } as unknown as Record<string, string>));
    }
    if (encounter.corporate_request) {
      return likha.request(triggerFlow('POST', '2d601aeb-7fd0-49c0-bc69-158b2ef81781', {
        keys: [encounter.corporate_request],
        collection: 'corporate_request',
      } as unknown as Record<string, string>));
    }
    throw new Error('This encounter has no corporate request to generate an invoice from.');
  },
  async generateForCorporateRequest(requestId: string) {
    return likha.request(triggerFlow('POST', '2d601aeb-7fd0-49c0-bc69-158b2ef81781', {
      keys: [requestId],
      collection: 'corporate_request',
    } as unknown as Record<string, string>));
  },
  async receivePayment(id: string) {
    const invoice = await this.getOne(id);
    const patientId = invoice ? relationId(invoice.patient_id) : null;
    if (!patientId || !await isPatientCustodian(patientId)) throw new Error('Interclinic invoices are read-only.');
    return likha.request(triggerFlow('POST', '19588943-5caa-40fc-bbd3-6d85bfabfd13', {
      keys: [id],
      collection: 'invoice',
    } as unknown as Record<string, string>));
  },
  async generateBillingStatement(id: string) {
    const invoice = await this.getOne(id);
    const patientId = invoice ? relationId(invoice.patient_id) : null;
    if (!patientId || !await isPatientCustodian(patientId)) throw new Error('Interclinic invoices are read-only.');
    return likha.request(triggerFlow('POST', 'fe038a42-17e5-47e1-bb64-58215a6e29cb', {
      keys: [id],
      collection: 'invoice',
    } as unknown as Record<string, string>));
  },
};

export const likhaCompanies = {
  mapCompany(row: CmsRecord): Company {
    return {
      id: String(row.id), name: text(row, 'name') ?? '',
      contract_status: text(row, 'contract_status') as Company['contract_status'],
      billing_address: text(row, 'billing_address') ?? '',
    };
  },
  async getAll(): Promise<{ data: Company[]; total: number }> {
    const rows = await list('company', { limit: 1000, sort: ['name'] });
    const data = (rows ?? []).map((row) => this.mapCompany(row as CmsRecord));
    return paginated(data);
  },
  async getOne(id: string): Promise<Company | null> {
    try { return this.mapCompany(await likha.request(readItem('company', id)) as CmsRecord); }
    catch { return null; }
  },
  async create(data: Partial<Company>) {
    const row = await likha.request(createItem('company', data));
    return { id: row.id, name: row.name, contract_status: row.contract_status, billing_address: row.billing_address } as Company;
  },
  async update(id: string, data: Partial<Company>) {
    const row = await likha.request(updateItem('company', id, data));
    return this.mapCompany(row as CmsRecord);
  },
};

function mapCorporateRequest(row: CmsRecord): CorporateRequest {
  return {
    id: String(row.id), company_code: text(row, 'company_code'),
    company: relationId(row.company) ?? '',
    request_type: text(row, 'request_type') as CorporateRequest['request_type'],
    status: text(row, 'status')?.toLowerCase() as CorporateRequest['status'],
    schedule_start_date_: text(row, 'schedule_start_date_'),
    schedule_end_date: text(row, 'schedule_end_date'),
    quoted_price: value(row, 'quoted_price') as number | null,
    corporate_request_date_submitted: text(row, 'corporate_request_date_submitted'),
    is_invoiced: Boolean(value(row, 'is_invoiced')),
    finalize_request: Boolean(value(row, 'finalize_request')),
    notes: text(row, 'notes'),
  };
}

export const likhaCorporateRequests = {
  async getAll(params?: { companyId?: string; status?: string; search?: string; page?: number; limit?: number }) {
    const filter = {
      ...(params?.companyId ? { company: { _eq: params.companyId } } : {}),
      ...(params?.status ? { status: { _eq: params.status } } : {}),
    };
    const rows = await list('corporate_request', {
      filter, limit: 100, sort: ['-corporate_request_date_submitted'],
    });
    const data = (rows ?? []).map((row) => mapCorporateRequest(row as CmsRecord)).filter((item) =>
      !params?.search || `${item.company_code ?? ''} ${item.id} ${item.request_type}`.toLowerCase().includes(params.search.toLowerCase()),
    );
    return paginated(data, data.length, params?.page, params?.limit);
  },
  async getOne(id: string) {
    try { return mapCorporateRequest(await likha.request(readItem('corporate_request', id)) as CmsRecord); }
    catch { return null; }
  },
  async create(data: Pick<CorporateRequest, 'company' | 'request_type'> & Partial<CorporateRequest>) {
    const created = await likha.request(createItem('corporate_request', {
      company: typeof data.company === 'string' ? data.company : data.company.id,
      request_type: data.request_type,
      status: data.status ?? 'query',
      corporate_request_date_submitted: data.corporate_request_date_submitted ?? new Date().toISOString(),
      schedule_start_date_: data.schedule_start_date_ ?? null,
      schedule_end_date: data.schedule_end_date ?? null,
      quoted_price: data.quoted_price ?? null,
      notes: data.notes ?? null,
      finalize_request: data.finalize_request ?? false,
      is_invoiced: false,
    }));
    return mapCorporateRequest(created as CmsRecord);
  },
  async getByCompany(companyId: string) {
    return (await this.getAll({ companyId, limit: 100 })).data;
  },
};

export const likhaStaff = {
  mapEmployee(row: CmsRecord): Employee {
    return {
      id: String(row.id),
      corporate_request_id: relationId(row.corporate_request) ?? '',
      patient_id: relationId(row.patient),
      first_name: text(row, 'first_name') ?? '',
      middle_name: text(row, 'middle_name'),
      last_name: text(row, 'last_name') ?? '',
      sex: text(row, 'sex'),
      civil_status: text(row, 'civil_status'),
      mobile_number: text(row, 'mobile_number'),
      email: text(row, 'email'),
      address: text(row, 'address'),
      date_of_birth: text(row, 'date_of_birth'),
    };
  },
  async getAll() {
    const rows = await list('employee', { limit: 1000, sort: ['last_name', 'first_name'] });
    return (rows ?? []).map((row) => this.mapEmployee(row as CmsRecord));
  },
  async create(data: Pick<Employee, 'corporate_request_id' | 'first_name' | 'last_name'> & Partial<Employee>) {
    const row = await likha.request(createItem('employee', {
      corporate_request: data.corporate_request_id,
      patient: data.patient_id ?? null,
      first_name: data.first_name,
      middle_name: data.middle_name ?? null,
      last_name: data.last_name,
      sex: data.sex ?? null,
      civil_status: data.civil_status ?? null,
      mobile_number: data.mobile_number ?? null,
      email: data.email ?? null,
      address: data.address ?? null,
      date_of_birth: data.date_of_birth ?? null,
    }));
    return this.mapEmployee(row as CmsRecord);
  },
};

export const likhaServices = {
  mapService(row: CmsRecord): CatalogService {
    const rawStatus = (text(row, 'status') ?? 'queue').toLowerCase();
    const status = rawStatus === 'not avail' || rawStatus === 'not_avail' ? 'unavailable' : 'available';
    const labResults = value(row, 'lab_results');
    return {
      id: String(row.id), name: text(row, 'name') ?? '',
      description: text(row, 'description'), category: text(row, 'department'),
      price: number(row, 'price'), department: text(row, 'department'),
      status, is_active: status === 'available',
      linked_collection: text(row, 'linked_collection'),
      lab_results: Array.isArray(labResults) ? labResults.map(String) : [],
    };
  },
  async getAll(): Promise<CatalogService[]> {
    const rows = await list('catalog_service', { limit: 1000, sort: ['name'] });
    return (rows ?? []).map((row) => this.mapService(row as CmsRecord));
  },
  async create(data: Pick<CatalogService, 'name' | 'price'> & Partial<CatalogService>): Promise<CatalogService> {
    const row = await likha.request(createItem('catalog_service', {
      name: data.name,
      price: data.price,
      description: data.description ?? null,
      department: data.department ?? null,
      status: data.status === 'unavailable' ? 'not_avail' : 'queue',
      linked_collection: data.linked_collection ?? null,
      lab_results: data.lab_results ?? [],
    }));
    return this.mapService(row as CmsRecord);
  },
};

export const likhaInventory = {
  async getAll(params?: { status?: string; search?: string; page?: number; limit?: number }) {
    const rows = await list('inventory_item', { sort: ['name'] });
    const mapped = (rows ?? []).map((row) => {
      const item = row as CmsRecord;
      const stock = number(item, 'stock_quantity');
      return {
        id: String(item.id),
        name: text(item, 'name') ?? '',
        unit: text(item, 'unit_of_measure') ?? '', current_stock: stock,
        minimum_stock: number(item, 'reorder_level'),
        status: (stock === 0 ? 'out_of_stock' : stock <= number(item, 'reorder_level') ? 'low_stock' : 'in_stock') as InventoryItem['status'],
      };
    });
    const data = mapped.filter((item) =>
      (!params?.status || item.status === params.status) &&
      (!params?.search || `${item.name} ${item.id}`.toLowerCase().includes(params.search.toLowerCase())),
    );
    return paginated(data, data.length, params?.page, params?.limit);
  },
  async create(data: Pick<InventoryItem, 'name' | 'unit' | 'current_stock' | 'minimum_stock'>) {
    const row = await likha.request(createItem('inventory_item', {
      name: data.name.trim(),
      stock_quantity: data.current_stock,
      unit_of_measure: data.unit,
      reorder_level: data.minimum_stock,
    }));
    const item = row as CmsRecord;
    const stock = number(item, 'stock_quantity');
    const reorder = number(item, 'reorder_level');
    return {
      id: String(item.id), name: text(item, 'name') ?? '',
      unit: text(item, 'unit_of_measure') ?? '', current_stock: stock,
      minimum_stock: reorder,
      status: (stock === 0 ? 'out_of_stock' : stock <= reorder ? 'low_stock' : 'in_stock') as InventoryItem['status'],
    } satisfies InventoryItem;
  },
};

export const resultCollections = [
  'results_covid_antigen', 'results_clinical_chemistry', 'results_drug_test', 'results_ecg',
  'results_hematology', 'results_hematology_cbc', 'results_hematology_pbs',
  'results_immunochemistry', 'results_urinalysis', 'results_microbiology_koh',
  'results_pap_smear', 'results_parasitology', 'results_serology', 'results_serology_new',
  'results_sperm_analysis', 'results_os_xray', 'results_others', 'results_ultrasound', 'results_xray',
] as const;
export type ResultCollection = (typeof resultCollections)[number];

function resultCategory(collection: string): import('@/types').LabResult['category'] {
  if (collection.includes('hematology')) return 'hematology';
  if (collection.includes('chemistry')) return 'clinical_chemistry';
  if (collection.includes('urinalysis')) return 'urinalysis';
  if (collection.includes('serology') || collection.includes('covid')) return 'serology';
  if (collection.includes('microbiology') || collection.includes('parasitology')) return 'microbiology';
  if (collection.includes('xray') || collection.includes('ultrasound') || collection.includes('ecg')) return 'imaging';
  return 'other';
}

function labSummaryFields(collection: ResultCollection) {
  const fields = ['id', 'Status', 'encounter.id', 'encounter.patient.id', 'encounter.patient.first_name', 'encounter.patient.last_name', 'encounter.encounter_date'];
  if (collection === 'results_covid_antigen') fields.push('Date_and_Time_of_Collection', 'Date_and_Time_of_Results', 'Remarks');
  if (collection === 'results_clinical_chemistry' || collection === 'results_hematology_cbc') fields.push('Remarks');
  if (collection === 'results_ecg') fields.push('Remarks_or_Recommendation');
  return fields;
}

function mapLabResult(row: CmsRecord, collection: ResultCollection): import('@/types').LabResult | null {
  const encounter = row.encounter && typeof row.encounter === 'object' ? row.encounter as CmsRecord : null;
  const patientId = encounter ? relationId(encounter.patient) : null;
  if (!patientId) return null;
  return {
    id: String(row.id), patient_id: encounter?.patient && typeof encounter.patient === 'object'
      ? { id: patientId, first_name: text(encounter.patient as CmsRecord, 'first_name') ?? '', last_name: text(encounter.patient as CmsRecord, 'last_name') ?? '' }
      : patientId, encounter_id: relationId(row.encounter),
    test_name: collection.replace('results_', '').replace(/_/g, ' '), category: resultCategory(collection),
    status: text(row, 'Status')?.toLowerCase() as import('@/types').LabResultStatus ?? null,
    collected_date: text(row, 'Date_and_Time_of_Collection'),
    requested_date: encounter ? text(encounter, 'encounter_date') : null,
    released_date: text(row, 'Date_and_Time_of_Results'), result_collection: collection,
    remarks: text(row, 'Remarks') ?? text(row, 'Remarks_or_Recommendation'),
  };
}

async function labFilter(params: { patientId?: string; status?: string }, access?: Record<string, unknown>) {
  const filters: Record<string, unknown>[] = [
    { encounter: { patient: access ?? await patientAccessFilter('laboratory') } },
    ...(params.patientId ? [{ encounter: { patient: { _eq: params.patientId } } }] : []),
    ...(params.status && params.status !== 'all' ? [{ Status: params.status === 'in_progress'
      ? { _in: ['for_encoding', 'processing', 'pending'] }
      : params.status === 'with_results' ? { _in: ['with_results', 'completed', 'released'] } : { _eq: params.status } }] : []),
  ];
  return { _and: filters };
}

function labSearchFilter(filter: Record<string, unknown>, collection: ResultCollection, search?: string) {
  const terms = search?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (!terms.length) return filter;
  const remarkField = collection === 'results_ecg' ? 'Remarks_or_Recommendation'
    : ['results_covid_antigen', 'results_clinical_chemistry', 'results_hematology_cbc'].includes(collection) ? 'Remarks' : null;
  return { _and: [filter, ...terms.filter((term) => !collection.replace(/_/g, ' ').toLowerCase().includes(term.toLowerCase())).map((term) => ({ _or: [
    { encounter: { patient: { first_name: { _icontains: term } } } },
    { encounter: { patient: { last_name: { _icontains: term } } } },
    ...(remarkField ? [{ [remarkField]: { _icontains: term } }] : []),
  ] }))] };
}

export const likhaLabResults = {
  async getCollectionRecord(collection: ResultCollection, id: string, signal?: AbortSignal) {
    const access = await labFilter({});
    const rows = await itemRows(collection, { fields: ['*', 'encounter.id', 'encounter.patient.id', 'encounter.patient.first_name', 'encounter.patient.last_name'],
      filter: { _and: [access, { id: { _eq: id } }] }, limit: 1 }, signal);
    return rows[0] ?? null;
  },
  async getCounts(collection?: ResultCollection, signal?: AbortSignal) {
    const filter = await labFilter({});
    const groups = await Promise.all((collection ? [collection] : resultCollections).map((source) =>
      requestItems<Array<{ Status: string | null; count: { id: string } }>>(source, { filter, aggregate: { count: ['id'] }, groupBy: 'Status' }, signal),
    ));
    const counts = { total: 0, inProgress: 0, withResults: 0 };
    for (const group of groups.flat()) {
      const count = Number(group.count.id);
      counts.total += count;
      if (['for_encoding', 'processing', 'pending'].includes(group.Status?.toLowerCase() ?? '')) counts.inProgress += count;
      if (['with_results', 'completed', 'released'].includes(group.Status?.toLowerCase() ?? '')) counts.withResults += count;
    }
    return counts;
  },
  async getCollection(collection: ResultCollection): Promise<CmsRecord[]> {
    return listAll(collection, { filter: await labFilter({}) });
  },
  async getCollectionPage(collection: ResultCollection, params: { page: number; limit: number; status?: string; search?: string }, signal?: AbortSignal) {
    return itemPage(collection, { filter: labSearchFilter(await labFilter(params), collection, params.search), fields: ['*', 'encounter.id', 'encounter.patient.id', 'encounter.patient.first_name', 'encounter.patient.last_name'], sort: ['-encounter.encounter_date', 'id'] }, params.page, params.limit, signal);
  },
  async createInCollection(collection: ResultCollection, data: Record<string, unknown>): Promise<CmsRecord> {
    const encounterId = relationId(data.encounter);
    const encounter = encounterId ? await likhaEncounters.getOne(encounterId) : null;
    const patientId = encounter ? relationId(encounter.patient_id) : null;
    if (!patientId || !await isPatientCustodian(patientId)) throw new Error('Laboratory records can only be added for patients owned by your branch.');
    return await likha.request(createItem(collection, data)) as CmsRecord;
  },
  async uploadFile(file: File): Promise<string> {
    const body = new FormData();
    body.append('file', file);
    const uploaded = await likha.request(uploadFiles(body));
    return String(uploaded.id);
  },
  async getAll(params?: { patientId?: string; status?: string; category?: string; page?: number; limit?: number; id?: string; search?: string }, signal?: AbortSignal): Promise<{ data: import('@/types').LabResult[]; total: number }> {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.max(1, params?.limit ?? 10);
    const filter = await labFilter(params ?? {});
    if (params?.id) filter._and.push({ id: { _eq: params.id } });
    const collections = resultCollections.filter((collection) => {
      if (params?.category && params.category !== 'all' && resultCategory(collection) !== params.category) return false;
      if (!params?.id) return true;
      return collection === 'results_hematology' ? /^\d+$/.test(params.id) : /^[0-9a-f-]{36}$/i.test(params.id);
    });
    const sources = await Promise.all(collections.map(async (collection) => {
      const result = await itemPage(collection, {
        filter: labSearchFilter(filter, collection, params?.search), sort: ['-encounter.encounter_date', 'id'], fields: labSummaryFields(collection),
      }, 1, page * limit, signal);
      return { collection, ...result };
    }));
    // Match PostgreSQL DESC null ordering and hematology's integer primary key.
    const results = sources.flatMap(({ collection, data }) => data.flatMap((row) => {
      const mapped = mapLabResult(row, collection);
      const encounter = row.encounter as CmsRecord | null;
      return mapped ? [{ mapped, date: encounter ? text(encounter, 'encounter_date') ?? '' : '' }] : [];
    })).sort((a, b) => ((!a.date || !b.date) && a.date !== b.date ? (!a.date ? -1 : 1) : b.date.localeCompare(a.date))
      || a.mapped.result_collection.localeCompare(b.mapped.result_collection)
      || (a.mapped.result_collection === 'results_hematology' ? Number(a.mapped.id) - Number(b.mapped.id) : a.mapped.id.localeCompare(b.mapped.id)));
    return { data: results.slice((page - 1) * limit, page * limit).map((row) => row.mapped), total: sources.reduce((sum, source) => sum + source.total, 0) };
  },
  async getOne(id: string, signal?: AbortSignal): Promise<import('@/types').LabResult | null> {
    const result = await this.getAll({ id, limit: 1 }, signal);
    return result.data.find((item) => item.id === id) ?? null;
  },
};
function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
}

export const likhaDashboard = {
  async getMetrics(signal?: AbortSignal) {
    const [patients, encounters, invoices, labs] = await Promise.all([
      patientAccessFilter('patient'), patientAccessFilter('encounter'), patientAccessFilter('invoice'), patientAccessFilter('laboratory'),
    ]);
    const range = todayRange();
    const encounterFilter = { patient: encounters };
    const labScope = await labFilter({ status: 'for_encoding' }, labs);
    const [totalPatients, todayEncounters, inProgressEncounters, completedEncounters, paidInvoiceValue, pendingLabCounts] = await Promise.all([
      aggregateValue('patient', patients, 'count', 'id', signal),
      aggregateValue('encounter', { ...encounterFilter, encounter_date: { _gte: range.dateFrom, _lt: range.dateTo } }, 'count', 'id', signal),
      aggregateValue('encounter', { ...encounterFilter, status: { _in: ['not_completed', 'In Progress'] } }, 'count', 'id', signal),
      aggregateValue('encounter', { ...encounterFilter, status: { _eq: 'Completed' } }, 'count', 'id', signal),
      aggregateValue('invoice', { patient: invoices, status: { _eq: 'paid' } }, 'sum', 'total_amount', signal),
      Promise.all(resultCollections.map((collection) => aggregateValue(collection, labScope, 'count', 'id', signal))),
    ]);
    return {
      totalPatients, todayEncounters, inProgressEncounters, completedEncounters, paidInvoiceValue,
      pendingLabResults: pendingLabCounts.reduce((sum, count) => sum + count, 0),
    };
  },
  async getTodayEncounters(signal?: AbortSignal) {
    const access = await patientAccessFilter('encounter');
    const range = todayRange();
    const rows = await itemRows('encounter', {
      filter: { patient: access, encounter_date: { _gte: range.dateFrom, _lt: range.dateTo } },
      fields: encounterFields, sort: ['encounter_date', 'id'], limit: 20,
    }, signal);
    return rows.map(mapEncounter);
  },
  async getQueue(signal?: AbortSignal) {
    const range = todayRange();
    const access = await patientAccessFilter('encounter');
    const result = await itemPage('encounter', {
      filter: {
        status: { _eq: 'not_completed' },
        patient: access,
        encounter_date: { _gte: range.dateFrom, _lt: range.dateTo },
      },
      sort: ['encounter_date'],
      fields: encounterFields,
    }, undefined, undefined, signal);
    return result.data.map((row) => mapEncounter(row as CmsRecord))
      .filter((encounter) => encounter.status === 'in_progress')
      .sort((left, right) => left.encounter_date.localeCompare(right.encounter_date));
  },
  async getRecentLabResults(signal?: AbortSignal): Promise<import('@/types').LabResult[]> {
    return (await likhaLabResults.getAll({ limit: 5 }, signal)).data;
  },
};

export const likhaAnalytics = {
  async getData(filter?: import('@/types').AnalyticsFilter): Promise<import('@/types').AnalyticsData> {
    const [patients, encounters, labs, invoices] = await Promise.all([
      likhaPatients.getAll({ limit: 1000 }), likhaEncounters.getAll({ limit: 1000 }),
      likhaLabResults.getAll({ limit: 10000 }),
      likhaInvoices.getAll({ limit: 1000 }),
    ]);
    const isInRange = (date: string | null | undefined) => {
      if (!date) return !filter?.dateFrom && !filter?.dateTo;
      const day = date.slice(0, 10);
      return (!filter?.dateFrom || day >= filter.dateFrom)
        && (!filter?.dateTo || day <= filter.dateTo);
    };
    const filteredEncounters = encounters.data.filter((item) => isInRange(item.encounter_date));
    const filteredLabs = labs.data.filter((item) => isInRange(item.collected_date ?? item.released_date));
    const filteredInvoices = invoices.data;
    const totalInvoiced = filteredInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0);
    const paidInvoices = filteredInvoices.filter((invoice) => invoice.status === 'paid');
    const issuedUnpaidInvoiceValue = filteredInvoices
      .filter((invoice) => invoice.status === 'issued' || invoice.status === 'unpaid')
      .reduce((sum, invoice) => sum + invoice.total_amount, 0);
    const ageRanges = [
      { label: '0–17', min: 0, max: 17 },
      { label: '18–34', min: 18, max: 34 },
      { label: '35–49', min: 35, max: 49 },
      { label: '50–64', min: 50, max: 64 },
      { label: '65+', min: 65, max: Infinity },
    ];
    const patientsWithAge = patients.data.flatMap((patient) => {
      if (!patient.date_of_birth) return [];
      const date = new Date(patient.date_of_birth);
      if (Number.isNaN(date.getTime())) return [];
      return [{ ...patient, age: new Date().getFullYear() - date.getFullYear() - (new Date() < new Date(new Date().getFullYear(), date.getMonth(), date.getDate()) ? 1 : 0) }];
    });
    const byAge = ageRanges.map((range) => ({
      label: range.label,
      count: patientsWithAge.filter((patient) => patient.age >= range.min && patient.age <= range.max).length,
      percentage: patientsWithAge.length ? Math.round(patientsWithAge.filter((patient) => patient.age >= range.min && patient.age <= range.max).length / patientsWithAge.length * 100) : 0,
    }));
    const sexCounts = new Map<string, number>();
    for (const patient of patients.data) {
      const sex = patient.sex?.toLowerCase() || 'not recorded';
      sexCounts.set(sex, (sexCounts.get(sex) ?? 0) + 1);
    }
    const bySex = [...sexCounts.entries()].map(([label, count]) => ({
      label,
      count,
      percentage: patients.data.length ? Math.round(count / patients.data.length * 100) : 0,
    }));
    const visitsByDate = new Map<string, number>();
    const encountersByService = new Map<string, number>();
    const encountersByStatus = new Map<string, number>();
    for (const encounter of filteredEncounters) {
      const date = encounter.encounter_date.slice(0, 10);
      visitsByDate.set(date, (visitsByDate.get(date) ?? 0) + 1);
      encountersByStatus.set(encounter.status, (encountersByStatus.get(encounter.status) ?? 0) + 1);
      const services = encounter.services_selected?.map((item) => item.name).filter(Boolean) ?? [];
      if (!services.length && encounter.service) services.push(encounter.service);
      for (const service of services) encountersByService.set(service, (encountersByService.get(service) ?? 0) + 1);
    }
    const labsByCategory = new Map<string, number>();
    for (const lab of filteredLabs) labsByCategory.set(lab.category, (labsByCategory.get(lab.category) ?? 0) + 1);
    const encountersOverTime = [...visitsByDate.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([date, encounters]) => ({ date, encounters }));
    const statuses = [...encountersByStatus.entries()].map(([status, count]) => ({ status, count }));
    const serviceCounts = [...encountersByService.entries()].map(([service, count]) => ({ service, count }));
    const labCategoryCounts = [...labsByCategory.entries()].map(([category, count]) => ({ category, count }));
    const invoiceStatus = [...new Set(filteredInvoices.map((invoice) => invoice.status).filter((status): status is NonNullable<typeof status> => Boolean(status)))].map((status) => ({
      status,
      count: filteredInvoices.filter((invoice) => invoice.status === status).length,
    }));

    return {
      kpis: { totalPatients: patients.total, totalEncounters: filteredEncounters.length,
        completedEncounters: filteredEncounters.filter((item) => item.status === 'completed').length,
        labTests: filteredLabs.length, paidInvoiceValue: paidInvoices.reduce((sum, invoice) => sum + invoice.total_amount, 0),
        totalInvoices: filteredInvoices.length, paidInvoices: paidInvoices.length, totalInvoiced, issuedUnpaidInvoiceValue },
      encountersOverTime,
      demographics: { byAge, bySex },
      encountersByService: serviceCounts,
      labTestsByCategory: labCategoryCounts,
      encounterStatus: statuses,
      invoiceStatus,
    };
  },
};
