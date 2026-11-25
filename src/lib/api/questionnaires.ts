import { likhaAuth } from '@/lib/api/likha';
import type { QuestionnairePatient, QuestionnaireResponse, QuestionnaireSchema, QuestionnaireValue } from '@/types/questionnaire';

async function request<T>(path = '', options: RequestInit = {}) {
  const token = await likhaAuth.getAccessToken();
  if (!token) throw new Error('Sign in again to access questionnaire responses.');
  const response = await fetch(`/api/questionnaire-responses${path}`, {
    ...options, cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error ?? 'Unable to access questionnaire responses.'), { status: response.status });
  return body as T;
}

export const questionnaireResponses = {
  list(params: { page: number; limit: number; search: string; status: string }, signal?: AbortSignal) {
    const query = new URLSearchParams({ ...params, page: String(params.page), limit: String(params.limit) });
    return request<{ data: QuestionnaireResponse[]; total: number }>(`?${query}`, { signal });
  },
  async schema(signal?: AbortSignal) {
    return (await request<{ data: QuestionnaireSchema }>('?view=schema', { signal })).data;
  },
  async patients(search: string, signal?: AbortSignal) {
    return (await request<{ data: QuestionnairePatient[] }>(`?${new URLSearchParams({ view: 'patients', search })}`, { signal })).data;
  },
  async get(id: string, signal?: AbortSignal) {
    return (await request<{ data: QuestionnaireResponse }>(`/${encodeURIComponent(id)}`, { signal })).data;
  },
  async save(input: { id?: string; patientId: string; values: Record<string, QuestionnaireValue> }) {
    return request<{ data: { id: string } }>(input.id ? `/${encodeURIComponent(input.id)}` : '', {
      method: input.id ? 'PATCH' : 'POST', body: JSON.stringify({ patientId: input.patientId, values: input.values }),
    });
  },
};
