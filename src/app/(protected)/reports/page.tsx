'use client';

import { useQuery } from '@tanstack/react-query';
import { FileBarChart, Users, ClipboardList, FlaskConical, CheckCircle2, Receipt, CircleDollarSign, Wallet, ChartNoAxesColumnIncreasing } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api';

export default function ReportsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ehr-analytics'], queryFn: () => api.analytics.getData(),
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Summary metrics calculated from the connected EHR records" />
      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Unable to load report metrics from the EHR.</p> : isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}</div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <StatCard title="Patients" value={data.kpis.totalPatients} icon={Users} iconColor="text-blue-600" />
          <StatCard title="Encounters" value={data.kpis.totalEncounters} icon={ClipboardList} iconColor="text-violet-600" />
          <StatCard title="Completed Encounters" value={data.kpis.completedEncounters} icon={CheckCircle2} iconColor="text-emerald-600" />
          <StatCard title="Lab Results" value={data.kpis.labTests} icon={FlaskConical} iconColor="text-amber-600" />
          <StatCard title="Invoices" value={data.kpis.totalInvoices} icon={Receipt} iconColor="text-blue-600" />
          <StatCard title="Paid Invoice Value" value={data.kpis.paidInvoiceValue} icon={CircleDollarSign} iconColor="text-emerald-600" isCurrency />
          <StatCard title="Issued / Unpaid Invoice Value" value={data.kpis.issuedUnpaidInvoiceValue} icon={Wallet} iconColor="text-amber-600" isCurrency />
          <StatCard title="Total Invoiced" value={data.kpis.totalInvoiced} icon={ChartNoAxesColumnIncreasing} iconColor="text-violet-600" isCurrency />
        </div>
      ) : <EmptyState icon={FileBarChart} title="No report data" description="The EHR returned no analytics data." />}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Data availability</h2>
        <p className="mt-1 text-sm text-slate-500">Invoice amounts and statuses come from the EHR. Paid invoice value sums invoices marked paid; issued/unpaid value sums invoices in those statuses. The CMS has no payment transaction ledger or saved report snapshots, so these are invoice-status summaries, not a payment receipt reconciliation.</p>
      </div>
    </div>
  );
}
