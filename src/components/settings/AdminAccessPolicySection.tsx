'use client';

import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { KeyRound, LoaderCircle, Plus, ShieldAlert, ShieldCheck, Trash2, X } from 'lucide-react';
import QRCode from 'qrcode';
import Image from 'next/image';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthProvider';

type Relation = string | { id: string; name?: string };
interface EhrRole {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  parent: Relation | null;
  policies: Relation[];
  users: EhrUser[];
  childRoles: Array<{ id: string; name: string }>;
}
interface EhrUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role?: Relation | null;
  tfa_enabled?: boolean;
}
interface EhrPolicy {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  admin_access: boolean;
  app_access: boolean;
  ip_access: string | null;
  enforce_tfa: boolean;
  roles: Relation[];
  users: EhrUser[];
  assignedUsers: EhrUser[];
}
interface EhrPermission {
  id: number;
  collection: string;
  action: string;
  permissions: Record<string, unknown> | null;
  validation: Record<string, unknown> | null;
  presets: Record<string, unknown> | null;
  fields: string[] | null;
  policy: Relation | null;
}
export interface AccessPolicyData {
  roles: EhrRole[];
  policies: EhrPolicy[];
  permissions: EhrPermission[];
  users: EhrUser[];
  currentUserTfaEnabled: boolean;
  collections: string[];
}
interface LoginLockout {
  userId: string;
  email: string;
  name: string;
  failedAttempts: number;
  remainingAttempts: number;
  blocked: boolean;
  retryAfterSeconds: number;
  lastFailedAt: string | null;
}

class AdminAccessError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function requestAdminAccessData(): Promise<AccessPolicyData | null> {
  const token = await api.auth.getAccessToken();
  if (!token) throw new AdminAccessError('Sign in again to manage EHR access policies.', 401);
  const response = await fetch('/api/admin/access-policies', {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (response.status === 403) return null;
  if (!response.ok) throw new AdminAccessError(body.error ?? 'Unable to load EHR access policies.', response.status);
  return body.data as AccessPolicyData;
}

async function postAdminAction(payload: Record<string, unknown>) {
  const token = await api.auth.getAccessToken();
  if (!token) throw new Error('Sign in again to manage EHR access policies.');
  const response = await fetch('/api/admin/access-policies', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'Unable to update EHR access policy.');
  return body.data;
}

async function getLoginLockouts() {
  const token = await api.auth.getAccessToken();
  if (!token) throw new Error('Sign in again to view login lockouts.');
  const response = await fetch('/api/admin/login-lockouts', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'Unable to load login lockouts.');
  return body.data as LoginLockout[];
}

async function unlockAccount(userId: string) {
  const token = await api.auth.getAccessToken();
  if (!token) throw new Error('Sign in again to unlock this account.');
  const response = await fetch('/api/admin/login-lockouts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? 'Unable to unlock this account.');
  return body.data;
}

function relationIds(relations: Relation[] | null | undefined) {
  return (relations ?? []).map((relation) => typeof relation === 'string' ? relation : relation.id);
}

function displayLocalizedText(value: string | null | undefined) {
  if (!value) return '';
  if (!value.startsWith('$t:')) return value;
  const key = value.slice(3);
  const knownLabels: Record<string, string> = {
    admin_description: 'Full administrative access',
    public_label: 'Public',
    public_description: 'Access for unauthenticated public requests',
  };
  return knownLabels[key] ?? key.replace(/[._-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function prettyJson(value: Record<string, unknown> | null) {
  return JSON.stringify(value ?? {}, null, 2);
}

function parseJsonObject(value: string, label: string): Record<string, unknown> | null {
  if (!value.trim()) return null;
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${label} must be a JSON object.`);
  return parsed as Record<string, unknown>;
}

export function AdminAccessPolicySection() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-access-policies'], queryFn: requestAdminAccessData, staleTime: 15_000 });
  const mutation = useMutation({
    mutationFn: postAdminAction,
    onSuccess: () => {
      toast.success('EHR access policy saved');
      queryClient.invalidateQueries({ queryKey: ['admin-access-policies'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to save EHR access policy.'),
  });
  const [activeTab, setActiveTab] = useState<'roles' | 'policies' | 'login-security'>('roles');
  const [roleView, setRoleView] = useState<'list' | 'detail'>('list');
  const [policyView, setPolicyView] = useState<'list' | 'detail'>('list');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedPolicyId, setSelectedPolicyId] = useState('');

  if (query.isLoading || query.data === null || (query.error instanceof AdminAccessError && query.error.status === 403)) return null;
  if (query.error) return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">{query.error instanceof Error ? query.error.message : 'Unable to load EHR access policies.'}</p>;
  if (!query.data) return null;

  const data = query.data;
  const role = selectedRoleId === '__new__' ? null : data.roles.find((item) => item.id === selectedRoleId) ?? null;
  const policy = selectedPolicyId === '__new__' ? null : data.policies.find((item) => item.id === selectedPolicyId) ?? null;
  const policyPermissions = policy
    ? data.permissions.filter((permission) => {
      const permissionPolicyId = typeof permission.policy === 'string' ? permission.policy : permission.policy?.id;
      return permissionPolicyId === policy.id;
    })
    : [];

  function saveAdminAction(payload: Record<string, unknown>) {
    mutation.mutate(payload, {
      onSuccess: (result) => {
        if (result && typeof result === 'object' && 'id' in result) {
          if (payload.action === 'role:create') {
            setSelectedRoleId(String(result.id));
            setRoleView('detail');
          } else if (payload.action === 'policy:create') {
            setSelectedPolicyId(String(result.id));
            setPolicyView('detail');
          }
        }
      },
    });
  }

  async function saveAdminActionAsync(payload: Record<string, unknown>) {
    return mutation.mutateAsync(payload);
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100"><KeyRound className="h-4 w-4" /></span>
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600">Settings</p><h2 className="text-lg font-medium text-slate-900">EHR Roles & Access Policies</h2></div>
        </div>
      </div>

      <div className="m-4 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-none text-amber-700" />
          <p className="text-xs leading-relaxed"><strong>Global EHR settings:</strong> Directus roles and policies are shared across Baguio and Tarlac. Changes here can affect users in both branches; carefully review assignments and administrative access.</p>
      </div>

      <div className="grid min-h-[480px] md:grid-cols-[190px_minmax(0,1fr)]">
        <nav aria-label="Role and policy settings" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white p-2 md:flex-col md:border-b-0 md:border-r">
          <p className="hidden px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 md:block">Access Management</p>
          {([['roles', 'User Roles'], ['policies', 'Access Policies'], ['login-security', 'Login Security']] as const).map(([tab, label]) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} aria-current={activeTab === tab ? 'page' : undefined} className={`flex flex-none items-center rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-colors md:w-full ${activeTab === tab ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</button>)}
        </nav>
        <div className="min-w-0 bg-white">
          {activeTab === 'login-security' ? <LoginSecurityPanel /> : activeTab === 'roles' ? roleView === 'list' ? (
            <RoleIndex roles={data.roles} onCreate={() => { setSelectedRoleId('__new__'); setRoleView('detail'); }} onSelect={(id) => { setSelectedRoleId(id); setRoleView('detail'); }} />
          ) : (
            <RoleDetails key={role?.id ?? 'new-role'} role={role} roles={data.roles} policies={data.policies} users={data.users ?? []} busy={mutation.isPending} onBack={() => setRoleView('list')} onSave={saveAdminAction} onCreatePolicy={() => { setSelectedPolicyId('__new__'); setPolicyView('detail'); setActiveTab('policies'); }} />
          ) : policyView === 'list' ? (
            <PolicyIndex policies={data.policies} onCreate={() => { setSelectedPolicyId('__new__'); setPolicyView('detail'); }} onSelect={(id) => { setSelectedPolicyId(id); setPolicyView('detail'); }} />
          ) : (
            <PolicyDetails key={policy?.id ?? 'new-policy'} policy={policy} roles={data.roles} users={data.users ?? []} permissions={policyPermissions} collections={data.collections} currentUserTfaEnabled={data.currentUserTfaEnabled} busy={mutation.isPending} onBack={() => setPolicyView('list')} onSave={saveAdminAction} onSaveAsync={saveAdminActionAsync} />
          )}
        </div>
      </div>
      {mutation.isPending && <div role="status" className="flex items-center gap-2 border-t border-slate-100 bg-white px-5 py-3 text-xs text-blue-700"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Saving EHR access changes...</div>}
    </section>
  );
}

function LoginSecurityPanel() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-login-lockouts'], queryFn: getLoginLockouts, staleTime: 5_000 });
  const unlock = useMutation({
    mutationFn: unlockAccount,
    onSuccess: () => {
      toast.success('Login lockout cleared');
      queryClient.invalidateQueries({ queryKey: ['admin-login-lockouts'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Unable to unlock this account.'),
  });

  return <div className="space-y-5 p-5">
    <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">Settings</p><h3 className="text-lg font-medium text-slate-900">Login Security</h3><p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Five consecutive failed sign-ins trigger increasing cooldowns. At 20 failures, the login page warns that five more failures will block the account. At 25, an administrator must unlock it here.</p></div>
    {query.isLoading ? <p role="status" className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Checking login lockouts...</p>
      : query.error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700">{query.error instanceof Error ? query.error.message : 'Unable to load login lockouts.'}</p>
        : !query.data?.length ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center"><ShieldCheck className="mx-auto h-7 w-7 text-emerald-600" /><p className="mt-3 text-sm font-semibold text-slate-800">No accounts nearing lockout</p><p className="mt-1 text-xs text-slate-500">Accounts will appear here after 20 failed login attempts.</p></div>
          : <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3 font-semibold">Account</th><th className="px-4 py-3 font-semibold">Failed attempts</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Last failure</th><th className="px-4 py-3 text-right font-semibold">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{query.data.map((item) => <tr key={item.userId}><td className="px-4 py-3"><p className="font-medium text-slate-800">{item.name}</p><p className="mt-0.5 text-slate-500">{item.email}</p></td><td className="px-4 py-3 font-mono">{item.failedAttempts} / 25</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.blocked ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{item.blocked ? 'Blocked' : `${item.remainingAttempts} remaining`}</span></td><td className="px-4 py-3 text-slate-500">{item.lastFailedAt ? new Date(item.lastFailedAt).toLocaleString() : '—'}</td><td className="px-4 py-3 text-right">{item.blocked && <button type="button" disabled={unlock.isPending} onClick={() => unlock.mutate(item.userId)} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50">{unlock.isPending && unlock.variables === item.userId ? 'Unlocking...' : 'Unlock account'}</button>}</td></tr>)}</tbody></table></div>}
  </div>;
}

function RoleIndex({ roles, onCreate, onSelect }: { roles: EhrRole[]; onCreate: () => void; onSelect: (id: string) => void }) {
  return <div className="p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">Settings</p><h3 className="text-lg font-medium text-slate-900">User Roles</h3></div><button type="button" onClick={onCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"><Plus className="mr-1 inline h-3.5 w-3.5" />Create New</button></div>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Users</th><th className="px-4 py-3 font-semibold">Child Roles</th><th className="px-4 py-3 font-semibold">Description</th></tr></thead><tbody className="divide-y divide-slate-100">{roles.map((item) => <tr key={item.id} onClick={() => onSelect(item.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(item.id); }} tabIndex={0} className="cursor-pointer text-slate-700 transition-colors hover:bg-blue-50/50 focus:bg-blue-50/60 focus:outline-none"><td className="px-4 py-3 font-medium text-blue-700">{displayLocalizedText(item.name)}</td><td className="px-4 py-3">{item.users?.length || '—'}</td><td className="px-4 py-3">{item.childRoles?.length || '—'}</td><td className="max-w-[300px] truncate px-4 py-3 text-slate-500">{displayLocalizedText(item.description) || '—'}</td></tr>)}</tbody></table></div>
  </div>;
}

function PolicyIndex({ policies, onCreate, onSelect }: { policies: EhrPolicy[]; onCreate: () => void; onSelect: (id: string) => void }) {
  return <div className="p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">Settings</p><h3 className="text-lg font-medium text-slate-900">Access Policies</h3></div><button type="button" onClick={onCreate} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"><Plus className="mr-1 inline h-3.5 w-3.5" />Create New</button></div>
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-4 py-3 font-semibold">Name</th><th className="px-4 py-3 font-semibold">Users</th><th className="px-4 py-3 font-semibold">Roles</th><th className="px-4 py-3 font-semibold">Description</th></tr></thead><tbody className="divide-y divide-slate-100">{policies.map((item) => <tr key={item.id} onClick={() => onSelect(item.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(item.id); }} tabIndex={0} className="cursor-pointer text-slate-700 transition-colors hover:bg-blue-50/50 focus:bg-blue-50/60 focus:outline-none"><td className="px-4 py-3 font-medium text-blue-700">{displayLocalizedText(item.name)}</td><td className="px-4 py-3">{item.users?.length || '—'}</td><td className="px-4 py-3">{item.roles?.length || '—'}</td><td className="max-w-[300px] truncate px-4 py-3 text-slate-500">{displayLocalizedText(item.description) || '—'}</td></tr>)}</tbody></table></div>
  </div>;
}

function userName(user: EhrUser) {
  return displayLocalizedText(`${user.first_name ?? ''} ${user.last_name ?? ''}`.trim()) || user.email || user.id;
}

function RoleDetails({ role, roles, policies, users, busy, onBack, onSave, onCreatePolicy }: { role: EhrRole | null; roles: EhrRole[]; policies: EhrPolicy[]; users: EhrUser[]; busy: boolean; onBack: () => void; onSave: (payload: Record<string, unknown>) => void; onCreatePolicy: () => void }) {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [parentId, setParentId] = useState(role?.parent ? typeof role.parent === 'string' ? role.parent : role.parent.id : '');
  const [policyIds, setPolicyIds] = useState(relationIds(role?.policies));
  const [userIds, setUserIds] = useState(role?.users?.map((user) => user.id) ?? []);
  const [newUserId, setNewUserId] = useState('');
  const [newPolicyId, setNewPolicyId] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({ action: role ? 'role:update' : 'role:create', ...(role ? { id: role.id } : {}), name: name.trim(), description, parent: parentId || null, policyIds, userIds });
  }

  const availableUsers = users.filter((user) => !userIds.includes(user.id));
  const availablePolicies = policies.filter((policy) => !policyIds.includes(policy.id));
  return <form onSubmit={submit} className="space-y-5 p-5">
    <div className="flex items-center gap-3"><button type="button" onClick={onBack} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">&larr; User Roles</button><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">User Roles</p><h3 className="text-lg font-medium text-slate-900">{displayLocalizedText(role?.name) || 'Create Role'}</h3></div></div>
    <label className="block max-w-xl space-y-1.5 text-xs font-semibold text-slate-700">Role Name *<input required maxLength={100} value={displayLocalizedText(name)} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" /></label>
    <label className="block space-y-1.5 text-xs font-semibold text-slate-700">Description<textarea rows={2} value={displayLocalizedText(description)} onChange={(event) => setDescription(event.target.value)} className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" /></label>
    <label className="block max-w-xl space-y-1.5 text-xs font-semibold text-slate-700">Parent Role<select value={parentId} onChange={(event) => setParentId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-blue-500"><option value="">Select an item...</option>{roles.filter((item) => item.id !== role?.id).map((item) => <option key={item.id} value={item.id}>{displayLocalizedText(item.name)}</option>)}</select><span className="block text-[11px] font-normal italic text-slate-400">Optional parent role to inherit permissions from.</span></label>

      <section className="space-y-3 border-t border-slate-200 pt-4"><div className="flex items-center justify-between"><h4 className="text-base font-medium text-slate-900">Policies</h4><span className="text-xs text-slate-500">{policyIds.length} assigned</span></div><div className="space-y-2">{policyIds.map((id) => { const policy = policies.find((item) => item.id === id); return <div key={id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"><span>{displayLocalizedText(policy?.name) || id}</span>{!policy?.admin_access && <button type="button" onClick={() => setPolicyIds((current) => current.filter((value) => value !== id))} className="text-xs font-medium text-red-600 hover:underline">Remove</button>}</div>; })}</div><div className="flex flex-wrap gap-2"><select value={newPolicyId} onChange={(event) => setNewPolicyId(event.target.value)} className="min-w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><option value="">Select an existing policy...</option>{availablePolicies.map((item) => <option key={item.id} value={item.id}>{displayLocalizedText(item.name)}</option>)}</select><button type="button" disabled={!newPolicyId} onClick={() => { setPolicyIds((current) => [...current, newPolicyId]); setNewPolicyId(''); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Add Existing</button><button type="button" onClick={onCreatePolicy} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">Create New</button></div></section>

    <section className="space-y-3 border-t border-slate-200 pt-4"><h4 className="text-base font-medium text-slate-900">Users</h4><p className="text-xs text-slate-500">Assigning a user changes their EHR role globally.</p><div className="space-y-2">{userIds.map((id) => { const user = users.find((item) => item.id === id); return <div key={id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"><span>{user ? userName(user) : id}</span><button type="button" onClick={() => setUserIds((current) => current.filter((value) => value !== id))} className="text-xs font-medium text-red-600 hover:underline">Remove</button></div>; })}</div><div className="flex flex-wrap gap-2"><select value={newUserId} onChange={(event) => setNewUserId(event.target.value)} className="min-w-48 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><option value="">Select an existing user...</option>{availableUsers.map((item) => <option key={item.id} value={item.id}>{userName(item)}</option>)}</select><button type="button" disabled={!newUserId} onClick={() => { setUserIds((current) => [...current, newUserId]); setNewUserId(''); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Add Existing</button></div></section>
    <div className="flex justify-end border-t border-slate-200 pt-4"><button type="submit" disabled={busy || !name.trim()} className="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{role ? 'Save Role' : 'Create Role'}</button></div>
  </form>;
}

function PolicyDetails({ policy, roles, users, permissions, collections, currentUserTfaEnabled, busy, onBack, onSave, onSaveAsync }: { policy: EhrPolicy | null; roles: EhrRole[]; users: EhrUser[]; permissions: EhrPermission[]; collections: string[]; currentUserTfaEnabled: boolean; busy: boolean; onBack: () => void; onSave: (payload: Record<string, unknown>) => void; onSaveAsync: (payload: Record<string, unknown>) => Promise<unknown> }) {
  const [name, setName] = useState(policy?.name ?? '');
  const [description, setDescription] = useState(policy?.description ?? '');
  const [appAccess, setAppAccess] = useState(policy?.app_access ?? true);
  const [adminAccess, setAdminAccess] = useState(policy?.admin_access ?? false);
  const [ipAccess, setIpAccess] = useState(policy?.ip_access ?? '');
  const [enforceTfa, setEnforceTfa] = useState(policy?.enforce_tfa ?? false);
  const [roleIds, setRoleIds] = useState(relationIds(policy?.roles));
  const [userIds, setUserIds] = useState(policy?.users?.map((user) => user.id) ?? []);
  const [newRoleId, setNewRoleId] = useState('');
  const [newUserId, setNewUserId] = useState('');
  const [userToDisableTfa, setUserToDisableTfa] = useState<EhrUser | null>(null);
  const [disableOtp, setDisableOtp] = useState('');
  const [disableError, setDisableError] = useState<string | null>(null);
  const [showTfaSetup, setShowTfaSetup] = useState(false);
  const permissionRows = permissions.filter((permission) => {
    const currentPolicyId = typeof permission.policy === 'string' ? permission.policy : permission.policy?.id;
    return currentPolicyId === policy?.id;
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    if (enforceTfa && !policy?.enforce_tfa) {
      setShowTfaSetup(true);
      return;
    }
    onSave({ action: policy ? 'policy:update' : 'policy:create', ...(policy ? { id: policy.id } : {}), name: name.trim(), description, app_access: appAccess, admin_access: adminAccess, ip_access: ipAccess, enforce_tfa: enforceTfa, roleIds, userIds });
  }

  async function finishEnablingPolicy() {
    const payload = { action: policy ? 'policy:update' : 'policy:create', ...(policy ? { id: policy.id } : {}), name: name.trim(), description, app_access: appAccess, admin_access: adminAccess, ip_access: ipAccess, enforce_tfa: true, roleIds, userIds };
    await onSaveAsync(payload);
  }

  const availableRoles = roles.filter((role) => !roleIds.includes(role.id));
  const availableUsers = users.filter((user) => !userIds.includes(user.id));
  return <div className="space-y-5 p-5">
    <div className="flex items-center gap-3"><button type="button" onClick={onBack} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">&larr; Access Policies</button><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-600">Access Policies</p><h3 className="text-lg font-medium text-slate-900">{displayLocalizedText(policy?.name) || 'Create Policy'}</h3></div></div>
    <form onSubmit={submit} className="space-y-5">
      <label className="block space-y-1.5 text-xs font-semibold text-slate-700">Policy Name *<input required maxLength={100} value={displayLocalizedText(name)} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-blue-500" /></label>
      <label className="block space-y-1.5 text-xs font-semibold text-slate-700">Description<textarea rows={2} value={displayLocalizedText(description)} onChange={(event) => setDescription(event.target.value)} className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-blue-500" /></label>

      <section className="grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
        <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-700"><input type="checkbox" checked={appAccess} onChange={(event) => setAppAccess(event.target.checked)} className="h-4 w-4 accent-blue-600" />App Access</label>
        <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-700"><input type="checkbox" checked={adminAccess} onChange={(event) => setAdminAccess(event.target.checked)} className="h-4 w-4 accent-blue-600" />Admin Access</label>
        <label className="block space-y-1.5 text-xs font-semibold text-slate-700 md:col-span-2">IP Access<input value={ipAccess} onChange={(event) => setIpAccess(event.target.value)} placeholder="Allowed IP addresses, ranges, CIDR blocks; blank allows all" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-normal outline-none focus:border-blue-500" /></label>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 md:col-span-2">
          <span><strong className="block text-xs font-semibold text-slate-700">Require 2FA</strong><span className="mt-1 block text-[11px] leading-relaxed text-slate-500">Require enrolled users assigned this policy to sign in with an authenticator code.</span></span>
          <button type="button" role="switch" aria-checked={enforceTfa} aria-label="Require two-factor authentication" onClick={() => setEnforceTfa((enabled) => !enabled)} className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${enforceTfa ? 'bg-blue-600' : 'bg-slate-300'}`}><span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${enforceTfa ? 'translate-x-6' : 'translate-x-1'}`} /></button>
        </div>
      </section>

      <div className="flex justify-end border-t border-slate-200 pt-4"><button type="submit" disabled={busy || !name.trim()} className="rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{policy ? 'Save Policy' : 'Create Policy'}</button></div>
    </form>

    <section className="space-y-3 border-t border-slate-200 pt-4"><h4 className="text-base font-medium text-slate-900">Permissions</h4>{adminAccess ? <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 px-4 py-4 text-sm text-blue-800">Admins have all permissions.</div> : <><div className="flex items-center justify-between"><p className="text-xs text-slate-500">Collection permissions and row filters</p>{policy && <CreatePermissionForm policyId={policy.id} collections={collections} busy={busy} onCreate={onSave} />}</div>{policy ? permissionRows.length ? <div className="space-y-3">{permissionRows.map((permission) => <PermissionEditor key={permission.id} permission={permission} policyId={policy.id} busy={busy} onSave={onSave} onDelete={onSave} />)}</div> : <p className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500">No collection permissions configured.</p> : <p className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500">Create the policy first to add collection permissions.</p>}</>}</section>

    {policy && <section className="space-y-5 border-t border-slate-200 pt-5"><h4 className="text-lg font-medium text-slate-900">Assigned To</h4>
      <AssignmentList title="Users" emptyText="No users assigned." ids={userIds} records={users.map((user) => ({ id: user.id, label: userName(user) }))} onRemove={(id) => setUserIds((current) => current.filter((item) => item !== id))} />
      <div className="flex flex-wrap gap-2"><select value={newUserId} onChange={(event) => setNewUserId(event.target.value)} className="min-w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><option value="">Select user...</option>{availableUsers.map((user) => <option key={user.id} value={user.id}>{userName(user)}</option>)}</select><button type="button" disabled={!newUserId} onClick={() => { setUserIds((current) => [...current, newUserId]); setNewUserId(''); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Add Existing</button></div>
      <AssignmentList title="Roles" emptyText="No roles assigned." ids={roleIds} records={roles.map((role) => ({ id: role.id, label: displayLocalizedText(role.name) }))} onRemove={(id) => setRoleIds((current) => current.filter((item) => item !== id))} />
      <div className="flex flex-wrap gap-2"><select value={newRoleId} onChange={(event) => setNewRoleId(event.target.value)} className="min-w-56 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"><option value="">Select role...</option>{availableRoles.map((role) => <option key={role.id} value={role.id}>{displayLocalizedText(role.name)}</option>)}</select><button type="button" disabled={!newRoleId} onClick={() => { setRoleIds((current) => [...current, newRoleId]); setNewRoleId(''); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Add Existing</button></div>
      <button type="button" onClick={() => { if (window.confirm('Save these user and role assignments to the global EHR policy?')) onSave({ action: 'policy:update', id: policy.id, name, description, admin_access: adminAccess, app_access: appAccess, ip_access: ipAccess, enforce_tfa: enforceTfa, roleIds, userIds }); }} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Save Assignments</button>
    </section>}

    {policy && <section className="space-y-3 border-t border-slate-200 pt-5"><div><h4 className="text-lg font-medium text-slate-900">Accounts with 2FA</h4><p className="mt-1 text-xs text-slate-500">Manage authenticator enrollment for users assigned to this policy.</p></div>
      {(policy.assignedUsers ?? []).length ? <div className="space-y-2">{policy.assignedUsers.map((user) => <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"><div><p className="text-sm font-medium text-slate-800">{userName(user)}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${user.tfa_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.tfa_enabled ? 'Authenticator enabled' : 'Not enrolled'}</span></div>{user.tfa_enabled && <button type="button" disabled={busy || policy.enforce_tfa} title={policy.enforce_tfa ? 'Turn off Require 2FA on this policy before resetting this account.' : undefined} onClick={() => { setDisableOtp(''); setDisableError(null); setUserToDisableTfa(user); }} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">Turn off 2FA</button>}</div>)}</div> : <p className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500">No users are currently assigned to this policy.</p>}
      {policy.enforce_tfa && <p className="text-[11px] text-amber-700">To reset a user’s 2FA, first turn off Require 2FA and save the policy.</p>}
    </section>}

    <Dialog.Root open={userToDisableTfa !== null} onOpenChange={(open) => { if (!open) { setUserToDisableTfa(null); setDisableOtp(''); setDisableError(null); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/45 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold text-slate-900">Turn off account 2FA?</Dialog.Title>
          <Dialog.Description className="mt-2 text-xs leading-relaxed text-slate-600">Ask {userToDisableTfa ? userName(userToDisableTfa) : 'this user'} to provide their current authenticator code. Their 2FA enrollment will only be removed after that code is verified.</Dialog.Description>
          <form onSubmit={async (event) => {
            event.preventDefault();
            if (!userToDisableTfa) return;
            setDisableError(null);
            try {
              await onSaveAsync({ action: 'user:disable-tfa', userId: userToDisableTfa.id, otp: disableOtp });
              setUserToDisableTfa(null);
              setDisableOtp('');
            } catch (cause) {
              setDisableError(cause instanceof Error ? cause.message : 'Unable to disable authenticator enrollment.');
            }
          }} className="mt-5 space-y-4">
            <label className="block space-y-1.5 text-xs font-semibold text-slate-700">Account holder’s current authenticator code<input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={disableOtp} onChange={(event) => setDisableOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-center font-mono text-lg tracking-[0.35em] outline-none focus:border-blue-500" placeholder="000000" /></label>
            {disableError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{disableError}</p>}
            <div className="flex justify-end gap-2"><Dialog.Close asChild><button type="button" className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancel</button></Dialog.Close><button type="submit" disabled={busy || disableOtp.length !== 6} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">Turn off 2FA</button></div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>

    {showTfaSetup && <TwoFactorSetupDialog
      open={showTfaSetup}
      alreadyEnabled={currentUserTfaEnabled}
      onOpenChange={setShowTfaSetup}
      onComplete={finishEnablingPolicy}
    />}
  </div>;
}

export function TwoFactorSetupDialog({ open, alreadyEnabled, onOpenChange, onComplete }: { open: boolean; alreadyEnabled: boolean; onOpenChange: (open: boolean) => void; onComplete: () => Promise<unknown> }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [password, setPassword] = useState('');
  const [currentOtp, setCurrentOtp] = useState('');
  const [newOtp, setNewOtp] = useState('');
  const [secret, setSecret] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOutForMfa() {
    await logout().catch(() => undefined);
    router.replace('/login');
  }

  async function verifyPasswordAndBegin() {
    setError(null);
    setBusy(true);
    try {
      await api.auth.verifyCredentials(password, alreadyEnabled ? currentOtp : undefined);
      if (alreadyEnabled) {
        await onComplete();
        toast.success('2FA policy enabled. Sign in again with your authenticator code.');
        await signOutForMfa();
        return;
      }
      const setup = await api.auth.generateTwoFactorSecret(password);
      const image = await QRCode.toDataURL(setup.otpauth_url, { errorCorrectionLevel: 'M', margin: 2, width: 240 });
      setSecret(setup.secret);
      setQrDataUrl(image);
      setPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify your password or start authenticator setup.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmAuthenticator() {
    setError(null);
    setBusy(true);
    let authenticatorEnabled = false;
    try {
      await api.auth.enableTwoFactor(secret, newOtp);
      authenticatorEnabled = true;
      await onComplete();
      toast.success('2FA policy enabled. Sign in again with your authenticator code.');
      await signOutForMfa();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to enable two-factor authentication.';
      if (authenticatorEnabled) {
        toast.error(message);
        toast.info('Your authenticator is set up, but the policy was not enabled. You will sign out and must use its code next time.');
        await signOutForMfa();
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (busy && !nextOpen) return;
    if (!nextOpen) {
      setPassword('');
      setCurrentOtp('');
      setNewOtp('');
      setSecret('');
      setQrDataUrl(null);
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  return <Dialog.Root open={open} onOpenChange={handleOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[70] bg-slate-950/45 backdrop-blur-[2px]" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-lg font-semibold text-slate-900">Confirm and set up 2FA</Dialog.Title><Dialog.Description className="mt-1 text-xs leading-relaxed text-slate-500">Directus will verify your password before generating an authenticator setup. The policy will only be enabled after your setup is confirmed.</Dialog.Description></div><Dialog.Close asChild><button type="button" disabled={busy} aria-label="Close" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X className="h-4 w-4" /></button></Dialog.Close></div>

        {!qrDataUrl ? <div className="mt-5 space-y-4">
          <label className="block space-y-1.5 text-xs font-semibold text-slate-700">Current password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" /></label>
          {alreadyEnabled && <label className="block space-y-1.5 text-xs font-semibold text-slate-700">Current authenticator code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={currentOtp} onChange={(event) => setCurrentOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-center font-mono text-lg tracking-[0.35em] outline-none focus:border-blue-500" placeholder="000000" /></label>}
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          <button type="button" onClick={() => void verifyPasswordAndBegin()} disabled={busy || !password || (alreadyEnabled && currentOtp.length !== 6)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{alreadyEnabled ? 'Confirm and enable policy' : 'Verify password and continue'}</button>
        </div> : <div className="mt-5 space-y-4">
          <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-4"><Image src={qrDataUrl} alt="Authenticator app setup QR code" width={240} height={240} unoptimized className="h-48 w-48 rounded-lg bg-white p-2" /><p className="mt-3 text-center text-xs text-slate-600">Scan this QR code with your authenticator app. If needed, enter the setup key manually:</p><code className="mt-2 max-w-full break-all rounded bg-white px-3 py-2 font-mono text-xs text-slate-800">{secret}</code></div>
          <label className="block space-y-1.5 text-xs font-semibold text-slate-700">Authenticator verification code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={newOtp} onChange={(event) => setNewOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-center font-mono text-lg tracking-[0.35em] outline-none focus:border-blue-500" placeholder="000000" /></label>
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          <button type="button" onClick={() => void confirmAuthenticator()} disabled={busy || newOtp.length !== 6} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy ? 'Enabling 2FA...' : 'Verify code and enable policy'}</button>
        </div>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function AssignmentList({ title, emptyText, ids, records, onRemove }: { title: string; emptyText: string; ids: string[]; records: Array<{ id: string; label: string }>; onRemove: (id: string) => void }) {
  return <div className="space-y-2"><h5 className="text-xs font-semibold text-slate-700">{title}</h5>{ids.length ? <div className="space-y-2">{ids.map((id) => <div key={id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700"><span>{records.find((item) => item.id === id)?.label ?? id}</span><button type="button" onClick={() => onRemove(id)} className="text-xs font-medium text-red-600 hover:underline">Remove</button></div>)}</div> : <p className="rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs text-slate-400">{emptyText}</p>}</div>;
}

function PermissionEditor({ permission, policyId, busy, onSave, onDelete }: { permission: EhrPermission; policyId: string; busy: boolean; onSave: (payload: Record<string, unknown>) => void; onDelete: (payload: Record<string, unknown>) => void }) {
  const [fields, setFields] = useState((permission.fields ?? []).join(', '));
  const [filter, setFilter] = useState(prettyJson(permission.permissions));
  const [validation, setValidation] = useState(prettyJson(permission.validation));
  const [presets, setPresets] = useState(prettyJson(permission.presets));
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      onSave({
        action: 'permission:update', id: permission.id, policy: policyId,
        fields: fields.split(',').map((field) => field.trim()).filter(Boolean),
        permissions: parseJsonObject(filter, 'Permission filter'),
        validation: parseJsonObject(validation, 'Validation filter'),
        presets: parseJsonObject(presets, 'Presets'),
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Invalid permission JSON.'); }
  }

  return <details className="rounded-xl border border-slate-200 bg-white">
    <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-slate-800"><span className="inline-flex items-center gap-2"><span className="rounded bg-slate-100 px-2 py-1 font-mono">{permission.action.toUpperCase()}</span>{permission.collection}</span></summary>
    <form onSubmit={submit} className="space-y-3 border-t border-slate-100 p-4">
      <label className="block space-y-1 text-[11px] font-medium text-slate-600">Allowed fields (comma-separated)<input value={fields} onChange={(event) => setFields(event.target.value)} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 font-mono text-xs outline-none focus:border-blue-500" /></label>
      <JsonField label="Row permission filter" value={filter} onChange={setFilter} />
      <JsonField label="Validation filter" value={validation} onChange={setValidation} />
      <JsonField label="Presets" value={presets} onChange={setPresets} />
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap justify-between gap-2"><button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Save Permission</button><button type="button" disabled={busy} onClick={() => { if (window.confirm(`Delete ${permission.action} access for ${permission.collection}? This affects the whole EHR.`)) onDelete({ action: 'permission:delete', id: permission.id }); }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />Delete</button></div>
    </form>
  </details>;
}

function JsonField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block space-y-1 text-[11px] font-medium text-slate-600">{label}<textarea spellCheck={false} rows={4} value={value} onChange={(event) => onChange(event.target.value)} className="w-full resize-y rounded-lg border border-slate-200 px-2.5 py-2 font-mono text-[11px] text-slate-700 outline-none focus:border-blue-500" /></label>;
}

function CreatePermissionForm({ policyId, collections, busy, onCreate }: { policyId: string; collections: string[]; busy: boolean; onCreate: (payload: Record<string, unknown>) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [collection, setCollection] = useState('');
  const [action, setAction] = useState('read');
  const [fields, setFields] = useState('*');
  const [filter, setFilter] = useState('{}');
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!collection) return setError('Choose a collection.');
    if (!window.confirm('This permission applies globally to every user assigned this policy. Review the row filter carefully before continuing.')) return;
    try {
      onCreate({ action: 'permission:create', policy: policyId, collection, permissionAction: action,
        fields: fields.split(',').map((field) => field.trim()).filter(Boolean),
        permissions: parseJsonObject(filter, 'Permission filter') ?? {}, validation: null, presets: null });
      setIsOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Invalid permission JSON.'); }
  }

  return <div>
    <button type="button" onClick={() => setIsOpen((current) => !current)} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Plus className="h-3.5 w-3.5" />Add Permission</button>
    {isOpen && <form onSubmit={submit} className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] leading-relaxed text-amber-800">Adding a permission can grant access across the entire EHR. Use a restrictive row filter where appropriate.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-[11px] font-medium text-slate-600">Collection<select required value={collection} onChange={(event) => setCollection(event.target.value)} className="block h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs"><option value="">Choose collection</option>{collections.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="space-y-1 text-[11px] font-medium text-slate-600">Action<select value={action} onChange={(event) => setAction(event.target.value)} className="block h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs">{['read', 'create', 'update', 'delete', 'share'].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      <label className="block space-y-1 text-[11px] font-medium text-slate-600">Allowed fields<input value={fields} onChange={(event) => setFields(event.target.value)} className="w-full rounded-lg border border-slate-200 px-2.5 py-2 font-mono text-xs" /></label>
      <JsonField label="Row permission filter JSON" value={filter} onChange={setFilter} />
      {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Create Permission</button>
    </form>}
  </div>;
}
