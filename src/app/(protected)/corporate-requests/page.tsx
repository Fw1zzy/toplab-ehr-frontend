'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClipboardCheck, Plus } from 'lucide-react';

export default function CorporateRequestsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader 
        title="Corporate Requests" 
        description="Manage PEME and APE workflows."
        actions={
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Request
          </button>
        }
      />
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <EmptyState
          icon={ClipboardCheck}
          title="No corporate requests found"
          description="Create a new corporate request to manage PEME and APE workflows."
        />
      </div>
    </div>
  );
}
