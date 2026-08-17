import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

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
}) {
  return useQuery({
    queryKey: encounterKeys.list(params ?? {}),
    queryFn: () => api.encounters.getAll(params),
    staleTime: 30_000,
  });
}

export function useEncounter(id: string | undefined) {
  return useQuery({
    queryKey: encounterKeys.detail(id ?? ''),
    queryFn: () => api.encounters.getOne(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}
