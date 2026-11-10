'use client';

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  in_progress: { label: 'In Progress', className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
  completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  unknown: { label: 'Unknown', className: 'bg-slate-50 text-slate-500 ring-slate-500/20' },
  // Laboratory result statuses
  for_encoding: { label: 'In Progress', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  with_results: { label: 'With Results', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  // Invoice and corporate request statuses
  draft: { label: 'Draft', className: 'bg-slate-50 text-slate-600 ring-slate-500/20' },
  issued: { label: 'Issued', className: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  unpaid: { label: 'Unpaid', className: 'bg-red-50 text-red-600 ring-red-500/20' },
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  inactive: { label: 'Inactive', className: 'bg-slate-50 text-slate-600 ring-slate-500/20' },
  suspended: { label: 'Suspended', className: 'bg-red-50 text-red-600 ring-red-500/20' },
  invited: { label: 'Invited', className: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  query: { label: 'Query', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  // Service catalog statuses
  available: { label: 'Available', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  unavailable: { label: 'Not Available', className: 'bg-slate-50 text-slate-600 ring-slate-500/20' },
  // Inventory statuses
  in_stock: { label: 'In Stock', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  low_stock: { label: 'Low Stock', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  out_of_stock: { label: 'Out of Stock', className: 'bg-red-50 text-red-600 ring-red-500/20' },
  expired: { label: 'Expired', className: 'bg-slate-100 text-slate-600 ring-slate-600/20' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status.replace(/_/g, ' '),
    className: 'bg-slate-50 text-slate-600 ring-slate-500/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
