'use client';

import { useState } from 'react';
import {
  FileBarChart,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  FlaskConical,
  CalendarDays,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { cn, formatCurrency } from '@/lib/utils';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MONTHLY_REVENUE = [
  { month: 'Apr', revenue: 184200, patients: 312 },
  { month: 'May', revenue: 210500, patients: 345 },
  { month: 'Jun', revenue: 196800, patients: 328 },
  { month: 'Jul', revenue: 235100, patients: 389 },
  { month: 'Aug', revenue: 248600, patients: 401 },
  { month: 'Sep', revenue: 261400, patients: 427 },
];

const TOP_SERVICES = [
  { name: 'Complete Blood Count', count: 412, revenue: 144200, pct: 100 },
  { name: 'Urinalysis', count: 388, revenue: 58200, pct: 94 },
  { name: 'Fasting Blood Sugar', count: 301, revenue: 54180, pct: 73 },
  { name: 'Lipid Profile', count: 248, revenue: 136400, pct: 60 },
  { name: 'General Consultation', count: 231, revenue: 138600, pct: 56 },
  { name: 'HbA1c', count: 198, revenue: 128700, pct: 48 },
  { name: 'Liver Function Test', count: 176, revenue: 140800, pct: 43 },
  { name: 'Annual Physical Exam', count: 142, revenue: 255600, pct: 34 },
];

const DEPARTMENT_STATS = [
  { department: 'Clinical Chemistry', tests: 824, revenue: 562800, growth: 12.4 },
  { department: 'Hematology', tests: 621, revenue: 217350, growth: 8.1 },
  { department: 'General Medicine', tests: 485, revenue: 291000, growth: 15.3 },
  { department: 'Radiology', tests: 203, revenue: 243600, growth: -2.1 },
  { department: 'Cardiology', tests: 178, revenue: 188610, growth: 22.7 },
  { department: 'Clinical Microscopy', tests: 388, revenue: 58200, growth: 5.9 },
];

const RECENT_REPORTS = [
  { id: 'r1', name: 'Monthly Revenue Report – August 2026', type: 'financial', generated: '2026-09-01', size: '1.2 MB' },
  { id: 'r2', name: 'Laboratory Utilization Report – Q3 2026', type: 'operational', generated: '2026-09-05', size: '850 KB' },
  { id: 'r3', name: 'Patient Volume Report – August 2026', type: 'clinical', generated: '2026-09-01', size: '640 KB' },
  { id: 'r4', name: 'Staff Performance Report – August 2026', type: 'hr', generated: '2026-09-02', size: '420 KB' },
  { id: 'r5', name: 'Inventory Consumption Report – August 2026', type: 'operational', generated: '2026-09-03', size: '310 KB' },
  { id: 'r6', name: 'Outstanding Receivables Report', type: 'financial', generated: '2026-09-10', size: '205 KB' },
];

const REPORT_TYPE_COLORS: Record<string, string> = {
  financial: 'bg-emerald-50 text-emerald-700',
  operational: 'bg-blue-50 text-blue-700',
  clinical: 'bg-violet-50 text-violet-700',
  hr: 'bg-amber-50 text-amber-700',
};

const PERIOD_TABS = [
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_quarter', label: 'This Quarter' },
  { id: 'this_year', label: 'This Year' },
];

export default function ReportsPage() {
  const [period, setPeriod] = useState('this_month');

  // KPIs based on selected period (mocked)
  const kpis = {
    this_month: { revenue: 261400, patients: 427, tests: 1891, revenueGrowth: 5.2, patientGrowth: 6.5 },
    last_month: { revenue: 248600, patients: 401, tests: 1740, revenueGrowth: 2.1, patientGrowth: 3.1 },
    this_quarter: { revenue: 745100, patients: 1217, tests: 5120, revenueGrowth: 10.8, patientGrowth: 8.9 },
    this_year: { revenue: 1336600, patients: 2202, tests: 9210, revenueGrowth: 18.4, patientGrowth: 14.2 },
  }[period] ?? { revenue: 261400, patients: 427, tests: 1891, revenueGrowth: 5.2, patientGrowth: 6.5 };

  const maxRevenue = Math.max(...MONTHLY_REVENUE.map((m) => m.revenue));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Analytics and performance overview"
        actions={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
            id="generate-report-btn"
          >
            <FileBarChart className="h-3.5 w-3.5" />
            Generate Report
          </button>
        }
      />

      {/* Period Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPeriod(tab.id)}
            id={`report-period-${tab.id}`}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              period === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={kpis.revenue}
          icon={DollarSign}
          iconColor="text-emerald-600"
          isCurrency
          trend={{ value: kpis.revenueGrowth, label: 'vs prev period', positive: kpis.revenueGrowth >= 0 }}
        />
        <StatCard
          title="Total Patients"
          value={kpis.patients}
          icon={Users}
          iconColor="text-blue-600"
          trend={{ value: kpis.patientGrowth, label: 'vs prev period', positive: kpis.patientGrowth >= 0 }}
        />
        <StatCard
          title="Tests Performed"
          value={kpis.tests}
          icon={FlaskConical}
          iconColor="text-violet-600"
          subtitle="Laboratory tests"
        />
        <StatCard
          title="Avg Revenue / Patient"
          value={Math.round(kpis.revenue / kpis.patients)}
          icon={BarChart3}
          iconColor="text-amber-600"
          isCurrency
          subtitle="Per visit"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Monthly Revenue Bar Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Monthly Revenue Trend</h2>
              <p className="text-xs text-slate-400 mt-0.5">Last 6 months</p>
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-3 h-44 mt-2">
            {MONTHLY_REVENUE.map((m) => {
              const heightPct = (m.revenue / maxRevenue) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="w-full flex flex-col items-center justify-end h-36">
                    <div
                      className="w-full rounded-t-md bg-blue-500 group-hover:bg-blue-600 transition-colors relative"
                      style={{ height: `${heightPct}%` }}
                      title={`${m.month}: ${formatCurrency(m.revenue)}`}
                    >
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-600 whitespace-nowrap">
                        {formatCurrency(m.revenue)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">{m.month}</span>
                  <span className="text-[10px] text-slate-300">{m.patients}px</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Top Services</h2>
            <span className="text-xs text-slate-400">By volume</span>
          </div>
          <ul className="space-y-3">
            {TOP_SERVICES.slice(0, 6).map((svc) => (
              <li key={svc.name} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 truncate max-w-[60%]">{svc.name}</span>
                  <span className="text-xs font-semibold text-slate-900 tabular-nums">{svc.count}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${svc.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Department Performance */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Department Performance</h2>
            <p className="text-xs text-slate-400 mt-0.5">Revenue and test volume by department</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Department performance table">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Department</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Tests</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Avg / Test</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {DEPARTMENT_STATS.map((dept) => (
                <tr key={dept.department} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="text-xs font-medium text-slate-900">{dept.department}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-xs text-slate-600 tabular-nums font-medium">
                    {dept.tests.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(dept.revenue)}
                  </td>
                  <td className="px-4 py-3.5 text-right text-xs text-slate-500 tabular-nums">
                    {formatCurrency(Math.round(dept.revenue / dept.tests))}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className={cn('flex items-center gap-1 text-xs font-medium', dept.growth >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                      {dept.growth >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {dept.growth >= 0 ? '+' : ''}{dept.growth}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recent Reports</h2>
            <p className="text-xs text-slate-400 mt-0.5">Previously generated reports</p>
          </div>
          <button type="button" className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1" id="view-all-reports-btn">
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <ul className="divide-y divide-slate-50">
          {RECENT_REPORTS.map((report) => (
            <li key={report.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 flex-shrink-0">
                  <FileBarChart className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-900">{report.name}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Generated {report.generated} · {report.size}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize', REPORT_TYPE_COLORS[report.type] ?? 'bg-slate-100 text-slate-600')}>
                  {report.type}
                </span>
                <button
                  type="button"
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  id={`download-report-${report.id}`}
                  aria-label={`Download ${report.name}`}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
