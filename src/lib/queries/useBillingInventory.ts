import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

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
  search?: string;
  type?: string;
}, enabled = true) {
  const { isAuthenticated, user } = useAuth();
  const search = useDebouncedValue(params?.search ?? '');
  const queryParams = { ...params, search };
  return useQuery({
    queryKey: [...invoiceKeys.list(queryParams), user?.id],
    queryFn: ({ signal }) => api.invoices.getAll(queryParams, signal),
    enabled: enabled && isAuthenticated,
    staleTime: 30_000,
  });
}

export function useInvoiceSummary() {
  const { user } = useAuth();
  return useQuery({ queryKey: [...invoiceKeys.all, 'summary', user?.id],
    queryFn: ({ signal }) => api.invoices.getSummary(signal), enabled: !!user, staleTime: 30_000 });
}

export function useInvoice(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...invoiceKeys.detail(id ?? ''), user?.id],
    queryFn: ({ signal }) => api.invoices.getOne(id!, signal),
    enabled: !!id && !!user,
    staleTime: 60_000,
  });
}

export function usePatientInvoices(patientId: string | undefined, enabled = true) {
  return useInvoices({ patientId }, !!patientId && enabled);
}

export const inventoryKeys = {
  all: ['inventory'] as const,
  lists: () => [...inventoryKeys.all, 'list'] as const,
  list: (params: Record<string, unknown>) => [...inventoryKeys.lists(), params] as const,
};

export function useInventory(params?: {
  status?: string;
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
