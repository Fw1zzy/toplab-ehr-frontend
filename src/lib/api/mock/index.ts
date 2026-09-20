import {
  MOCK_PATIENTS,
  MOCK_ENCOUNTERS,
  MOCK_LAB_RESULTS,
  MOCK_INVOICES,
  MOCK_INVENTORY,
  MOCK_SERVICES,
  MOCK_DASHBOARD_METRICS,
  MOCK_ANALYTICS_DATA,
  MOCK_PAYMENTS,
  MOCK_MEDICAL_RECORDS,
} from './data';
import {
  Patient,
  Encounter,
  LabResult,
  Invoice,
  InventoryItem,
  CatalogService,
  DashboardMetrics,
  AnalyticsData,
  AnalyticsFilter,
  Payment,
  MedicalRecord,
} from '@/types';
import { sleep } from '@/lib/utils';

// Simulate network latency
const DELAY = 400;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const mockAuth = {
  async login(email: string, password: string) {
    await sleep(DELAY);
    if (email === 'admin@toplab.com' && password === 'password') {
      return {
        user: {
          id: 'user-001',
          first_name: 'Admin',
          last_name: 'User',
          email: 'admin@toplab.com',
          avatar: null,
          role: 'administrator',
          status: 'active' as const,
          last_access: new Date().toISOString(),
          last_page: '/dashboard',
          roleName: 'administrator' as const,
          permissions: ['*'],
        },
        access_token: 'mock-access-token-admin',
        refresh_token: 'mock-refresh-token-admin',
        expires: Date.now() + 3600000,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      };
    }
    if (email === 'doctor@toplab.com' && password === 'password') {
      return {
        user: {
          id: 'user-doc-001',
          first_name: 'Ricardo',
          last_name: 'Santos',
          email: 'doctor@toplab.com',
          avatar: null,
          role: 'doctor',
          status: 'active' as const,
          last_access: new Date().toISOString(),
          last_page: '/dashboard',
          roleName: 'doctor' as const,
          permissions: ['patients:read', 'encounters:*', 'laboratory:read'],
        },
      };
    }
    if (email === 'nurse@toplab.com' && password === 'password') {
      return {
        user: {
          id: 'user-nurse-001',
          first_name: 'Sandra',
          last_name: 'Torres',
          email: 'nurse@toplab.com',
          avatar: null,
          role: 'nurse',
          status: 'active' as const,
          last_access: new Date().toISOString(),
          last_page: '/dashboard',
          roleName: 'nurse' as const,
          permissions: ['patients:read', 'encounters:read', 'queue:*'],
        },
      };
    }
    throw new Error('Invalid email or password');
  },

  async logout() {
    await sleep(200);
  },

  async getCurrentUser() {
    await sleep(200);
    return null;
  },

  async refreshSession() {
    await sleep(200);
    return null;
  },
};

// ─── Patients ─────────────────────────────────────────────────────────────────

export const mockPatients = {
  async getAll(params?: {
    search?: string;
    page?: number;
    limit?: number;
    status?: string;
    branch?: string;
  }): Promise<{ data: Patient[]; total: number }> {
    await sleep(DELAY);
    let data = [...MOCK_PATIENTS];

    if (params?.search) {
      const q = params.search.toLowerCase();
      data = data.filter(
        (p) =>
          p.first_name.toLowerCase().includes(q) ||
          p.last_name.toLowerCase().includes(q) ||
          p.patient_id.toLowerCase().includes(q) ||
          p.contact_number?.includes(q),
      );
    }
    if (params?.status) {
      data = data.filter((p) => p.status === params.status);
    }
    if (params?.branch) {
      data = data.filter((p) => p.branch === params.branch);
    }

    const total = data.length;
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    data = data.slice((page - 1) * limit, page * limit);

    return { data, total };
  },

  async getOne(id: string): Promise<Patient | null> {
    await sleep(DELAY);
    return MOCK_PATIENTS.find((p) => p.id === id) ?? null;
  },

  async create(data: Partial<Patient>): Promise<Patient> {
    await sleep(DELAY);
    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      date_created: new Date().toISOString(),
      date_updated: null,
      patient_id: `TL-${new Date().getFullYear()}-${String(MOCK_PATIENTS.length + 1).padStart(4, '0')}`,
      first_name: data.first_name ?? '',
      middle_name: data.middle_name ?? null,
      last_name: data.last_name ?? '',
      suffix: data.suffix ?? null,
      date_of_birth: data.date_of_birth ?? '',
      sex: data.sex ?? 'male',
      civil_status: data.civil_status ?? null,
      nationality: data.nationality ?? null,
      religion: data.religion ?? null,
      address: data.address ?? null,
      city: data.city ?? null,
      province: data.province ?? null,
      zip_code: data.zip_code ?? null,
      contact_number: data.contact_number ?? null,
      email: data.email ?? null,
      emergency_contact_name: data.emergency_contact_name ?? null,
      emergency_contact_number: data.emergency_contact_number ?? null,
      emergency_contact_relationship: data.emergency_contact_relationship ?? null,
      philhealth_number: data.philhealth_number ?? null,
      sss_number: data.sss_number ?? null,
      blood_type: data.blood_type ?? null,
      allergies: data.allergies ?? null,
      medical_history: data.medical_history ?? null,
      family_history: data.family_history ?? null,
      social_history: data.social_history ?? null,
      status: 'active',
      branch: data.branch ?? 'Main Branch',
      user_id: null,
    };
    MOCK_PATIENTS.push(newPatient);
    return newPatient;
  },

  async update(id: string, data: Partial<Patient>): Promise<Patient> {
    await sleep(DELAY);
    const idx = MOCK_PATIENTS.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Patient not found');
    MOCK_PATIENTS[idx] = { ...MOCK_PATIENTS[idx], ...data, date_updated: new Date().toISOString() };
    return MOCK_PATIENTS[idx];
  },
};

// ─── Encounters ───────────────────────────────────────────────────────────────

export const mockEncounters = {
  async getAll(params?: {
    patientId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Encounter[]; total: number }> {
    await sleep(DELAY);
    let data = [...MOCK_ENCOUNTERS];
    if (params?.patientId) data = data.filter((e) => e.patient_id === params.patientId);
    if (params?.status) data = data.filter((e) => e.status === params.status);
    const total = data.length;
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    return { data: data.slice((page - 1) * limit, page * limit), total };
  },

  async getOne(id: string): Promise<Encounter | null> {
    await sleep(DELAY);
    return MOCK_ENCOUNTERS.find((e) => e.id === id) ?? null;
  },
};

// ─── Lab Results ──────────────────────────────────────────────────────────────

export const mockLabResults = {
  async getAll(params?: {
    patientId?: string;
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: LabResult[]; total: number }> {
    await sleep(DELAY);
    let data = [...MOCK_LAB_RESULTS];
    if (params?.patientId) data = data.filter((l) => l.patient_id === params.patientId);
    if (params?.status) data = data.filter((l) => l.status === params.status);
    if (params?.category && params.category !== 'all') {
      data = data.filter((l) => l.category === params.category);
    }
    const total = data.length;
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    return { data: data.slice((page - 1) * limit, page * limit), total };
  },

  async getOne(id: string): Promise<LabResult | null> {
    await sleep(DELAY);
    return MOCK_LAB_RESULTS.find((l) => l.id === id) ?? null;
  },
};

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const mockInvoices = {
  async getAll(params?: {
    patientId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Invoice[]; total: number }> {
    await sleep(DELAY);
    let data = [...MOCK_INVOICES];
    if (params?.patientId) data = data.filter((i) => i.patient_id === params.patientId);
    if (params?.status) data = data.filter((i) => i.status === params.status);
    const total = data.length;
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    return { data: data.slice((page - 1) * limit, page * limit), total };
  },

  async getOne(id: string): Promise<Invoice | null> {
    await sleep(DELAY);
    return MOCK_INVOICES.find((i) => i.id === id) ?? null;
  },
};

// ─── Inventory ────────────────────────────────────────────────────────────────

export const mockInventory = {
  async getAll(params?: {
    status?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: InventoryItem[]; total: number }> {
    await sleep(DELAY);
    let data = [...MOCK_INVENTORY];
    if (params?.status) data = data.filter((i) => i.status === params.status);
    if (params?.category) data = data.filter((i) => i.category === params.category);
    if (params?.search) {
      const q = params.search.toLowerCase();
      data = data.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.item_code.toLowerCase().includes(q),
      );
    }
    const total = data.length;
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    return { data: data.slice((page - 1) * limit, page * limit), total };
  },
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const mockDashboard = {
  async getMetrics(): Promise<DashboardMetrics> {
    await sleep(DELAY);
    return MOCK_DASHBOARD_METRICS;
  },

  async getTodayAppointments() {
    await sleep(DELAY);
    return MOCK_ENCOUNTERS.filter(
      (e) => e.status === 'waiting' || e.status === 'in_progress' || e.status === 'scheduled',
    );
  },

  async getQueue() {
    await sleep(DELAY);
    return MOCK_ENCOUNTERS.filter(
      (e) => e.status === 'waiting' || e.status === 'in_progress',
    );
  },

  async getRecentLabResults() {
    await sleep(DELAY);
    return MOCK_LAB_RESULTS.slice(0, 5);
  },
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const mockAnalytics = {
  async getData(_filter?: AnalyticsFilter): Promise<AnalyticsData> {
    await sleep(DELAY);
    return MOCK_ANALYTICS_DATA;
  },
};

// ─── Services ─────────────────────────────────────────────────────────────────

export const mockServices = {
  async getAll(): Promise<CatalogService[]> {
    await sleep(DELAY);
    return MOCK_SERVICES;
  },
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const mockPayments = {
  async getAll(params?: {
    patientId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Payment[]; total: number }> {
    await sleep(DELAY);
    let data = [...MOCK_PAYMENTS];
    if (params?.patientId) data = data.filter((p) => p.patient_id === params.patientId);
    if (params?.status) data = data.filter((p) => p.status === params.status);
    const total = data.length;
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    return { data: data.slice((page - 1) * limit, page * limit), total };
  },

  async getOne(id: string): Promise<Payment | null> {
    await sleep(DELAY);
    return MOCK_PAYMENTS.find((p) => p.id === id) ?? null;
  },
};

// ─── Medical Records ──────────────────────────────────────────────────────────

export const mockMedicalRecords = {
  async getAll(params?: {
    patientId?: string;
    recordType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: MedicalRecord[]; total: number }> {
    await sleep(DELAY);
    let data = [...MOCK_MEDICAL_RECORDS];
    if (params?.patientId) data = data.filter((r) => r.patient_id === params.patientId);
    if (params?.recordType && params.recordType !== 'all') {
      data = data.filter((r) => r.record_type === params.recordType);
    }
    if (params?.status) data = data.filter((r) => r.status === params.status);
    const total = data.length;
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    return { data: data.slice((page - 1) * limit, page * limit), total };
  },

  async getOne(id: string): Promise<MedicalRecord | null> {
    await sleep(DELAY);
    return MOCK_MEDICAL_RECORDS.find((r) => r.id === id) ?? null;
  },
};
