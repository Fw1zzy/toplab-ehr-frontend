'use client';

import { PageHeader } from '@/components/ui/PageHeader';

import { use } from 'react';

export default function CorporateRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title={`Corporate Request ${resolvedParams.id}`} 
        description="View request details and generate invoices."
        actions={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Generate Draft Invoice
          </button>
        }
      />
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-medium">Request Details</h2>
        <p className="mt-2 text-sm text-slate-500">
          This page will show request details, employees (M2M), services, and invoice links.
        </p>
      </div>
    </div>
  );
}
