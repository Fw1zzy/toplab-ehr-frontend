import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

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
  search?: string;
}, enabled = true) {
  const { isAuthenticated, user } = useAuth();
  const search = useDebouncedValue(params?.search ?? '');
  const queryParams = { ...params, search };
  return useQuery({
    queryKey: [...labKeys.list(queryParams), user?.id],
    queryFn: ({ signal }) => api.labResults.getAll(queryParams, signal),
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
  });
}

export function useLabResult(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...labKeys.detail(id ?? ''), user?.id],
    queryFn: ({ signal }) => api.labResults.getOne(id!, signal),
    enabled: !!id && !!user,
    staleTime: 60_000,
  });
}

export function usePatientLabResults(patientId: string | undefined, enabled = true) {
  return useLabResults({ patientId }, !!patientId && enabled);
}
