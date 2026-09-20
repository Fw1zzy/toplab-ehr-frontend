'use client';

import { useState } from 'react';
import { Users, Plus, Download, Mail, Phone, Filter, UserCheck, UserX } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchInput } from '@/components/ui/SearchInput';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { cn } from '@/lib/utils';

// ─── Mock Data ───────────────────────────────────────────────────────────────
interface StaffMember {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  role: string;
  department: string;
  specialization?: string;
  email: string;
  contact_number: string;
  status: 'active' | 'inactive' | 'on_leave';
  hire_date: string;
  branch: string;
  license_number?: string;
}

const MOCK_STAFF: StaffMember[] = [
  { id: 'st1', employee_id: 'EMP-001', first_name: 'Dr. Maria', last_name: 'Santos', role: 'physician', department: 'General Medicine', specialization: 'Internal Medicine', email: 'msantos@toplab.com', contact_number: '09171234567', status: 'active', hire_date: '2019-03-15', branch: 'Main Branch', license_number: 'PRC-12345' },
  { id: 'st2', employee_id: 'EMP-002', first_name: 'Dr. Jose', last_name: 'Reyes', role: 'physician', department: 'Cardiology', specialization: 'Cardiology', email: 'jreyes@toplab.com', contact_number: '09182345678', status: 'active', hire_date: '2020-06-01', branch: 'Main Branch', license_number: 'PRC-23456' },
  { id: 'st3', employee_id: 'EMP-003', first_name: 'Ana', last_name: 'Cruz', role: 'nurse', department: 'General Medicine', email: 'acruz@toplab.com', contact_number: '09193456789', status: 'active', hire_date: '2021-01-10', branch: 'Main Branch' },
  { id: 'st4', employee_id: 'EMP-004', first_name: 'Mark', last_name: 'Dela Torre', role: 'medical_technologist', department: 'Laboratory', specialization: 'Clinical Chemistry', email: 'mdelatorre@toplab.com', contact_number: '09204567890', status: 'active', hire_date: '2018-08-20', branch: 'Main Branch', license_number: 'PRC-34567' },
  { id: 'st5', employee_id: 'EMP-005', first_name: 'Lisa', last_name: 'Gonzalez', role: 'receptionist', department: 'Front Desk', email: 'lgonzalez@toplab.com', contact_number: '09215678901', status: 'active', hire_date: '2022-03-14', branch: 'Main Branch' },
  { id: 'st6', employee_id: 'EMP-006', first_name: 'Dr. Rosa', last_name: 'Mendoza', role: 'physician', department: 'Radiology', specialization: 'Radiology', email: 'rmendoza@toplab.com', contact_number: '09226789012', status: 'on_leave', hire_date: '2017-11-05', branch: 'Main Branch', license_number: 'PRC-45678' },
  { id: 'st7', employee_id: 'EMP-007', first_name: 'Carlo', last_name: 'Villanueva', role: 'medical_technologist', department: 'Laboratory', specialization: 'Hematology', email: 'cvillanueva@toplab.com', contact_number: '09237890123', status: 'active', hire_date: '2020-09-01', branch: 'Branch B', license_number: 'PRC-56789' },
  { id: 'st8', employee_id: 'EMP-008', first_name: 'Grace', last_name: 'Tan', role: 'nurse', department: 'Emergency', email: 'gtan@toplab.com', contact_number: '09248901234', status: 'active', hire_date: '2019-07-22', branch: 'Branch B' },
  { id: 'st9', employee_id: 'EMP-009', first_name: 'Dr. Ramon', last_name: 'Aquino', role: 'physician', department: 'Endocrinology', specialization: 'Endocrinology', email: 'raquino@toplab.com', contact_number: '09259012345', status: 'active', hire_date: '2016-04-18', branch: 'Main Branch', license_number: 'PRC-67890' },
  { id: 'st10', employee_id: 'EMP-010', first_name: 'Patricia', last_name: 'Lim', role: 'accountant', department: 'Finance', email: 'plim@toplab.com', contact_number: '09260123456', status: 'active', hire_date: '2021-05-03', branch: 'Main Branch' },
  { id: 'st11', employee_id: 'EMP-011', first_name: 'Miguel', last_name: 'Ramos', role: 'phlebotomist', department: 'Laboratory', email: 'mramos@toplab.com', contact_number: '09271234567', status: 'inactive', hire_date: '2020-12-01', branch: 'Branch B' },
  { id: 'st12', employee_id: 'EMP-012', first_name: 'Dr. Elena', last_name: 'Bautista', role: 'physician', department: 'Pediatrics', specialization: 'Pediatrics', email: 'ebautista@toplab.com', contact_number: '09282345678', status: 'active', hire_date: '2023-01-16', branch: 'Main Branch', license_number: 'PRC-78901' },
];

const ROLE_TABS = [
  { id: 'all', label: 'All Staff' },
  { id: 'physician', label: 'Physicians' },
  { id: 'nurse', label: 'Nurses' },
  { id: 'medical_technologist', label: 'Med Technologists' },
  { id: 'receptionist', label: 'Receptionists' },
  { id: 'phlebotomist', label: 'Phlebotomists' },
];

const ROLE_LABELS: Record<string, string> = {
  physician: 'Physician',
  nurse: 'Nurse',
  medical_technologist: 'Med Technologist',
  receptionist: 'Receptionist',
  phlebotomist: 'Phlebotomist',
  accountant: 'Accountant',
};

const PAGE_SIZE = 10;

export default function StaffPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const filtered = MOCK_STAFF.filter((s) => {
    const fullName = `${s.first_name} ${s.last_name}`;
    const matchSearch =
      !search ||
      fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || s.role === roleFilter;
    const matchStatus = !statusFilter || s.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeCount = MOCK_STAFF.filter((s) => s.status === 'active').length;
  const onLeaveCount = MOCK_STAFF.filter((s) => s.status === 'on_leave').length;
  const physicianCount = MOCK_STAFF.filter((s) => s.role === 'physician').length;

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Staff"
        description={`${MOCK_STAFF.length} staff members`}
        actions={
          <>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              id="export-staff-btn"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              id="add-staff-btn"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Staff
            </button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Staff" value={MOCK_STAFF.length} icon={Users} iconColor="text-blue-600" subtitle="All employees" />
        <StatCard title="Active" value={activeCount} icon={UserCheck} iconColor="text-emerald-600" subtitle="Currently working" />
        <StatCard title="On Leave" value={onLeaveCount} icon={UserX} iconColor="text-amber-600" subtitle="On approved leave" />
        <StatCard title="Physicians" value={physicianCount} icon={Filter} iconColor="text-violet-600" subtitle="Licensed doctors" />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Role tabs */}
        <div className="border-b border-slate-100 overflow-x-auto">
          <nav className="flex">
            {ROLE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setRoleFilter(tab.id); setPage(1); }}
                id={`staff-role-${tab.id}`}
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-xs font-medium border-b-2 transition-colors',
                  roleFilter === tab.id
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
            placeholder="Search by name, ID, email..."
            className="w-72"
            id="staff-search"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            aria-label="Filter by status"
            id="staff-status-filter"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>

        {/* Table */}
        {paginated.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No staff found"
            description={search ? 'Try adjusting your search or filters.' : 'Add a staff member to get started.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" aria-label="Staff table">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500">Staff Member</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Employee ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Branch</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map((staff) => {
                    const fullName = `${staff.first_name} ${staff.last_name}`;
                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={fullName} size="sm" />
                            <div>
                              <p className="text-xs font-semibold text-slate-900">{fullName}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{staff.specialization ?? ROLE_LABELS[staff.role] ?? staff.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs font-mono text-slate-600">{staff.employee_id}</td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                            {ROLE_LABELS[staff.role] ?? staff.role}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">{staff.department}</td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {staff.contact_number}
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Mail className="h-3 w-3" />
                              {staff.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600">{staff.branch}</td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={staff.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} staff
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-7 px-3 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  id="staff-prev-page"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500 px-1">Page {page} of {Math.max(1, totalPages)}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="h-7 px-3 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  id="staff-next-page"
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
