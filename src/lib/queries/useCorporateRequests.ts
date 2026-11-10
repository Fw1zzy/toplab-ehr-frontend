import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CorporateRequest } from '@/types';

export function useCreateCorporateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Pick<CorporateRequest, 'company' | 'request_type'> & Partial<CorporateRequest>) =>
      api.corporateRequests.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['corporate-requests'] }),
  });
}
