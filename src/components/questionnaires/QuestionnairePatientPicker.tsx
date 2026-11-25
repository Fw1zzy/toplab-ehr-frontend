'use client';

import { useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, LoaderCircle, Search } from 'lucide-react';
import { questionnaireResponses } from '@/lib/api/questionnaires';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { QuestionnairePatient } from '@/types/questionnaire';

export function QuestionnairePatientPicker({ value, onChange, disabled }: {
  value: QuestionnairePatient | null;
  onChange: (patient: QuestionnairePatient | null) => void;
  disabled: boolean;
}) {
  const { user } = useAuth();
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(0);
  const settled = useDebouncedValue(search);
  const query = useQuery({
    queryKey: ['questionnaire-patients', user?.id, settled.trim()],
    queryFn: ({ signal }) => questionnaireResponses.patients(settled.trim(), signal),
    enabled: open && !disabled && !!user, staleTime: 15_000,
  });
  const pending = search.trim() !== settled.trim() || query.isFetching;
  const results = search.trim() === settled.trim() ? query.data ?? [] : [];
  const highlighted = Math.min(active, Math.max(0, results.length - 1));

  function choose(patient: QuestionnairePatient) {
    onChange(patient);
    setSearch('');
    setOpen(false);
    setActive(0);
  }

  return <div className="space-y-1.5">
    <div className="relative" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setSearch(''); }
    }}>
      <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
      <input
        ref={input} role="combobox" aria-label="Search and select patient" aria-autocomplete="list"
        aria-expanded={open} aria-controls={listId}
        aria-activedescendant={open && !pending && !query.error && results[highlighted] ? `${listId}-${highlighted}` : undefined}
        autoComplete="off" disabled={disabled}
        value={open ? search : value ? `${value.first_name} ${value.last_name}`.trim() : ''}
        placeholder="Search or choose a patient..."
        onFocus={() => setOpen(true)}
        onChange={(event) => { setSearch(event.target.value); setOpen(true); setActive(0); onChange(null); }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpen(true);
            setActive((current) => Math.max(0, Math.min(results.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1))));
          } else if (event.key === 'Enter' && open) {
            event.preventDefault();
            if (!pending && results[highlighted]) choose(results[highlighted]);
          } else if (event.key === 'Escape') {
            event.preventDefault(); event.stopPropagation(); setOpen(false); setSearch('');
          }
        }}
        className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-10 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
      />
      <button type="button" disabled={disabled} aria-label="Show patient choices" aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => { if (open) setOpen(false); else { setOpen(true); input.current?.focus(); } }}
        className="absolute right-1.5 top-1.5 rounded-md p-1.5 text-slate-400 hover:bg-slate-50 hover:text-blue-600">
        {pending && open ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
        {pending ? <p role="status" className="px-4 py-3 text-xs text-slate-500">Searching EHR patients...</p>
          : query.error ? <p role="alert" className="px-4 py-3 text-xs text-red-700">{query.error instanceof Error ? query.error.message : 'Unable to load patients.'}</p>
            : !results.length ? <p className="px-4 py-4 text-xs text-slate-500">No matching patients in this branch.</p> : null}
        <ul id={listId} role="listbox" aria-label="Matching branch patients" className="scrollbar-thin max-h-56 overflow-y-auto">
          {!pending && !query.error && results.map((patient, index) => <li key={patient.id} id={`${listId}-${index}`} role="option" aria-selected={patient.id === value?.id}>
            <button type="button" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(patient)} onMouseEnter={() => setActive(index)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm ${highlighted === index ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}>
              <span>{patient.first_name} {patient.last_name}</span>{patient.id === value?.id && <Check className="h-4 w-4 flex-none" />}
            </button>
          </li>)}
        </ul>
        <p className="border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-[10px] text-slate-400">Up to 25 matches. Type a first or last name to narrow results.</p>
      </div>}
    </div>
    {value && <p className="flex items-center gap-1.5 text-[11px] text-blue-700"><Check className="h-3 w-3" />Selected: {value.first_name} {value.last_name}</p>}
  </div>;
}
