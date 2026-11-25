import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Patient } from '@/types';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...patientKeys.lists(), params] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

export function usePatients(params?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const { isAuthenticated, user } = useAuth();
  const search = useDebouncedValue(params?.search ?? '');
  const queryParams = { ...params, search };
  return useQuery({
    queryKey: [...patientKeys.list(queryParams), user?.id],
    queryFn: ({ signal }) => api.patients.getAll(queryParams, signal),
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

export function usePatient(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...patientKeys.detail(id ?? ''), user?.id],
    queryFn: ({ signal }) => api.patients.getOne(id!, signal),
    enabled: !!id && !!user,
    staleTime: 60_000,
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { data: Partial<Patient>; photo?: File }) => api.patients.create(input.data, input.photo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, photo }: { id: string; data: Partial<Patient>; photo?: File }) =>
      api.patients.update(id, data, photo),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(variables.id) });
    },
  });
}
