'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface ShareGrant {
  id: string;
  destinationBranch: string;
  purpose: string;
  scope: string[];
  status: string;
  approvedAt: string | null;
  accessExpiresAt: string | null;
  canRevoke: boolean;
}

async function requestShares() {
  const token = await api.auth.getAccessToken();
  if (!token) throw new Error('Sign in again to manage sharing permissions.');
  const response = await fetch('/api/interclinic/my-shares', {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'Unable to load sharing permissions.');
  return body.data as ShareGrant[];
}

async function revokeShare(consentId: string) {
  const token = await api.auth.getAccessToken();
  if (!token) throw new Error('Sign in again to manage sharing permissions.');
  const response = await fetch('/api/interclinic/my-shares', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ consentId }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'Unable to revoke sharing permission.');
  return body.data;
}

export function MyInterclinicShares() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['my-interclinic-shares'], queryFn: requestShares });
  const revokeMutation = useMutation({
    mutationFn: revokeShare,
    onSuccess: () => {
      toast.success('Branch access revoked', { description: 'That branch can no longer view your shared patient information.' });
      queryClient.invalidateQueries({ queryKey: ['my-interclinic-shares'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to revoke branch access.'),
  });

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">My Interclinic Sharing</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">See which branches can view your patient information. Access stays active until you revoke it.</p>
      </div>
      {query.isLoading ? <div className="flex items-center gap-2 p-5 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading your sharing permissions...</div>
        : query.error ? <p role="alert" className="p-5 text-xs text-red-600">{query.error instanceof Error ? query.error.message : 'Unable to load sharing permissions.'}</p>
          : !query.data?.length ? <p className="p-5 text-xs text-slate-500">You have no interclinic sharing permissions.</p>
            : <ul className="divide-y divide-slate-100">
              {query.data.map((grant) => <li key={grant.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-emerald-600" />{grant.destinationBranch}</p>
                  <p className="mt-1 text-xs text-slate-600">{grant.purpose}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{grant.scope.join(', ')} · {grant.status === 'approved' && !grant.accessExpiresAt ? 'No expiry' : grant.status}</p>
                </div>
                {grant.canRevoke && <button type="button" onClick={() => revokeMutation.mutate(grant.id)} disabled={revokeMutation.isPending} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                  {revokeMutation.isPending && revokeMutation.variables === grant.id
                    ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                  Revoke access
                </button>}
              </li>)}
            </ul>}
    </section>
  );
}
