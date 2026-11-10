import {
  likhaAnalytics,
  likhaAuth,
  likhaCompanies,
  likhaCorporateRequests,
  likhaDashboard,
  likhaEncounters,
  likhaInventory,
  likhaInterclinic,
  likhaInvoices,
  likhaLabResults,
  likhaPatients,
  likhaServices,
  likhaStaff,
} from './likha';

export const api = {
  auth: likhaAuth,
  patients: likhaPatients,
  encounters: likhaEncounters,
  labResults: likhaLabResults,
  invoices: likhaInvoices,
  inventory: likhaInventory,
  interclinic: likhaInterclinic,
  dashboard: likhaDashboard,
  analytics: likhaAnalytics,
  services: likhaServices,
  companies: likhaCompanies,
  corporateRequests: likhaCorporateRequests,
  staff: likhaStaff,
};

export type Api = typeof api;
