'use client';

import { DragEvent, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, MonitorCog, Palette, Rows3, RotateCcw, Route } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { AppPreferences, DEFAULT_PREFERENCES, usePreferences } from '@/lib/auth/PreferencesProvider';
import { NAV_GROUPS } from '@/components/layout/AppSidebar';
import { toast } from 'sonner';

const LANDING_PAGES = [
  { value: '/dashboard', label: 'Dashboard' },
  { value: '/patients', label: 'Patients' },
  { value: '/encounters', label: 'Encounters' },
  { value: '/queue', label: 'Patient Queue' },
  { value: '/laboratory', label: 'Laboratory' },
] as const;

function hexToRgb(hex: string) {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue].map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')).join('')}`;
}

export default function SettingsPage() {
  const { preferences, savePreferences } = usePreferences();
  const [draft, setDraft] = useState<AppPreferences>(preferences);
  const [draggedHref, setDraggedHref] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [red, green, blue] = hexToRgb(draft.accentColor);
  const dirty = JSON.stringify(draft) !== JSON.stringify(preferences);

  useEffect(() => setDraft(preferences), [preferences]);

  function updateDraft(changes: Partial<AppPreferences>) {
    setDraft((current) => ({ ...current, ...changes }));
    setSaveError(null);
  }

  function dropNavigationItem(groupItems: string[], targetHref: string, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const sourceHref = event.dataTransfer.getData('text/plain') || draggedHref;
    if (!sourceHref || sourceHref === targetHref || !groupItems.includes(sourceHref)) return;
    const order = [...draft.navigationOrder];
    const groupOrder = order.filter((item) => groupItems.includes(item));
    const from = groupOrder.indexOf(sourceHref);
    const to = groupOrder.indexOf(targetHref);
    if (from < 0 || to < 0) return;
    groupOrder.splice(to, 0, ...groupOrder.splice(from, 1));
    const positions = order.map((item, position) => groupItems.includes(item) ? position : -1).filter((position) => position >= 0);
    positions.forEach((position, groupIndex) => { order[position] = groupOrder[groupIndex]; });
    updateDraft({ navigationOrder: order });
    setDraggedHref(null);
  }

  function save() {
    try {
      savePreferences(draft);
      setSaveError(null);
      toast.success('Settings saved');
    } catch {
      setSaveError('Unable to save settings in this browser.');
    }
  }

  function resetDraft() {
    setDraft(DEFAULT_PREFERENCES);
    setSaveError(null);
  }

  function moveNavigationItem(groupItems: string[], href: string, direction: -1 | 1) {
    const order = [...draft.navigationOrder];
    const groupOrder = order.filter((item) => groupItems.includes(item));
    const index = groupOrder.indexOf(href);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= groupOrder.length) return;
    [groupOrder[index], groupOrder[next]] = [groupOrder[next], groupOrder[index]];
    const positions = order.map((item, position) => groupItems.includes(item) ? position : -1).filter((position) => position >= 0);
    positions.forEach((position, groupIndex) => { order[position] = groupOrder[groupIndex]; });
    updateDraft({ navigationOrder: order });
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Customize your EHR workspace. Changes take effect after you save." actions={
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={resetDraft} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"><RotateCcw className="h-3.5 w-3.5" />Reset draft</button>
          <button type="button" onClick={save} disabled={!dirty} className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Save Changes</button>
        </div>
      } />

      {dirty && <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-800">You have unsaved settings changes.</p>}
      {saveError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">{saveError}</p>}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><MonitorCog className="h-4 w-4" /></span>
          <div><h2 className="text-sm font-semibold text-slate-900">Workspace</h2><p className="mt-0.5 text-xs text-slate-500">Choose how the workspace opens and displays records.</p></div>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><Route className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="text-sm font-medium text-slate-800">Default landing page</p><p className="mt-1 text-xs text-slate-500">The first page opened after signing in.</p></div></div>
            <select value={draft.defaultLanding} onChange={(event) => updateDraft({ defaultLanding: event.target.value as AppPreferences['defaultLanding'] })} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 sm:w-56">
              {LANDING_PAGES.map((page) => <option key={page.value} value={page.value}>{page.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><Rows3 className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="text-sm font-medium text-slate-800">Rows per page</p><p className="mt-1 text-xs text-slate-500">Default page size for supported tables.</p></div></div>
            <select value={draft.rowsPerPage} onChange={(event) => updateDraft({ rowsPerPage: Number(event.target.value) as AppPreferences['rowsPerPage'] })} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 sm:w-56"><option value={10}>10 rows</option><option value={25}>25 rows</option><option value={50}>50 rows</option></select>
          </div>
          <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><Rows3 className="mt-0.5 h-4 w-4 text-slate-400" /><div><p className="text-sm font-medium text-slate-800">Table density</p><p className="mt-1 text-xs text-slate-500">Compact tables show more rows at once.</p></div></div>
            <div className="grid w-full grid-cols-2 gap-2 sm:w-56">{(['comfortable', 'compact'] as const).map((density) => <button key={density} type="button" aria-pressed={draft.density === density} onClick={() => updateDraft({ density })} className={`h-9 rounded-lg border px-3 text-xs font-medium capitalize transition-colors ${draft.density === density ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{density}</button>)}</div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Palette className="h-4 w-4" /></span>
          <div><h2 className="text-sm font-semibold text-slate-900">Accent Color</h2><p className="mt-0.5 text-xs text-slate-500">Pick any RGB color or enter its channel values.</p></div>
        </div>
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <input type="color" aria-label="Pick accent color" value={draft.accentColor} onChange={(event) => updateDraft({ accentColor: event.target.value })} className="h-12 w-16 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" />
            <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Hex
              <input readOnly value={draft.accentColor.toUpperCase()} className="mt-1 block h-9 w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm font-normal text-slate-700 outline-none" />
            </label>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-3">
            {[['R', red], ['G', green], ['B', blue]].map(([channel, value]) => <label key={channel} className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500">{channel}
              <input type="number" min={0} max={255} value={value} onChange={(event) => { const next = Number(event.target.value); const rgb = [red, green, blue]; const index = channel === 'R' ? 0 : channel === 'G' ? 1 : 2; rgb[index] = next; updateDraft({ accentColor: rgbToHex(rgb[0], rgb[1], rgb[2]) }); }} className="mt-1 block h-9 w-full rounded-lg border border-slate-200 px-2 text-sm font-normal text-slate-800 outline-none focus:border-blue-500" />
            </label>)}
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600"><span className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: draft.accentColor }} />Preview</div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Rows3 className="h-4 w-4" /></span>
          <div><h2 className="text-sm font-semibold text-slate-900">Navigation Order</h2><p className="mt-0.5 text-xs text-slate-500">Drag links to reorder them within each sidebar section. Use the arrows on touch devices.</p></div>
        </div>
        <div className="divide-y divide-slate-100 px-5">
          {NAV_GROUPS.map((group) => {
            const orderedItems = [...group.items].sort((left, right) => draft.navigationOrder.indexOf(left.href) - draft.navigationOrder.indexOf(right.href));
            const groupItems = group.items.map((item) => item.href);
            return <div key={group.title} className="py-4">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{group.title}</h3>
              <div className="space-y-1" onDragOver={(event) => event.preventDefault()}>
                {orderedItems.map((item, index) => <div key={item.href} draggable onDragStart={(event) => { setDraggedHref(item.href); event.dataTransfer.setData('text/plain', item.href); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDraggedHref(null)} onDrop={(event) => dropNavigationItem(groupItems, item.href, event)} className={`flex items-center justify-between gap-3 rounded-lg border px-2 py-1.5 transition-colors ${draggedHref === item.href ? 'border-blue-300 bg-blue-50 opacity-60' : 'border-transparent hover:bg-slate-50'}`}>
                  <div className="flex min-w-0 items-center gap-2"><GripVertical className="h-4 w-4 flex-none cursor-grab text-slate-400 active:cursor-grabbing" /><span className="truncate text-xs font-medium text-slate-700">{item.label}</span></div>
                  <div className="flex flex-none gap-1">
                    <button type="button" onClick={() => moveNavigationItem(groupItems, item.href, -1)} disabled={index === 0} aria-label={`Move ${item.label} up`} className="rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-blue-600 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => moveNavigationItem(groupItems, item.href, 1)} disabled={index === orderedItems.length - 1} aria-label={`Move ${item.label} down`} className="rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-blue-600 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                  </div>
                </div>)}
              </div>
            </div>;
          })}
        </div>
      </section>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs leading-relaxed text-slate-500">Unsaved choices do not take effect until saved. Preferences stay in this browser; EHR and patient data are not copied to settings.</p>
        <button type="button" onClick={save} disabled={!dirty} className="flex-none rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Save Changes</button>
      </div>
    </div>
  );
}
