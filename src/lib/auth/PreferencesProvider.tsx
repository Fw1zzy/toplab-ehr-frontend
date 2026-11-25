'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export type LandingPage = '/dashboard' | '/patients' | '/encounters' | '/queue' | '/laboratory';
export type TableDensity = 'comfortable' | 'compact';
export type RowsPerPage = 10 | 25 | 50;
export type AccentColor = string;

export interface AppPreferences {
  defaultLanding: LandingPage;
  density: TableDensity;
  rowsPerPage: RowsPerPage;
  accentColor: AccentColor;
  navigationOrder: string[];
}

interface PreferencesContextValue {
  preferences: AppPreferences;
  savePreferences: (preferences: AppPreferences) => void;
}

const STORAGE_KEY = 'toplab.preferences.v1';
export const DEFAULT_PREFERENCES: AppPreferences = {
  defaultLanding: '/dashboard',
  density: 'comfortable',
  rowsPerPage: 10,
  accentColor: '#2563eb',
  navigationOrder: [
    '/dashboard', '/patients', '/appointments', '/encounters', '/laboratory',
    '/queue', '/lab-results', '/ai-clinical-tools',
    '/billing', '/billing/invoices',
    '/inventory', '/services', '/staff',
    '/companies', '/corporate-requests', '/questionnaire-responses',
    '/analytics', '/reports', '/settings',
  ],
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Partial<AppPreferences> | null;
      if (value) setPreferences({
        defaultLanding: ['/dashboard', '/patients', '/encounters', '/queue', '/laboratory'].includes(value.defaultLanding ?? '')
          ? value.defaultLanding as LandingPage : DEFAULT_PREFERENCES.defaultLanding,
        density: value.density === 'compact' ? 'compact' : 'comfortable',
        rowsPerPage: [10, 25, 50].includes(value.rowsPerPage ?? 10) ? value.rowsPerPage as RowsPerPage : DEFAULT_PREFERENCES.rowsPerPage,
        accentColor: /^#[0-9a-f]{6}$/i.test(value.accentColor ?? '') ? value.accentColor as string : DEFAULT_PREFERENCES.accentColor,
        navigationOrder: Array.isArray(value.navigationOrder)
          ? [...new Set([...value.navigationOrder.filter((href): href is string => typeof href === 'string' && DEFAULT_PREFERENCES.navigationOrder.includes(href)), ...DEFAULT_PREFERENCES.navigationOrder])]
          : DEFAULT_PREFERENCES.navigationOrder,
      });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.dataset.tableDensity = preferences.density;
    applyAccentColor(preferences.accentColor);
  }, [hydrated, preferences]);

  function savePreferences(next: AppPreferences) {
    const safe = {
      ...next,
      accentColor: /^#[0-9a-f]{6}$/i.test(next.accentColor) ? next.accentColor : DEFAULT_PREFERENCES.accentColor,
      navigationOrder: [...new Set([...next.navigationOrder.filter((href) => DEFAULT_PREFERENCES.navigationOrder.includes(href)), ...DEFAULT_PREFERENCES.navigationOrder])],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    setPreferences(safe);
  }

  return <PreferencesContext.Provider value={{ preferences, savePreferences }}>{children}</PreferencesContext.Provider>;
}

function applyAccentColor(hex: string) {
  const rgb = hex.match(/[0-9a-f]{2}/gi)?.map((component) => parseInt(component, 16));
  if (!rgb || rgb.length !== 3) return;
  const mix = (amount: number, toward: number) => `#${rgb.map((channel) => Math.round(channel * (1 - amount) + toward * amount).toString(16).padStart(2, '0')).join('')}`;
  const root = document.documentElement.style;
  root.setProperty('--color-blue-50', mix(0.96, 255));
  root.setProperty('--color-blue-100', mix(0.90, 255));
  root.setProperty('--color-blue-200', mix(0.78, 255));
  root.setProperty('--color-blue-300', mix(0.58, 255));
  root.setProperty('--color-blue-400', mix(0.32, 255));
  root.setProperty('--color-blue-500', mix(0.12, 255));
  root.setProperty('--color-blue-600', hex);
  root.setProperty('--color-blue-700', mix(0.16, 0));
  root.setProperty('--color-blue-800', mix(0.30, 0));
  root.setProperty('--color-blue-900', mix(0.45, 0));
  root.setProperty('--color-blue-950', mix(0.64, 0));
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}
