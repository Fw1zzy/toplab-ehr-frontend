import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const invoiceKeys = {
  all: ['invoices'] as const,
  lists: () => [...invoiceKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...invoiceKeys.lists(), params] as const,
  details: () => [...invoiceKeys.all, 'detail'] as const,
  detail: (id: string) => [...invoiceKeys.details(), id] as const,
};

export function useInvoices(params?: {
  patientId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: invoiceKeys.list(params ?? {}),
    queryFn: () => api.invoices.getAll(params),
    staleTime: 30_000,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: invoiceKeys.detail(id ?? ''),
    queryFn: () => api.invoices.getOne(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function usePatientInvoices(patientId: string | undefined) {
  return useInvoices({ patientId });
}

export const inventoryKeys = {
  all: ['inventory'] as const,
  lists: () => [...inventoryKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...inventoryKeys.lists(), params] as const,
};

export function useInventory(params?: {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: inventoryKeys.list(params ?? {}),
    queryFn: () => api.inventory.getAll(params),
    staleTime: 60_000,
  });
}
