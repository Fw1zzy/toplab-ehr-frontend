'use client';

import { LucideIcon } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  isCurrency?: boolean;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-600',
  trend,
  isCurrency = false,
  className,
}: StatCardProps) {
  const displayValue = isCurrency
    ? formatCurrency(typeof value === 'number' ? value : parseFloat(String(value)))
    : typeof value === 'number'
    ? value.toLocaleString()
    : value;

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow',
        className,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50')}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{displayValue}</p>
      {(subtitle || trend) && (
        <div className="mt-1 flex items-center gap-1.5">
          {trend && (
            <span
              className={cn(
                'text-xs font-medium',
                trend.positive !== false ? 'text-emerald-600' : 'text-red-500',
              )}
            >
              {trend.positive !== false ? '+' : ''}
              {trend.value}%
            </span>
          )}
          <p className="text-xs text-slate-400">{trend?.label ?? subtitle}</p>
        </div>
      )}
    </div>
  );
}
