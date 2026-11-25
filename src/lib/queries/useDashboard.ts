import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { AnalyticsFilter } from '@/types';
import { useAuth } from '@/lib/auth/AuthProvider';

export const dashboardKeys = {
  metrics: ['dashboard', 'metrics'] as const,
  encounters: ['dashboard', 'encounters'] as const,
  queue: ['dashboard', 'queue'] as const,
  recentLabs: ['dashboard', 'recentLabs'] as const,
};

export function useDashboardMetrics() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...dashboardKeys.metrics, user?.id],
    queryFn: ({ signal }) => api.dashboard.getMetrics(signal),
    enabled: !!user,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // auto-refresh every 5 minutes
  });
}

export function useTodayEncounters() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...dashboardKeys.encounters, user?.id],
    queryFn: ({ signal }) => api.dashboard.getTodayEncounters(signal),
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function usePatientQueue() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...dashboardKeys.queue, user?.id],
    queryFn: ({ signal }) => api.dashboard.getQueue(signal),
    enabled: !!user,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useRecentLabResults() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...dashboardKeys.recentLabs, user?.id],
    queryFn: ({ signal }) => api.dashboard.getRecentLabResults(signal),
    enabled: !!user,
    staleTime: 60_000,
  });
}

export const analyticsKeys = {
  all: ['analytics'] as const,
  data: (filter: AnalyticsFilter) => [...analyticsKeys.all, filter] as const,
};

export function useAnalytics(filter?: AnalyticsFilter) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...analyticsKeys.data(filter ?? { dateFrom: '', dateTo: '' }), user?.id],
    queryFn: () => api.analytics.getData(filter),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
}
