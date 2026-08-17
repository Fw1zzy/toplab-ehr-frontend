/**
 * API Facade
 * Switches between mock and Likha ERP adapters based on NEXT_PUBLIC_DATA_SOURCE.
 * To connect to a real Likha ERP instance, set NEXT_PUBLIC_DATA_SOURCE=likha
 * and provide NEXT_PUBLIC_LIKHA_URL in your .env.local.
 */

import * as mock from './mock';

const dataSource = process.env.NEXT_PUBLIC_DATA_SOURCE ?? 'mock';

function getLikhaAdapter() {
  // Dynamic import to avoid loading Likha client when using mock
  return import('./likha').then((m) => m);
}

// For now, always return mock. When Likha ERP is configured, this will
// transparently switch to the real SDK without touching any UI code.
const adapter = (() => {
  if (dataSource === 'likha') {
    // TODO: Return getLikhaAdapter() once Likha ERP credentials are configured
    console.warn('[Toplab] NEXT_PUBLIC_DATA_SOURCE=likha but Likha adapter is not yet configured. Falling back to mock.');
  }
  return mock;
})();

export const api = {
  auth: adapter.mockAuth,
  patients: adapter.mockPatients,
  encounters: adapter.mockEncounters,
  labResults: adapter.mockLabResults,
  invoices: adapter.mockInvoices,
  inventory: adapter.mockInventory,
  dashboard: adapter.mockDashboard,
  analytics: adapter.mockAnalytics,
  services: adapter.mockServices,
};

export type Api = typeof api;
