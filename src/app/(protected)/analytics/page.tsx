'use client';

import { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { BarChart3, Users, Activity, FlaskConical, DollarSign, Clock, TrendingUp, CalendarDays } from 'lucide-react';
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
  const [branch, setBranch] = useState('');

  const { data, isLoading } = useAnalytics({ dateFrom, dateTo, branch });
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
        <select
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Filter by branch"
          id="analytics-branch"
        >
          <option value="">All Branches</option>
          <option value="Main Branch">Main Branch</option>
          <option value="Branch 2">Branch 2</option>
        </select>
        <button
          type="button"
          onClick={() => { setDateFrom(''); setDateTo(''); setBranch(''); }}
          className="h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
          id="reset-filters-btn"
        >
          Reset
        </button>
      </div>

      {/* KPI cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : analytics ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          {[
            { label: 'Total Patients', value: analytics.kpis.totalPatients.toLocaleString(), icon: Users, color: 'text-blue-600' },
            { label: 'New Patients', value: analytics.kpis.newPatients.toLocaleString(), icon: TrendingUp, color: 'text-violet-600' },
            { label: 'Total Encounters', value: analytics.kpis.totalEncounters.toLocaleString(), icon: Activity, color: 'text-slate-600' },
            { label: 'Completed', value: analytics.kpis.completedEncounters.toLocaleString(), icon: CalendarDays, color: 'text-emerald-600' },
            { label: 'Lab Tests', value: analytics.kpis.labTests.toLocaleString(), icon: FlaskConical, color: 'text-orange-600' },
            { label: 'Avg Wait', value: `${analytics.kpis.avgWaitingMinutes}m`, icon: Clock, color: 'text-amber-600' },
            { label: 'Revenue', value: formatCurrency(analytics.kpis.revenue), icon: DollarSign, color: 'text-teal-600' },
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
          title="Patient Visits Over Time"
          subtitle="Daily visits and new registrations (last 30 days)"
          className="lg:col-span-2"
        >
          {isLoading || !analytics ? (
            <div className="h-48 bg-slate-50 animate-pulse rounded-lg" />
          ) : analytics.patientVisits.length === 0 ? (
            <EmptyState title="Not enough data" description="No patient visit data available for this period." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analytics.patientVisits} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="visits" stroke="#2563eb" strokeWidth={2} dot={false} name="Visits" />
                <Line type="monotone" dataKey="new_patients" stroke="#10b981" strokeWidth={2} dot={false} name="New Patients" strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Appointment Status Donut */}
        <ChartCard title="Appointment Status" subtitle="Distribution by outcome">
          {isLoading || !analytics ? (
            <div className="h-48 bg-slate-50 animate-pulse rounded-lg" />
          ) : analytics.appointmentStatus.length === 0 ? (
            <EmptyState title="Not enough data" description="No appointment data available." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={analytics.appointmentStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    dataKey="count"
                    nameKey="status"
                    paddingAngle={2}
                  >
                    {analytics.appointmentStatus.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {analytics.appointmentStatus.map((item, i) => (
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
        {/* Revenue */}
        <ChartCard title="Revenue Over Time" subtitle="Monthly collections (₱)" className="lg:col-span-2">
          {isLoading || !analytics ? (
            <div className="h-48 bg-slate-50 animate-pulse rounded-lg" />
          ) : analytics.revenue.length === 0 ? (
            <EmptyState title="Not enough data" description="No revenue data available." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.revenue} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  formatter={(v) => [formatCurrency(typeof v === 'number' ? v : 0), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} name="Revenue" />
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
