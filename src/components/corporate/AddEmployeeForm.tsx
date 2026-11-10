'use client';

import { useState, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { usePatients } from '@/lib/queries/usePatients';
import { useCompanies } from '@/lib/queries/useCompanies';

interface AddEmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEmployeeForm({ open, onOpenChange }: AddEmployeeFormProps) {
  const queryClient = useQueryClient();
  const [corporateRequestId, setCorporateRequestId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState('');
  const [civilStatus, setCivilStatus] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['corporate-requests', 'employee-form'],
    queryFn: () => api.corporateRequests.getAll({ page: 1, limit: 100 }),
    enabled: open,
  });
  const { data: patientsData, isLoading: patientsLoading } = usePatients({ limit: 100 });
  const { data: companiesData } = useCompanies();
  const requests = requestsData?.data ?? [];
  const patients = patientsData?.data ?? [];
  const companies = new Map((companiesData?.data ?? []).map((company) => [company.id, company.name]));

  const createEmployee = useMutation({
    mutationFn: () => api.staff.create({
      corporate_request_id: corporateRequestId,
      patient_id: patientId || null,
      first_name: firstName.trim(),
      middle_name: middleName.trim() || null,
      last_name: lastName.trim(),
      sex: sex.trim() || null,
      civil_status: civilStatus.trim() || null,
      mobile_number: mobileNumber.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
      date_of_birth: dateOfBirth || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ehr-employees'] });
      setCorporateRequestId('');
      setPatientId('');
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setSex('');
      setCivilStatus('');
      setMobileNumber('');
      setEmail('');
      setAddress('');
      setDateOfBirth('');
      setError(null);
      onOpenChange(false);
    },
    onError: (cause) => {
      const message = cause instanceof Error ? cause.message : 'Unable to save employee to the EHR.';
      setError(/permission|forbidden|403/i.test(message)
        ? 'The EHR denied employee creation. The signed-in role needs create permission on the employee collection.'
        : message);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    createEmployee.mutate();
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50 transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:border-l sm:border-slate-200">
          <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div><Dialog.Title className="text-lg font-semibold text-slate-900">Add Employee</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">Employee records in the EHR must be linked to a corporate request.</Dialog.Description></div>
            <Dialog.Close asChild><button type="button" aria-label="Close" className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"><X className="h-5 w-5" /></button></Dialog.Close>
          </header>
          <form id="add-employee-form" onSubmit={submit} className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            <section>
              <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900">EHR Relationships</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5 text-xs font-medium text-slate-700 sm:col-span-2">Corporate Request <span className="text-red-500">*</span>
                  <select required value={corporateRequestId} onChange={(event) => setCorporateRequestId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    <option value="">{requestsLoading ? 'Loading requests...' : 'Select a corporate request'}</option>
                    {requests.map((request) => {
                      const companyId = typeof request.company === 'string' ? request.company : request.company.id;
                      const company = companies.get(companyId) ?? 'Company';
                      return <option key={request.id} value={request.id}>{company} · {request.company_code ?? request.request_type}</option>;
                    })}
                  </select>
                  {!requestsLoading && requests.length === 0 && <span className="block text-[11px] text-slate-400">Create a corporate request before adding its employees.</span>}
                </label>
                <label className="block space-y-1.5 text-xs font-medium text-slate-700 sm:col-span-2">Linked Patient <span className="font-normal text-slate-400">Optional</span>
                  <select value={patientId} onChange={(event) => setPatientId(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    <option value="">{patientsLoading ? 'Loading patients...' : 'No linked patient'}</option>
                    {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}</option>)}
                  </select>
                </label>
              </div>
            </section>
            <section>
              <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900">Employee Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First Name" required value={firstName} onChange={setFirstName} />
                <Field label="Middle Name" value={middleName} onChange={setMiddleName} />
                <Field label="Last Name" required value={lastName} onChange={setLastName} />
                <Field label="Date of Birth" type="date" value={dateOfBirth} onChange={setDateOfBirth} />
                <Field label="Sex" value={sex} onChange={setSex} placeholder="As recorded in the EHR" />
                <Field label="Civil Status" value={civilStatus} onChange={setCivilStatus} placeholder="As recorded in the EHR" />
                <Field label="Email" type="email" value={email} onChange={setEmail} />
                <Field label="Mobile Number" type="tel" value={mobileNumber} onChange={setMobileNumber} />
                <Field label="Address" value={address} onChange={setAddress} className="sm:col-span-2" />
              </div>
            </section>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          </form>
          <footer className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6">
            <Dialog.Close asChild><button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button></Dialog.Close>
            <button type="submit" form="add-employee-form" disabled={createEmployee.isPending || requestsLoading || requests.length === 0} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{createEmployee.isPending ? 'Saving...' : 'Save Employee'}</button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, value, onChange, required = false, type = 'text', placeholder = '', className = '' }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return <label className={`block space-y-1.5 text-xs font-medium text-slate-700 ${className}`}>{label}{required && <span className="ml-1 text-red-500">*</span>}
    <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
  </label>;
}
