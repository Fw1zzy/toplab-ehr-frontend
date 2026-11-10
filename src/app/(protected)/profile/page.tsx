'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Avatar } from '@/components/ui/Avatar';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(user?.first_name ?? '');
    setLastName(user?.last_name ?? '');
  }, [user?.id, user?.first_name, user?.last_name]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await updateProfile({ first_name: firstName.trim(), last_name: lastName.trim() });
      toast.success('Profile updated in the EHR');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update your EHR profile.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!user) return <p className="p-8 text-center text-sm text-slate-500">Loading profile...</p>;

  const displayName = `${user.first_name} ${user.last_name}`.trim() || user.email.split('@')[0];
  const roleLabel = String(user.roleName).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <div className="space-y-5">
      <PageHeader title="Profile" description="Personal account information from the EHR." />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-5">
            <Avatar name={displayName} size="lg" />
            <div className="min-w-0"><h2 className="truncate text-base font-semibold text-slate-900">{displayName}</h2><p className="mt-1 truncate text-sm text-slate-500">{user.email}</p></div>
          </div>
          <form onSubmit={submit} className="space-y-5 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-xs font-medium text-slate-700">First Name
                <input required value={firstName} onChange={(event) => setFirstName(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
              </label>
              <label className="block space-y-1.5 text-xs font-medium text-slate-700">Last Name
                <input required value={lastName} onChange={(event) => setLastName(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />
              </label>
              <label className="block space-y-1.5 text-xs font-medium text-slate-700 sm:col-span-2">Email
                <input readOnly value={user.email} className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 outline-none" />
                <span className="block text-[11px] font-normal text-slate-400">Email and sign-in credentials are managed by the EHR administrator.</span>
              </label>
            </div>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">{isSaving ? 'Saving...' : 'Save Profile'}</button>
            </div>
          </form>
        </section>

        <section className="h-fit overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-semibold text-slate-900">Account Information</h2><p className="mt-1 text-xs text-slate-500">Read-only details provided by the EHR.</p></div>
          <dl className="divide-y divide-slate-100 px-5">
            <div className="flex items-center justify-between gap-4 py-4"><dt className="text-xs text-slate-500">Role</dt><dd className="text-right text-xs font-medium text-slate-800">{roleLabel}</dd></div>
            <div className="flex items-center justify-between gap-4 py-4"><dt className="text-xs text-slate-500">Account Status</dt><dd><StatusBadge status={user.status} /></dd></div>
            <div className="flex items-center justify-between gap-4 py-4"><dt className="text-xs text-slate-500">Last Access</dt><dd className="text-right text-xs text-slate-700">{user.last_access ? formatDate(user.last_access, 'MMM d, yyyy h:mm a') : '—'}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
