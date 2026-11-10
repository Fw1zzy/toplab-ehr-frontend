export interface DashboardMetrics {
  totalPatients: number;
  todayEncounters: number;
  inProgressEncounters: number;
  completedEncounters: number;
  pendingLabResults: number;
  paidInvoiceValue: number;
}

export interface AnalyticsFilter {
  dateFrom?: string;
  dateTo?: string;
}

export interface EncountersByDate {
  date: string;
  encounters: number;
}

export interface DemographicsData {
  label: string;
  count: number;
  percentage: number;
}

export interface EncountersByService {
  service: string;
  count: number;
}

export interface LabTestsByCategory {
  category: string;
  count: number;
}

export interface EncounterStatusData {
  status: string;
  count: number;
}

export interface InvoiceStatusCount {
  status: string;
  count: number;
}

export interface AnalyticsData {
  kpis: {
    totalPatients: number;
    totalEncounters: number;
    completedEncounters: number;
    labTests: number;
    paidInvoiceValue: number;
    totalInvoices: number;
    paidInvoices: number;
    totalInvoiced: number;
    issuedUnpaidInvoiceValue: number;
  };
  encountersOverTime: EncountersByDate[];
  demographics: {
    byAge: DemographicsData[];
    bySex: DemographicsData[];
  };
  encountersByService: EncountersByService[];
  labTestsByCategory: LabTestsByCategory[];
  encounterStatus: EncounterStatusData[];
  invoiceStatus: InvoiceStatusCount[];
}
