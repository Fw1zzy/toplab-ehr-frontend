'use client';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { Activity, CalendarClock, ChevronRight, FilePlus2, FlaskConical, Search, TestTube2, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useEncounters } from '@/lib/queries/useEncounters';
import { usePatients } from '@/lib/queries/usePatients';
import { api } from '@/lib/api';
import { ResultCollection } from '@/lib/api/likha';
import { formatDate } from '@/lib/utils';
import { Encounter, LabResult } from '@/types';
import { usePreferences } from '@/lib/auth/PreferencesProvider';

interface ResultField {
  name: string;
  label: string;
  type: string;
  interface: string | null;
  required: boolean;
  choices: Array<{ text: string; value: string | number }>;
}

interface ResultGroup {
  collection: ResultCollection;
  label: string;
  fields: ResultField[];
}

type ResultRow = Record<string, unknown> & { id: string };

const patientIdFromEncounter = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'id' in value) return String(value.id);
  return '';
};

function displayValue(value: unknown) {
  if (value == null || value === '') return 'Not entered';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function patientLabel(patient: Encounter['patient_id'], names: Map<string, string>, isLoading: boolean) {
  if (typeof patient === 'object' && patient) {
    const name = `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim();
    if (name) return name;
    return names.get(patient.id) ?? (isLoading ? 'Loading patient...' : 'Unknown patient');
  }
  return names.get(patient) ?? (isLoading ? 'Loading patient...' : 'Unknown patient');
}

export function LabResultsManager() {
  const { preferences } = usePreferences();
  const queryClient = useQueryClient();
  const [selectedCollection, setSelectedCollection] = useState<ResultCollection | 'all'>('all');
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [resultSearch, setResultSearch] = useState('');
  const settledSearch = useDebouncedValue(resultSearch);
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'with_results'>('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const schemaQuery = useQuery({
    queryKey: ['lab-results-schema'],
    queryFn: async () => {
      const response = await fetch('/api/lab-results/schema');
      if (!response.ok) throw new Error('Unable to load lab result schema.');
      return response.json() as Promise<ResultGroup[]>;
    },
    staleTime: 60 * 60 * 1000,
  });
  const collections = schemaQuery.data ?? [];
  const isAllResults = selectedCollection === 'all';
  const activeGroup = isAllResults ? null : collections.find((item) => item.collection === selectedCollection) ?? null;

  const allResultsQuery = useQuery({
    queryKey: ['lab-results', 'all-collections', page, preferences.rowsPerPage, statusFilter, settledSearch],
    queryFn: ({ signal }) => api.labResults.getAll({ page, limit: preferences.rowsPerPage, status: statusFilter, search: settledSearch }, signal),
    enabled: isAllResults,
    staleTime: 30_000,
  });
  const collectionQuery = useQuery({
    queryKey: ['lab-result-collection', selectedCollection, page, preferences.rowsPerPage, statusFilter, settledSearch],
    queryFn: ({ signal }) => api.labResults.getCollectionPage(selectedCollection as ResultCollection, { page, limit: preferences.rowsPerPage, status: statusFilter, search: settledSearch }, signal),
    enabled: !isAllResults && !!activeGroup,
    staleTime: 30_000,
  });
  const countsQuery = useQuery({
    queryKey: ['lab-results', 'counts', selectedCollection],
    queryFn: ({ signal }) => api.labResults.getCounts(isAllResults ? undefined : selectedCollection as ResultCollection, signal),
    enabled: isAllResults || !!activeGroup,
    staleTime: 30_000,
  });
  const resultDetailQuery = useQuery({
    queryKey: ['lab-results', 'detail', selectedCollection, selectedResultId],
    queryFn: ({ signal }) => api.labResults.getCollectionRecord(selectedCollection as ResultCollection, selectedResultId!, signal),
    enabled: !isAllResults && !!activeGroup && !!selectedResultId,
    staleTime: 30_000,
  });
  const encountersQuery = useEncounters({ page: 1, limit: 100 });
  const patientsQuery = usePatients({ limit: 100 });
  const rows = collectionQuery.data?.data ?? [];
  const allRows = allResultsQuery.data?.data ?? [];

  const patientNames = useMemo(() => new Map((patientsQuery.data?.data ?? []).map((patient) => [
    patient.id,
    `${patient.first_name} ${patient.last_name}`.trim(),
  ])), [patientsQuery.data]);
  const patientIdByEncounter = useMemo(() => new Map((encountersQuery.data?.data ?? []).map((encounter) => [
    encounter.id,
    patientIdFromEncounter(encounter.patient_id),
  ])), [encountersQuery.data]);

  function getResultPatient(row: ResultRow | LabResult) {
    let patientId = '';
    if ('patient_id' in row) {
      if (row.patient_id && typeof row.patient_id === 'object') {
        const patient = row.patient_id as { first_name?: string; last_name?: string };
        const name = `${patient.first_name ?? ''} ${patient.last_name ?? ''}`.trim();
        if (name) return name;
      }
      patientId = patientIdFromEncounter(row.patient_id);
    } else {
      const encounter = (row as ResultRow).encounter;
      if (encounter && typeof encounter === 'object' && 'patient' in encounter) {
        const linkedPatient = encounter.patient as { first_name?: string; last_name?: string } | null;
        const name = linkedPatient && `${linkedPatient.first_name ?? ''} ${linkedPatient.last_name ?? ''}`.trim();
        if (name) return name;
      }
      const encounterId = patientIdFromEncounter((row as ResultRow).encounter);
      patientId = patientIdByEncounter.get(encounterId) ?? '';
    }
    return patientNames.get(patientId) ?? (patientsQuery.isLoading || encountersQuery.isLoading ? 'Loading patient...' : 'Unknown patient');
  }

  const viewedRows: Array<ResultRow | LabResult> = isAllResults ? allRows : rows;
  const inProgressCount = countsQuery.data?.inProgress ?? 0;
  const withResultsCount = countsQuery.data?.withResults ?? 0;
  const resultTotal = isAllResults ? allResultsQuery.data?.total ?? 0 : collectionQuery.data?.total ?? 0;
  const pageSize = preferences.rowsPerPage;
  const totalPages = Math.max(1, Math.ceil(resultTotal / pageSize));
  const visibleRows = viewedRows;
  const selectedRow = resultDetailQuery.data ?? rows.find((row) => String(row.id) === selectedResultId) ?? null;
  const selectedFields = activeGroup?.fields.filter((field) => field.name !== 'encounter') ?? [];
  const isLoading = isAllResults ? allResultsQuery.isLoading : collectionQuery.isLoading;
  const error = isAllResults ? allResultsQuery.error : collectionQuery.error;
  const recordCount = countsQuery.data?.total ?? resultTotal;

  return (
    <div className="space-y-5">
      <PageHeader title="Laboratory" description="Browse each EHR result collection, track encoding progress, and enter results directly into the matching collection." />

      <div className="grid min-h-[calc(100vh-12rem)] gap-5 xl:grid-cols-[270px_minmax(0,1fr)]">
        <aside className="flex max-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={categorySearch} onChange={(event) => setCategorySearch(event.target.value)} placeholder="Find a result type" aria-label="Find a result collection" className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-blue-400 focus:bg-white" />
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-2" aria-label="Result collections">
            <button type="button" onClick={() => { setSelectedCollection('all'); setSelectedResultId(null); setResultSearch(''); setStatusFilter('all'); setPage(1); }} aria-current={isAllResults ? 'page' : undefined} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition-colors ${isAllResults ? 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-100' : 'text-slate-600 hover:bg-slate-50'}`}>
              <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg ${isAllResults ? 'bg-white text-blue-700' : 'bg-slate-50 text-slate-400'}`}><Activity className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">All Results</span>
              <ChevronRight className={`h-3.5 w-3.5 flex-none ${isAllResults ? 'text-blue-600' : 'text-slate-300'}`} />
            </button>
            {schemaQuery.isLoading ? <p className="p-3 text-xs text-slate-400">Loading collections...</p> : schemaQuery.error ? (
              <p className="p-3 text-xs text-red-600">Unable to load collection schema.</p>
            ) : collections.filter((item) => item.label.toLowerCase().includes(categorySearch.toLowerCase())).map((item) => (
              <button key={item.collection} type="button" onClick={() => { setSelectedCollection(item.collection); setSelectedResultId(null); setResultSearch(''); setStatusFilter('all'); setPage(1); }} aria-current={item.collection === selectedCollection ? 'page' : undefined} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-colors ${item.collection === selectedCollection ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg ${item.collection === selectedCollection ? 'bg-white text-blue-600' : 'bg-slate-50 text-slate-400'}`}><FlaskConical className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <ChevronRight className={`h-3.5 w-3.5 flex-none ${item.collection === selectedCollection ? 'text-blue-600' : 'text-slate-300'}`} />
              </button>
            ))}
          </nav>
          <div className="border-t border-slate-100 px-4 py-3 text-[10px] leading-relaxed text-slate-400">Each section reads and writes its matching EHR result collection.</div>
        </aside>

        <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600"><TestTube2 className="h-5 w-5" /></div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-slate-900">{isAllResults ? 'All Results' : activeGroup?.label ?? 'Select a result collection'}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{recordCount} records · {inProgressCount} in progress · {withResultsCount} with results</p>
              </div>
            </div>
            <button type="button" disabled={!activeGroup} onClick={() => setCreateOpen(true)} title={isAllResults ? 'Choose a result type before adding a record' : undefined} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"><FilePlus2 className="h-4 w-4" />Add Result</button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5">
            {([
              ['all', 'All Progress'],
              ['in_progress', 'In Progress'],
              ['with_results', 'With Results'],
            ] as const).map(([value, label]) => <button key={value} type="button" onClick={() => { setStatusFilter(value); setPage(1); }} className={`h-8 rounded-lg px-3 text-[11px] font-medium transition-colors ${statusFilter === value ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{label}</button>)}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={resultSearch} onChange={(event) => { setResultSearch(event.target.value); setPage(1); }} placeholder="Search patient, test type, or remarks" aria-label="Search results" className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-blue-400" />
            </div>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400"><CalendarClock className="h-3.5 w-3.5" />Live EHR records</span>
          </div>

          {error ? (
              <p role="alert" className="p-8 text-center text-sm text-red-600">{isAllResults ? 'Unable to read lab result collections from the EHR.' : `Unable to read ${activeGroup?.collection} from the EHR.`}</p>
          ) : isLoading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
          ) : visibleRows.length === 0 ? (
            <div className="flex flex-1 items-center justify-center p-8"><EmptyState icon={FlaskConical} title={isAllResults ? 'No results match this status' : 'No results in this collection'} description={isAllResults ? 'Try another progress filter or search term.' : 'Add a result record here. It will be saved to this EHR collection.'} /></div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              {isAllResults ? <table className="w-full min-w-[740px] text-sm" aria-label="All lab results">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur"><tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Patient</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Result Type</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Requested</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Collected</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Progress</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-50">{visibleRows.map((item) => {
                  const result = item as LabResult;
                  const label = collections.find((collection) => collection.collection === result.result_collection)?.label ?? result.test_name;
                  const targetCollection = result.result_collection as ResultCollection;
                  const selected = result.id === selectedResultId;
                  return <tr key={`${result.result_collection}-${result.id}`} onClick={() => { setSelectedCollection(targetCollection); setSelectedResultId(result.id); setPage(1); }} onKeyDown={(event) => { if (event.key === 'Enter') { setSelectedCollection(targetCollection); setSelectedResultId(result.id); setPage(1); } }} tabIndex={0} className={`cursor-pointer outline-none transition-colors hover:bg-blue-50/50 focus-visible:bg-blue-50/70 ${selected ? 'bg-blue-50/60' : ''}`}>
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-800">{getResultPatient(result)}</td>
                    <td className="px-4 py-3.5 text-xs font-medium text-slate-700">{label}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{result.requested_date ? formatDate(result.requested_date) : '—'}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{result.collected_date ? formatDate(result.collected_date) : '—'}</td>
                    <td className="px-4 py-3.5"><ProgressPill value={result.status} /></td>
                  </tr>;
                })}</tbody>
              </table> : <table className="w-full min-w-[720px] text-sm" aria-label={`${activeGroup?.label ?? 'Lab'} results`}>
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur"><tr className="border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Patient</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  {selectedFields.filter((field) => field.name !== 'Status').slice(0, 3).map((field) => <th key={field.name} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">{field.label}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">{visibleRows.map((item) => {
                  const row = item as ResultRow;
                  const active = String(row.id) === selectedResultId;
                  return <tr key={String(row.id)} onClick={() => setSelectedResultId(String(row.id))} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedResultId(String(row.id)); }} tabIndex={0} aria-selected={active} className={`cursor-pointer outline-none transition-colors hover:bg-blue-50/40 focus-visible:bg-blue-50/60 ${active ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-5 py-3.5 text-xs font-medium text-slate-800">{getResultPatient(row)}</td>
                    <td className="px-4 py-3.5"><ProgressPill value={row.Status} /></td>
                    {selectedFields.filter((field) => field.name !== 'Status').slice(0, 3).map((field) => <td key={field.name} className="max-w-48 truncate px-4 py-3.5 text-xs text-slate-600">{displayValue(row[field.name])}</td>)}
                  </tr>;
                })}</tbody>
              </table>}
              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <p className="text-[11px] text-slate-500">{resultTotal} matching results</p>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded-md border border-slate-200 px-3 py-1.5 text-[11px] disabled:opacity-40">Previous</button>
                  <span className="px-2 py-1.5 text-[11px] text-slate-500">{page} / {totalPages}</span>
                  <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages} className="rounded-md border border-slate-200 px-3 py-1.5 text-[11px] disabled:opacity-40">Next</button>
                </div>
              </div>
            </div>
          )}

          {selectedRow && activeGroup && <ResultDetail row={selectedRow} fields={selectedFields} patient={getResultPatient(selectedRow)} onClose={() => setSelectedResultId(null)} />}
        </section>
      </div>

      {activeGroup && <AddResultDialog
        group={activeGroup}
        open={createOpen}
        encounters={encountersQuery.data?.data ?? []}
        encountersLoading={encountersQuery.isLoading}
        getPatientName={(patient) => patientLabel(patient, patientNames, patientsQuery.isLoading)}
        onOpenChange={setCreateOpen}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['lab-result-collection', activeGroup.collection] });
          queryClient.invalidateQueries({ queryKey: ['lab-results'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }}
      />}
    </div>
  );
}

function ProgressPill({ value }: { value: unknown }) {
  const status = String(value ?? '').toLowerCase();
  const completed = status === 'with_results' || status === 'completed' || status === 'released';
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{progressText(status)}</span>;
}

function progressText(status: string) {
  if (status === 'with_results' || status === 'completed' || status === 'released') return 'With Results';
  if (status === 'for_encoding' || status === 'processing' || status === 'pending') return 'In Progress';
  return status ? status.replace(/_/g, ' ') : 'Not Set';
}

function ResultDetail({ row, fields, patient, onClose }: { row: ResultRow; fields: ResultField[]; patient: string; onClose: () => void }) {
  const details = fields.filter((field) => row[field.name] != null && row[field.name] !== '');
  return (
    <aside className="border-t border-blue-100 bg-blue-50/30 p-5" aria-label="Selected lab result details">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">Result details</p><h3 className="mt-1 text-sm font-semibold text-slate-900">{patient}</h3></div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700" aria-label="Close result details"><X className="h-4 w-4" /></button>
      </div>
      {details.length ? <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {details.map((field) => <div key={field.name} className="min-w-0"><dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{field.label}</dt><dd className="mt-1 break-words text-xs text-slate-800">{displayValue(row[field.name])}</dd></div>)}
      </dl> : <p className="text-xs text-slate-500">No result values have been entered yet.</p>}
    </aside>
  );
}

function AddResultDialog({ group, open, encounters, encountersLoading, getPatientName, onOpenChange, onSaved }: {
  group: ResultGroup;
  open: boolean;
  encounters: Encounter[];
  encountersLoading: boolean;
  getPatientName: (patient: Encounter['patient_id']) => string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [encounterId, setEncounterId] = useState('');
  const [values, setValues] = useState<Record<string, string | File>>({ Status: 'for_encoding' });
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async () => {
      const data: Record<string, unknown> = { encounter: encounterId };
      for (const field of group.fields) {
        if (field.name === 'encounter') continue;
        const value = values[field.name];
        if (value == null || value === '') continue;
        if (value instanceof File) {
          data[field.name] = await api.labResults.uploadFile(value);
        } else if (field.type === 'integer' || field.type === 'decimal' || field.type === 'float') {
          data[field.name] = Number(value);
        } else if (field.type === 'dateTime') {
          data[field.name] = new Date(value).toISOString();
        } else {
          data[field.name] = value;
        }
      }
      return api.labResults.createInCollection(group.collection, data);
    },
    onSuccess: () => {
      onSaved();
      setEncounterId('');
      setValues({ Status: 'for_encoding' });
      setError(null);
      onOpenChange(false);
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'Unable to save this result to the EHR.'),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    mutation.mutate();
  }

  function renderField(field: ResultField) {
    const common = 'mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
    const value = values[field.name];
    if (field.choices.length) return <select required={field.required} value={typeof value === 'string' ? value : ''} onChange={(event) => setValues((previous) => ({ ...previous, [field.name]: event.target.value }))} className={common}>
      <option value="">Choose...</option>
      {field.choices.map((choice) => <option key={String(choice.value)} value={String(choice.value)}>{choice.text}</option>)}
    </select>;
    if (field.interface === 'file-image' || field.type === 'file') return <input type="file" accept="image/*,.pdf" required={field.required} onChange={(event) => setValues((previous) => ({ ...previous, [field.name]: event.target.files?.[0] ?? '' }))} className="mt-1.5 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700" />;
    if (field.type === 'text' || field.interface === 'input-multiline') return <textarea required={field.required} rows={3} value={typeof value === 'string' ? value : ''} onChange={(event) => setValues((previous) => ({ ...previous, [field.name]: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" />;
    const inputType = field.type === 'dateTime' ? 'datetime-local'
      : ['integer', 'decimal', 'float'].includes(field.type) ? 'number' : 'text';
    return <input type={inputType} step={inputType === 'number' ? 'any' : undefined} required={field.required} value={typeof value === 'string' ? value : ''} onChange={(event) => setValues((previous) => ({ ...previous, [field.name]: event.target.value }))} className={common} />;
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl sm:border-l sm:border-slate-200">
          <header className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div><Dialog.Title className="text-lg font-semibold text-slate-900">Add {group.label} Result</Dialog.Title><Dialog.Description className="mt-1 text-xs text-slate-500">This creates a record in <code>{group.collection}</code> in the EHR.</Dialog.Description></div>
            <Dialog.Close asChild><button type="button" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button></Dialog.Close>
          </header>
          <form id="add-lab-result-form" onSubmit={submit} className="flex-1 space-y-5 overflow-y-auto p-6">
            <label className="block text-xs font-semibold text-slate-700">Encounter / Patient <span className="text-red-500">*</span>
              <select required value={encounterId} onChange={(event) => setEncounterId(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10">
                <option value="">{encountersLoading ? 'Loading encounters...' : 'Select an encounter'}</option>
                {encounters.map((encounter) => <option key={encounter.id} value={encounter.id}>{getPatientName(encounter.patient_id)} · {formatDate(encounter.encounter_date, 'MMM d, yyyy h:mm a')}</option>)}
              </select>
            </label>
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              {group.fields.filter((field) => field.name !== 'encounter').map((field) => <label key={field.name} className="block min-w-0 text-xs font-semibold text-slate-700">{field.label}{field.required && <span className="ml-1 text-red-500">*</span>}{renderField(field)}</label>)}
            </div>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          </form>
          <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/70 p-5">
            <Dialog.Close asChild><button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button></Dialog.Close>
            <button type="submit" form="add-lab-result-form" disabled={mutation.isPending || encountersLoading} className="rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{mutation.isPending ? 'Saving to EHR...' : 'Save Result'}</button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
