'use client';

import { useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { useLabResults } from '@/lib/queries/useLabResults';
import { MOCK_PATIENTS } from '@/lib/api/mock/data';
import { formatDate, getPatientFullName } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { LabResult } from '@/types';

function getPatientName(patientId: string | object): string {
  if (typeof patientId === 'object') return '';
  const p = MOCK_PATIENTS.find((pt) => pt.id === patientId);
  return p ? getPatientFullName(p) : String(patientId);
}

const STATUS_TABS = ['all', 'pending', 'processing', 'completed', 'released'];
const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'hematology', label: 'Hematology' },
  { id: 'clinical_chemistry', label: 'Chemistry' },
  { id: 'urinalysis', label: 'Urinalysis' },
  { id: 'serology', label: 'Serology' },
  { id: 'microbiology', label: 'Microbiology' },
  { id: 'imaging', label: 'Imaging' },
  { id: 'other', label: 'Other' },
];

const PAGE_SIZE = 10;

export default function LaboratoryPage() {
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [categoryTab, setCategoryTab] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useLabResults({
    status: statusTab === 'all' ? undefined : statusTab,
    category: categoryTab === 'all' ? undefined : categoryTab,
    page,
    limit: PAGE_SIZE,
  });

  const results = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = search
    ? results.filter((l: LabResult) => {
        const name = getPatientName(l.patient_id).toLowerCase();
        return name.includes(search.toLowerCase()) || l.test_name.toLowerCase().includes(search.toLowerCase());
      })
    : results;

  return (
    <div className="space-y-5">
      <PageHeader title="Laboratory" description="Manage and track all laboratory requests and results" />

      {/* Status tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => { setStatusTab(tab); setPage(1); }}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-medium capitalize transition-colors',
              statusTab === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50',
            )}
            id={`status-tab-${tab}`}
          >
            {tab === 'all' ? 'All Results' : tab}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-100 overflow-x-auto">
          <nav className="flex">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setCategoryTab(tab.id); setPage(1); }}
                id={`category-tab-${tab.id}`}
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-xs font-medium border-b-2 transition-colors',
                  categoryTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <SearchInput value={search} onChange={setSearch} placeholder="Search by patient or test..." className="w-64" id="lab-search" />
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-red-600">Unable to load laboratory results.</div>
        ) : isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={FlaskConical} title="No results found" description="No laboratory records match your current filters." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Laboratory results table">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Test</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Requested</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Collected</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">AI Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((lab: LabResult) => {
                    const name = getPatientName(lab.patient_id);
                    return (
                      <tr key={lab.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={name} size="sm" />
                            <span className="text-xs font-medium text-slate-900">{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-medium text-slate-700">{lab.test_name}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                            {lab.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">{formatDate(lab.requested_date)}</td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 tabular-nums">{lab.collected_date ? formatDate(lab.collected_date) : '—'}</td>
                        <td className="px-4 py-3.5"><StatusBadge status={lab.status} /></td>
                        <td className="px-4 py-3.5 max-w-xs">
                          {lab.ai_interpretation ? (
                            <p className="text-xs text-slate-600 truncate" title={lab.ai_interpretation}>
                              {lab.ai_interpretation}
                            </p>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">{total} results</p>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 px-3 rounded-md border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors">Previous</button>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-7 px-3 rounded-md border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-50 transition-colors">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
