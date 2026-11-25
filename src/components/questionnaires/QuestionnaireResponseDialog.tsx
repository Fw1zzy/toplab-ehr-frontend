'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { questionnaireResponses } from '@/lib/api/questionnaires';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatDateTime } from '@/lib/utils';
import { QuestionnairePatientPicker } from '@/components/questionnaires/QuestionnairePatientPicker';
import type { QuestionnaireField, QuestionnairePatient, QuestionnaireResponse, QuestionnaireSchema, QuestionnaireValue } from '@/types/questionnaire';

export function QuestionnaireResponseDialog({ id, onClose }: { id?: string; onClose: () => void }) {
  const { user } = useAuth();
  const schemaQuery = useQuery({ queryKey: ['questionnaire-schema', user?.id],
    queryFn: ({ signal }) => questionnaireResponses.schema(signal), staleTime: 5 * 60_000 });
  const detailQuery = useQuery({ queryKey: ['questionnaire-response', user?.id, id],
    queryFn: ({ signal }) => questionnaireResponses.get(id!, signal), enabled: !!id, staleTime: 0 });
  const loading = schemaQuery.isLoading || (!!id && detailQuery.isLoading);
  const error = schemaQuery.error ?? detailQuery.error;

  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50" />
      <Dialog.Content onInteractOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => event.preventDefault()} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col bg-white shadow-2xl sm:border-l sm:border-slate-200">
        <Dialog.Title className="sr-only">{id ? 'Edit Questionnaire Response' : 'Add Questionnaire Response'}</Dialog.Title>
        <Dialog.Description className="sr-only">Enter patient history and examination information using the EHR questionnaire fields.</Dialog.Description>
        {loading ? <div role="status" className="flex flex-1 items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />Loading EHR questionnaire...</div>
          : error ? <div className="p-6"><p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error instanceof Error ? error.message : 'Unable to load questionnaire form.'}</p><button type="button" onClick={onClose} className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm">Close</button></div>
            : schemaQuery.data && <ResponseForm key={id ?? 'new'} schema={schemaQuery.data} response={detailQuery.data} onClose={onClose} />}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function ResponseForm({ schema, response, onClose }: { schema: QuestionnaireSchema; response?: QuestionnaireResponse; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [patient, setPatient] = useState<QuestionnairePatient | null>(response?.patient ?? null);
  const patientId = patient?.id ?? '';
  const [group, setGroup] = useState('general');
  const [changes, setChanges] = useState<Record<string, QuestionnaireValue>>(response ? {} : { status: 'draft' });
  const [error, setError] = useState<string | null>(null);
  const values = { ...response?.values, ...changes };
  const groups = schema.groups.filter((item) => item.id === 'general' || schema.fields.some((field) => field.group === item.id));
  const fields = schema.fields.filter((field) => field.group === group && field.name !== 'submitted_at');
  const mutation = useMutation({
    mutationFn: () => questionnaireResponses.save({ id: response?.id, patientId, values: changes }),
    onSuccess: async () => {
      // Re-fetch after writes so the EHR's audit/flow-generated values are read back.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['questionnaire-responses'] }),
        queryClient.invalidateQueries({ queryKey: ['questionnaire-response'] }),
      ]);
      toast.success(response ? 'Questionnaire response updated' : 'Questionnaire response added');
      onClose();
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : 'Unable to save questionnaire response.'),
  });

  function setAnswer(name: string, value: QuestionnaireValue) {
    setChanges((current) => ({ ...current, [name]: value }));
    setError(null);
  }

  function save() {
    if (!patientId) { setError('Select a patient from your branch.'); setGroup('general'); return; }
    for (const field of schema.fields.filter((item) => item.required && !item.readonly)) {
      const value = values[field.name];
      if (value == null || value === '' || (Array.isArray(value) && !value.length)) {
        setGroup(field.group);
        setError(`${field.label} is required.`);
        return;
      }
    }
    setError(null);
    mutation.mutate();
  }

  return <>
    <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
      <div><h2 className="text-lg font-semibold text-slate-900">{response ? 'Edit Questionnaire Response' : 'Add Questionnaire Response'}</h2><p className="mt-1 text-sm text-slate-500">{response ? `${response.patient.first_name} ${response.patient.last_name}` : 'Enter the patient’s history and examination details.'}</p></div>
      <button type="button" disabled={mutation.isPending} onClick={onClose} aria-label="Close questionnaire form" className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-500 disabled:opacity-50"><X className="h-5 w-5" /></button>
    </header>
    <div className="border-b border-slate-200 bg-white px-3 sm:px-6"><nav aria-label="Questionnaire sections" className="scrollbar-thin flex gap-1 overflow-x-auto">{groups.map((item) => <button type="button" key={item.id} aria-current={group === item.id ? 'step' : undefined} onClick={() => setGroup(item.id)} className={`shrink-0 border-b-2 px-3 py-3 text-xs font-medium transition-colors ${group === item.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-700'}`}>{item.label}</button>)}</nav></div>
    <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-6">
      <fieldset disabled={mutation.isPending} className="space-y-6">
        <div className="border-b border-slate-100 pb-3"><h3 className="text-sm font-semibold text-slate-900">{groups.find((item) => item.id === group)?.label}</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">Leave unanswered fields blank. Saving does not run the EHR&apos;s patient-confirmation flow.</p></div>
        {group === 'general' && <section className="space-y-3">
          <h4 className="text-xs font-medium text-slate-700">Patient <span className="text-red-500">*</span></h4>
          {response ? <div><p className="text-sm font-medium text-slate-800">{response.patient.first_name} {response.patient.last_name}</p><p className="mt-1 text-[11px] text-slate-500">The patient association is fixed to protect the integrity of an existing response.</p></div>
            : <QuestionnairePatientPicker value={patient} onChange={(selected) => { setPatient(selected); setError(null); }} disabled={mutation.isPending} />}
          {response && <p className="text-xs text-slate-500">EHR confirmation: <strong>{response.is_finalized ? 'Confirmed' : 'Not confirmed'}</strong></p>}
          {response?.submitted_at && <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"><p className="text-xs font-medium text-slate-700">Submitted At</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(response.submitted_at)}</p></div>}
        </section>}
        <div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <QuestionnaireInput key={field.name} field={field} value={values[field.name] ?? null} onChange={(value) => setAnswer(field.name, value)} />)}</div>
      </fieldset>
    </div>
    <footer className="space-y-3 border-t border-slate-100 bg-slate-50/50 p-6">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-[11px] text-slate-500">{response ? 'Only changed answers are saved.' : 'New responses default to Draft.'}</span><div className="flex gap-3"><button type="button" onClick={onClose} disabled={mutation.isPending} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50">Cancel</button><button type="button" onClick={save} disabled={mutation.isPending || (!!response && !Object.keys(changes).length)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50">{mutation.isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{mutation.isPending ? 'Saving...' : 'Save Response'}</button></div></div>
    </footer>
  </>;
}

function QuestionnaireInput({ field, value, onChange }: { field: QuestionnaireField; value: QuestionnaireValue; onChange: (value: QuestionnaireValue) => void }) {
  const title = <span className="text-xs font-medium text-slate-700">{field.label}{field.required && <span className="ml-1 text-red-500">*</span>}</span>;
  const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50';
  if (field.readonly) return <div className="space-y-1.5">{title}<p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">{value == null || value === '' ? 'Calculated by EHR when available' : String(value)}</p></div>;
  if (field.interface === 'select-radio') return <fieldset className="space-y-2"><legend className="mb-1.5">{title}</legend><div className="flex flex-wrap items-center gap-2">{field.choices.map((choice) => <label key={choice.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${value === choice.value ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><input type="radio" name={field.name} value={choice.value} checked={value === choice.value} onChange={() => onChange(choice.value)} className="h-3.5 w-3.5 accent-blue-600" />{choice.label}</label>)}{!field.required && value != null && <button type="button" onClick={() => onChange(null)} className="px-1 text-[11px] text-slate-400 hover:text-blue-600">Clear</button>}</div></fieldset>;
  if (field.interface === 'select-multiple-checkbox') return <fieldset className="space-y-2"><legend className="mb-1.5">{title}</legend><div className="flex flex-wrap gap-2">{field.choices.map((choice) => <label key={choice.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${Array.isArray(value) && value.includes(choice.value) ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}><input type="checkbox" checked={Array.isArray(value) && value.includes(choice.value)} onChange={(event) => { const selected = Array.isArray(value) ? value : []; onChange(event.target.checked ? [...selected, choice.value] : selected.filter((item) => item !== choice.value)); }} className="h-3.5 w-3.5 rounded accent-blue-600" />{choice.label}</label>)}</div></fieldset>;
  if (field.choices.length) return <label className="block space-y-1.5">{title}<select value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value || null)} className={inputClass}><option value="">Choose...</option>{field.choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>;
  const numeric = ['integer', 'float', 'decimal', 'bigInteger'].includes(field.type);
  const dateTime = ['dateTime', 'timestamp'].includes(field.type);
  let rendered = value == null ? '' : String(value);
  if (dateTime && rendered) {
    const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(rendered) ? rendered : `${rendered}Z`);
    if (Number.isFinite(date.getTime())) rendered = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  return <label className="block space-y-1.5">{title}<input type={numeric ? 'number' : dateTime ? 'datetime-local' : field.type === 'date' ? 'date' : 'text'} step={['integer', 'bigInteger'].includes(field.type) ? '1' : numeric ? 'any' : undefined} maxLength={field.maxLength ?? undefined} placeholder={field.placeholder} value={rendered} onChange={(event) => {
    const next = event.target.value;
    onChange(!next ? null : dateTime ? new Date(next).toISOString() : next);
  }} className={inputClass} /></label>;
}
