'use client';

import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { BarChart3, Users, Activity, FlaskConical, DollarSign, Receipt, Wallet, CalendarDays } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAnalytics } from '@/lib/queries/useDashboard';
import { formatCurrency } from '@/lib/utils';

const CHART_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const PIE_COLORS = ['#2563eb', '#f59e0b', '#ef4444', '#94a3b8'];

function ChartCard({ title, subtitle, children, className = '' }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useAnalytics({ dateFrom, dateTo });
  const analytics = data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics Dashboard"
        description="Clinical and operational performance insights"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="date-from" className="text-xs text-slate-500">From</label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="date-to" className="text-xs text-slate-500">To</label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          />
        </div>
        <button
          type="button"
          onClick={() => { setDateFrom(''); setDateTo(''); }}
          className="h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
          id="reset-filters-btn"
        >
          Reset
        </button>
      </div>
      <p className="-mt-3 text-[11px] text-slate-400">Date range filters encounter and laboratory records. Invoice summaries include all invoices because the EHR invoice schema has no invoice-date field.</p>

      {/* KPI cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
          {[
            { label: 'Total Patients', value: analytics.kpis.totalPatients.toLocaleString(), icon: Users, color: 'text-blue-600' },
            { label: 'Total Encounters', value: analytics.kpis.totalEncounters.toLocaleString(), icon: Activity, color: 'text-slate-600' },
            { label: 'Completed', value: analytics.kpis.completedEncounters.toLocaleString(), icon: CalendarDays, color: 'text-emerald-600' },
            { label: 'Lab Tests', value: analytics.kpis.labTests.toLocaleString(), icon: FlaskConical, color: 'text-orange-600' },
            { label: 'Invoices', value: analytics.kpis.totalInvoices.toLocaleString(), icon: Receipt, color: 'text-indigo-600' },
            { label: 'Paid Invoice Value', value: formatCurrency(analytics.kpis.paidInvoiceValue), icon: DollarSign, color: 'text-teal-600' },
            { label: 'Issued / Unpaid Value', value: formatCurrency(analytics.kpis.issuedUnpaidInvoiceValue), icon: Wallet, color: 'text-amber-600' },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-medium text-slate-500 leading-tight">{kpi.label}</p>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-base font-bold text-slate-900 tabular-nums">{kpi.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Charts — Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Patient Visits Over Time (wide) */}
        <ChartCard
          title="Encounters Over Time"
          subtitle="Encounter counts by date"
          className="lg:col-span-2"
        >
          {isLoading || !analytics ? (
            <div className="h-48 bg-slate-50 animate-pulse rounded-lg" />
          ) : analytics.encountersOverTime.length === 0 ? (
            <EmptyState title="No encounter dates" description="No encounters fall within this date range." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analytics.encountersOverTime} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="encounters" stroke="#2563eb" strokeWidth={2} dot={false} name="Encounters" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Encounter status donut */}
        <ChartCard title="Encounter Status" subtitle="Counts by EHR encounter status">
          {isLoading || !analytics ? (
            <div className="h-48 bg-slate-50 animate-pulse rounded-lg" />
          ) : analytics.encounterStatus.length === 0 ? (
            <EmptyState title="No encounter status data" description="No encounters fall within this date range." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={analytics.encounterStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    dataKey="count"
                    nameKey="status"
                    paddingAngle={2}
                  >
                    {analytics.encounterStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {analytics.encounterStatus.map((item, i) => (
                  <div key={item.status} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[10px] text-slate-600 truncate">{item.status} ({item.count})</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* Charts — Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Encounters by Service */}
        <ChartCard title="Encounters by Service" subtitle="Volume per service category">
          {isLoading || !analytics ? (
            <div className="h-48 bg-slate-50 animate-pulse rounded-lg" />
          ) : analytics.encountersByService.length === 0 ? (
            <EmptyState title="Not enough data" description="No encounter data available." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.encountersByService} layout="vertical" margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="service" tick={{ fontSize: 10, fill: '#64748b' }} width={120} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} name="Encounters" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Lab Tests by Category */}
        <ChartCard title="Laboratory Tests by Category" subtitle="Volume per test category">
          {isLoading || !analytics ? (
            <div className="h-48 bg-slate-50 animate-pulse rounded-lg" />
          ) : analytics.labTestsByCategory.length === 0 ? (
            <EmptyState title="Not enough data" description="No laboratory data available." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.labTestsByCategory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Tests">
                  {analytics.labTestsByCategory.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Charts — Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Invoice Status */}
        <ChartCard title="Invoices by Status" subtitle="Counts from the current EHR invoice records" className="lg:col-span-2">
          {isLoading || !analytics ? (
            <div className="h-48 bg-slate-50 animate-pulse rounded-lg" />
          ) : analytics.invoiceStatus.length === 0 ? (
            <EmptyState title="No invoice status data" description="No invoice records were returned by the EHR." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.invoiceStatus} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="status" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Invoices" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Patient Demographics */}
        <ChartCard title="Patient Demographics" subtitle="Age distribution">
          {isLoading || !analytics ? (
            <div className="h-48 bg-slate-50 animate-pulse rounded-lg" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={analytics.demographics.byAge} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Patients" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-1.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">By Sex</p>
                {analytics.demographics.bySex.map((item, i) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                      <span className="text-xs text-slate-600">{item.label}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-700">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
