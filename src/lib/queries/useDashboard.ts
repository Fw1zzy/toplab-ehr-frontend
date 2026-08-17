import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AnalyticsFilter } from '@/types';

export const dashboardKeys = {
  metrics: ['dashboard', 'metrics'] as const,
  appointments: ['dashboard', 'appointments'] as const,
  queue: ['dashboard', 'queue'] as const,
  recentLabs: ['dashboard', 'recentLabs'] as const,
};

export function useDashboardMetrics() {
  return useQuery({
    queryKey: dashboardKeys.metrics,
    queryFn: () => api.dashboard.getMetrics(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // auto-refresh every 5 minutes
  });
}

export function useTodayAppointments() {
  return useQuery({
    queryKey: dashboardKeys.appointments,
    queryFn: () => api.dashboard.getTodayAppointments(),
    staleTime: 60_000,
  });
}

export function usePatientQueue() {
  return useQuery({
    queryKey: dashboardKeys.queue,
    queryFn: () => api.dashboard.getQueue(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useRecentLabResults() {
  return useQuery({
    queryKey: dashboardKeys.recentLabs,
    queryFn: () => api.dashboard.getRecentLabResults(),
    staleTime: 60_000,
  });
}

export const analyticsKeys = {
  all: ['analytics'] as const,
  data: (filter: AnalyticsFilter) => [...analyticsKeys.all, filter] as const,
};

export function useAnalytics(filter?: AnalyticsFilter) {
  return useQuery({
    queryKey: analyticsKeys.data(filter ?? { dateFrom: '', dateTo: '' }),
    queryFn: () => api.analytics.getData(filter),
    staleTime: 5 * 60_000,
  });
}
