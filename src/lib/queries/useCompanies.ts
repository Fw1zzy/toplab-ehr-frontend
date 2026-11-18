import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Company } from '@/types/corporate';

export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  detail: (id: string) => [...companyKeys.all, id] as const,
};

export function useCompanies() {
  return useQuery({
    queryKey: companyKeys.lists(),
    queryFn: () => api.companies.getAll(),
    staleTime: 30_000,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Company>) => api.companies.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Company> }) => api.companies.update(id, data),
    onSuccess: (company) => {
      queryClient.setQueryData(companyKeys.detail(company.id), company);
      queryClient.invalidateQueries({ queryKey: companyKeys.lists() });
    },
  });
}
