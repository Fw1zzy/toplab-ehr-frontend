import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Encounter } from '@/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export const encounterKeys = {
  all: ['encounters'] as const,
  lists: () => [...encounterKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...encounterKeys.lists(), params] as const,
  details: () => [...encounterKeys.all, 'detail'] as const,
  detail: (id: string) => [...encounterKeys.details(), id] as const,
};

export function useEncounters(params?: {
  patientId?: string;
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
  kind?: string;
}, enabled = true) {
  const { isAuthenticated, user } = useAuth();
  const search = useDebouncedValue(params?.search ?? '');
  const queryParams = { ...params, search };
  return useQuery({
    queryKey: [...encounterKeys.list(queryParams), user?.id],
    queryFn: ({ signal }) => api.encounters.getAll(queryParams, signal),
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
  });
}

export function useEncounter(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...encounterKeys.detail(id ?? ''), user?.id],
    queryFn: ({ signal }) => api.encounters.getOne(id!, signal),
    enabled: !!id && !!user,
    staleTime: 60_000,
  });
}

export function useCreateEncounter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Encounter>) => api.encounters.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: encounterKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
