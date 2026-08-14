export interface DashboardMetrics {
  totalPatients: number;
  todayAppointments: number;
  patientsWaiting: number;
  completedEncounters: number;
  pendingLabResults: number;
  todayRevenue: number;
}

export interface AnalyticsFilter {
  dateFrom: string;
  dateTo: string;
  branch?: string;
  service?: string;
  provider?: string;
  labCategory?: string;
}

export interface PatientVisitDataPoint {
  date: string;
  visits: number;
  new_patients: number;
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

export interface AppointmentStatusData {
  status: string;
  count: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  invoices: number;
}

export interface AnalyticsData {
  kpis: {
    totalPatients: number;
    newPatients: number;
    totalEncounters: number;
    completedEncounters: number;
    labTests: number;
    avgWaitingMinutes: number;
    revenue: number;
  };
  patientVisits: PatientVisitDataPoint[];
  demographics: {
    byAge: DemographicsData[];
    bySex: DemographicsData[];
  };
  encountersByService: EncountersByService[];
  labTestsByCategory: LabTestsByCategory[];
  appointmentStatus: AppointmentStatusData[];
  revenue: RevenueDataPoint[];
}
