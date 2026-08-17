import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const labKeys = {
  all: ['lab-results'] as const,
  lists: () => [...labKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...labKeys.lists(), params] as const,
  details: () => [...labKeys.all, 'detail'] as const,
  detail: (id: string) => [...labKeys.details(), id] as const,
};

export function useLabResults(params?: {
  patientId?: string;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: labKeys.list(params ?? {}),
    queryFn: () => api.labResults.getAll(params),
    staleTime: 30_000,
  });
}

export function useLabResult(id: string | undefined) {
  return useQuery({
    queryKey: labKeys.detail(id ?? ''),
    queryFn: () => api.labResults.getOne(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function usePatientLabResults(patientId: string | undefined) {
  return useLabResults({ patientId });
}
