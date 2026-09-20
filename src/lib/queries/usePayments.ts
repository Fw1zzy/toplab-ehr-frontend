import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const paymentKeys = {
  all: ['payments'] as const,
  lists: () => [...paymentKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...paymentKeys.lists(), params] as const,
  details: () => [...paymentKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentKeys.details(), id] as const,
};

export function usePayments(params?: {
  patientId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: paymentKeys.list(params ?? {}),
    queryFn: () => api.payments.getAll(params),
    staleTime: 30_000,
  });
}

export function usePayment(id: string | undefined) {
  return useQuery({
    queryKey: paymentKeys.detail(id ?? ''),
    queryFn: () => api.payments.getOne(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}
