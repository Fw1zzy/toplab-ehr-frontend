'use client';

import { useState } from 'react';
import { Activity, Plus, Download, Search, DollarSign, Clock, Tag, Filter } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { cn, formatCurrency } from '@/lib/utils';

// ─── Mock Data ───────────────────────────────────────────────────────────────
interface Service {
  id: string;
  code: string;
  name: string;
  category: string;
  price: number;
  duration_minutes: number;
  status: 'active' | 'inactive';
  description: string;
  department: string;
}

const MOCK_SERVICES: Service[] = [
  { id: 's1', code: 'CBC-001', name: 'Complete Blood Count (CBC)', category: 'laboratory', price: 350, duration_minutes: 30, status: 'active', description: 'Measures components and features of blood cells.', department: 'Hematology' },
  { id: 's2', code: 'URI-002', name: 'Urinalysis', category: 'laboratory', price: 150, duration_minutes: 20, status: 'active', description: 'Tests the chemical content of urine.', department: 'Clinical Microscopy' },
  { id: 's3', code: 'LFT-003', name: 'Liver Function Test', category: 'laboratory', price: 800, duration_minutes: 45, status: 'active', description: 'Panel of blood tests to evaluate liver function.', department: 'Clinical Chemistry' },
  { id: 's4', code: 'KFT-004', name: 'Kidney Function Test', category: 'laboratory', price: 750, duration_minutes: 45, status: 'active', description: 'Evaluates kidney function through blood tests.', department: 'Clinical Chemistry' },
  { id: 's5', code: 'FBS-005', name: 'Fasting Blood Sugar', category: 'laboratory', price: 180, duration_minutes: 15, status: 'active', description: 'Measures blood glucose after fasting.', department: 'Clinical Chemistry' },
  { id: 's6', code: 'HBA-006', name: 'HbA1c', category: 'laboratory', price: 650, duration_minutes: 30, status: 'active', description: 'Measures average blood sugar over 3 months.', department: 'Clinical Chemistry' },
  { id: 's7', code: 'XRY-007', name: 'Chest X-Ray', category: 'radiology', price: 500, duration_minutes: 20, status: 'active', description: 'Imaging of the chest area for diagnostic purposes.', department: 'Radiology' },
  { id: 's8', code: 'ECG-008', name: 'Electrocardiogram (ECG)', category: 'cardiology', price: 450, duration_minutes: 30, status: 'active', description: 'Records the electrical activity of the heart.', department: 'Cardiology' },
  { id: 's9', code: 'CON-009', name: 'General Consultation', category: 'consultation', price: 600, duration_minutes: 30, status: 'active', description: 'General physician consultation visit.', department: 'General Medicine' },
  { id: 's10', code: 'PHY-010', name: 'Annual Physical Exam', category: 'consultation', price: 1800, duration_minutes: 60, status: 'active', description: 'Comprehensive annual health check-up.', department: 'General Medicine' },
  { id: 's11', code: 'THYR-011', name: 'Thyroid Function Test', category: 'laboratory', price: 900, duration_minutes: 45, status: 'active', description: 'Evaluates thyroid gland function through blood tests.', department: 'Endocrinology' },
  { id: 's12', code: 'ECHO-012', name: 'Echocardiogram', category: 'cardiology', price: 3500, duration_minutes: 60, status: 'inactive', description: 'Ultrasound imaging of the heart.', department: 'Cardiology' },
  { id: 's13', code: 'ULTRA-013', name: 'Abdominal Ultrasound', category: 'radiology', price: 1200, duration_minutes: 40, status: 'active', description: 'Ultrasound imaging of abdominal organs.', department: 'Radiology' },
  { id: 's14', code: 'LIPID-014', name: 'Lipid Profile', category: 'laboratory', price: 550, duration_minutes: 30, status: 'active', description: 'Measures cholesterol and triglyceride levels.', department: 'Clinical Chemistry' },
  { id: 's15', code: 'VACC-015', name: 'Flu Vaccination', category: 'preventive', price: 800, duration_minutes: 15, status: 'active', description: 'Annual influenza vaccine administration.', department: 'Preventive Medicine' },
];

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'laboratory', label: 'Laboratory' },
  { id: 'radiology', label: 'Radiology' },
  { id: 'consultation', label: 'Consultation' },
  { id: 'cardiology', label: 'Cardiology' },
  { id: 'preventive', label: 'Preventive' },
];

const PAGE_SIZE = 10;

export default function ServicesPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const filtered = MOCK_SERVICES.filter((s) => {
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === 'all' || s.category === category;
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeCount = MOCK_SERVICES.filter((s) => s.status === 'active').length;
  const avgPrice = MOCK_SERVICES.reduce((sum, s) => sum + s.price, 0) / MOCK_SERVICES.length;
  const categories = new Set(MOCK_SERVICES.map((s) => s.category)).size;

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Services"
        description={`${MOCK_SERVICES.length} services in the catalog`}
        actions={
          <>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              id="export-services-btn"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              id="add-service-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Service
            </button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Services" value={MOCK_SERVICES.length} icon={Activity} iconColor="text-blue-600" subtitle="In catalog" />
        <StatCard title="Active Services" value={activeCount} icon={Tag} iconColor="text-emerald-600" subtitle="Currently offered" />
        <StatCard title="Avg. Price" value={avgPrice} icon={DollarSign} iconColor="text-violet-600" isCurrency subtitle="Across all services" />
        <StatCard title="Categories" value={categories} icon={Filter} iconColor="text-amber-600" subtitle="Service categories" />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Category Tabs */}
        <div className="border-b border-slate-100 overflow-x-auto">
          <nav className="flex">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setCategory(tab.id); setPage(1); }}
                id={`svc-cat-${tab.id}`}
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-xs font-medium border-b-2 transition-colors',
                  category === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700',
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-100">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Search by name, code, department..."
            className="w-72"
            id="service-search"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            aria-label="Filter by status"
            id="service-status-filter"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Table */}
        {paginated.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No services found"
            description={search ? 'Try adjusting your search or filters.' : 'Add a service to get started.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Services table">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Code</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Department</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Price</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Duration</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map((svc) => (
                    <tr key={svc.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer">
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-semibold text-slate-900">{svc.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate">{svc.description}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-600">{svc.code}</td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                          {svc.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{svc.department}</td>
                      <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(svc.price)}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {svc.duration_minutes} min
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={svc.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} services
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 px-3 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  id="svc-prev-page"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500 px-1">Page {page} of {Math.max(1, totalPages)}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-7 px-3 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  id="svc-next-page"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
