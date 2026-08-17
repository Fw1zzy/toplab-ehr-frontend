'use client';

import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  rows?: number;
}

export function LoadingSkeleton({ className, rows = 1 }: LoadingSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Loading...">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-slate-100 rounded-md animate-pulse" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-0" aria-busy="true" aria-label="Loading table...">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-slate-100">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className={cn(
                'h-4 bg-slate-100 rounded animate-pulse',
                j === 0 ? 'w-24' : j === cols - 1 ? 'w-16' : 'flex-1',
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-200 bg-white p-5 space-y-3 animate-pulse',
        className,
      )}
      aria-busy="true"
    >
      <div className="h-3 w-24 bg-slate-100 rounded" />
      <div className="h-7 w-32 bg-slate-200 rounded" />
      <div className="h-3 w-16 bg-slate-100 rounded" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3 w-24 bg-slate-100 rounded" />
        <div className="h-8 w-8 bg-slate-100 rounded-lg" />
      </div>
      <div className="h-8 w-20 bg-slate-200 rounded mb-1" />
      <div className="h-3 w-28 bg-slate-100 rounded" />
    </div>
  );
}
