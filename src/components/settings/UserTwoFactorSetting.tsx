'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { TwoFactorSetupDialog } from '@/components/settings/AdminAccessPolicySection';

async function getMfaStatus() {
  const token = await api.auth.getAccessToken();
  if (!token) throw new Error('Sign in again to check your authenticator status.');
  const response = await fetch('/api/auth/mfa-status', {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error ?? 'Unable to check authenticator status.');
  return result.data as { enabled: boolean; requiredByPolicy: boolean };
}

export function UserTwoFactorSetting() {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({ queryKey: ['my-tfa-status'], queryFn: getMfaStatus, staleTime: 30_000 });
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [disableError, setDisableError] = useState<string | null>(null);
  const disableMutation = useMutation({
    mutationFn: (code: string) => api.auth.disableTwoFactor(code),
    onSuccess: () => {
      toast.success('Authenticator disabled for your account');
      setIsDisableOpen(false);
      setOtp('');
      queryClient.invalidateQueries({ queryKey: ['my-tfa-status'] });
      queryClient.invalidateQueries({ queryKey: ['admin-access-policies'] });
    },
    onError: (error) => setDisableError(error instanceof Error ? error.message : 'Unable to disable authenticator.'),
  });

  return <section className="rounded-xl border border-slate-200 bg-white p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><ShieldCheck className="h-4 w-4" /></span>
        <div><h2 className="text-sm font-semibold text-slate-900">Two-Factor Authentication</h2><p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500">Set up an authenticator app before an administrator enables an access policy that requires 2FA for your account.</p></div>
      </div>
      {statusQuery.isLoading ? <span role="status" className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Checking status</span>
        : statusQuery.error ? <p role="alert" className="text-xs text-red-600">{statusQuery.error instanceof Error ? statusQuery.error.message : 'Unable to check 2FA status.'}</p>
          : statusQuery.data?.enabled ? <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">Authenticator enabled</span>{!statusQuery.data.requiredByPolicy && <button type="button" onClick={() => { setDisableError(null); setIsDisableOpen(true); }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Turn off 2FA</button>}</div>
            : <button type="button" onClick={() => setIsSetupOpen(true)} className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700">Set up authenticator</button>}
    </div>
    {statusQuery.data?.requiredByPolicy && <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-amber-700">An assigned EHR policy requires 2FA. Turn off that policy requirement before disabling your authenticator.</p>}
    {!statusQuery.data?.enabled && !statusQuery.error && <p className="mt-4 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">Setup requires your current EHR password and a six-digit code from the authenticator app. After setup, you will be signed out and must use a code at your next login.</p>}
    <TwoFactorSetupDialog open={isSetupOpen} alreadyEnabled={false} onOpenChange={setIsSetupOpen} onComplete={async () => undefined} />

    <Dialog.Root open={isDisableOpen} onOpenChange={(open) => { if (!disableMutation.isPending) setIsDisableOpen(open); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-lg font-semibold text-slate-900">Turn off 2FA</Dialog.Title><Dialog.Description className="mt-1 text-xs leading-relaxed text-slate-500">Enter your current authenticator code to disable 2FA for your account.</Dialog.Description></div><Dialog.Close asChild><button type="button" disabled={disableMutation.isPending} aria-label="Close" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></Dialog.Close></div>
          <form onSubmit={(event) => { event.preventDefault(); setDisableError(null); disableMutation.mutate(otp); }} className="mt-5 space-y-4">
            <label className="block space-y-1.5 text-xs font-semibold text-slate-700">Authenticator code<input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-center font-mono text-lg tracking-[0.35em] outline-none focus:border-blue-500" placeholder="000000" /></label>
            {disableError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{disableError}</p>}
            <button type="submit" disabled={otp.length !== 6 || disableMutation.isPending} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">{disableMutation.isPending && <LoaderCircle className="h-4 w-4 animate-spin" />}{disableMutation.isPending ? 'Disabling...' : 'Confirm and turn off 2FA'}</button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </section>;
}
