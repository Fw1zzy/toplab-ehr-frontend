import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const medicalRecordKeys = {
  all: ['medical-records'] as const,
  lists: () => [...medicalRecordKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...medicalRecordKeys.lists(), params] as const,
  details: () => [...medicalRecordKeys.all, 'detail'] as const,
  detail: (id: string) => [...medicalRecordKeys.details(), id] as const,
};

export function useMedicalRecords(params?: {
  patientId?: string;
  recordType?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: medicalRecordKeys.list(params ?? {}),
    queryFn: () => api.medicalRecords.getAll(params),
    staleTime: 30_000,
  });
}

export function useMedicalRecord(id: string | undefined) {
  return useQuery({
    queryKey: medicalRecordKeys.detail(id ?? ''),
    queryFn: () => api.medicalRecords.getOne(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}
