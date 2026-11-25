'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Pencil, Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { QuestionnaireResponseDialog } from '@/components/questionnaires/QuestionnaireResponseDialog';
import { questionnaireResponses } from '@/lib/api/questionnaires';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePreferences } from '@/lib/auth/PreferencesProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDateTime } from '@/lib/utils';

export default function QuestionnaireResponsesPage() {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ id?: string } | null>(null);
  const settledSearch = useDebouncedValue(search);
  const query = useQuery({
    queryKey: ['questionnaire-responses', user?.id, page, preferences.rowsPerPage, settledSearch, status],
    queryFn: ({ signal }) => questionnaireResponses.list({ page, limit: preferences.rowsPerPage, search: settledSearch, status }, signal),
    enabled: !!user, staleTime: 30_000,
  });
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / preferences.rowsPerPage));

  return <div className="space-y-5">
    <PageHeader title="Questionnaire Responses" description="Manage patient medical histories and physical examination responses from the EHR." actions={
      <button type="button" onClick={() => setEditor({})} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"><Plus className="h-3.5 w-3.5" />Add Response</button>
    } />
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
      <SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Search patient name..." className="w-72" />
      <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="Response status" className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
        <option value="">All active statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
      </select>
      <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{query.data?.total ?? 0} responses</span>
    </div>
      {query.isLoading ? <TableSkeleton rows={5} cols={7} /> : query.error ? <p role="alert" className="p-6 text-sm text-red-700">{query.error instanceof Error ? query.error.message : 'Unable to load questionnaire responses.'}</p>
        : !query.data?.data.length ? <EmptyState icon={ClipboardList} title="No questionnaire responses" description="Add a response for a patient owned by your branch, or change the search filters." />
          : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3 font-semibold">Patient</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Confirmation</th><th className="px-4 py-3 font-semibold">Submitted At</th><th className="px-4 py-3 font-semibold">Created</th><th className="px-4 py-3 font-semibold">Updated</th><th className="px-4 py-3 text-right font-semibold">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{query.data.data.map((response) => <tr key={response.id} className="transition-colors hover:bg-slate-50/60">
              <td className="px-5 py-3.5"><button type="button" onClick={() => setEditor({ id: response.id })} className="text-left font-medium text-slate-900 hover:text-blue-600 hover:underline">{response.patient.first_name} {response.patient.last_name}</button></td>
              <td className="px-4 py-3.5"><StatusBadge status={response.status} /></td>
              <td className="px-4 py-4 text-slate-600">{response.is_finalized ? 'Confirmed in EHR' : 'Not confirmed'}</td>
              <td className="px-4 py-4 text-slate-500">{formatDateTime(response.submitted_at)}</td>
              <td className="px-4 py-4 text-slate-500">{formatDateTime(response.date_created)}</td><td className="px-4 py-4 text-slate-500">{formatDateTime(response.date_updated)}</td>
              <td className="px-4 py-3.5 text-right"><button type="button" onClick={() => setEditor({ id: response.id })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" />Edit</button></td>
            </tr>)}</tbody>
          </table></div>}
      {!query.error && <footer className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500"><span>Page {page} of {pages}</span><div className="flex gap-2"><button type="button" disabled={query.isFetching || page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 transition-colors hover:bg-slate-50 disabled:opacity-40">Previous</button><button type="button" disabled={query.isFetching || page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-md border border-slate-200 bg-white px-3 py-1.5 transition-colors hover:bg-slate-50 disabled:opacity-40">Next</button></div></footer>}
    </section>
    {editor && <QuestionnaireResponseDialog id={editor.id} onClose={() => setEditor(null)} />}
  </div>;
}
