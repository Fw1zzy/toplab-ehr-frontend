import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { differenceInYears, format, formatDistanceToNow } from 'date-fns';
import { Patient } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPatientFullName(patient: Patient): string {
  const parts = [
    patient.first_name,
    patient.middle_name ? `${patient.middle_name.charAt(0)}.` : null,
    patient.last_name,
    patient.suffix,
  ].filter(Boolean);
  return parts.join(' ');
}

export function getPatientAge(dateOfBirth: string): number {
  return differenceInYears(new Date(), new Date(dateOfBirth));
}

export function formatDate(date: string | null | undefined, fmt = 'MMM d, yyyy'): string {
  if (!date) return '—';
  try {
    return format(new Date(date), fmt);
  } catch {
    return '—';
  }
}

export function formatDateTime(date: string | null | undefined): string {
  return formatDate(date, 'MMM d, yyyy h:mm a');
}

export function formatRelativeTime(date: string | null | undefined): string {
  if (!date) return '—';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '—';
  }
}

export function formatCurrency(amount: number, currency = '₱'): string {
  return `${currency}${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatWaitingTime(since: string | null): string {
  if (!since) return '—';
  try {
    const minutes = Math.floor((Date.now() - new Date(since).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  } catch {
    return '—';
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
