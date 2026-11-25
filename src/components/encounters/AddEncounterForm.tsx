'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Search, ChevronLeft, ChevronRight, ChevronsUpDown, Check } from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePatients } from '@/lib/queries/usePatients';
import { useCreateEncounter } from '@/lib/queries/useEncounters';
import { useCompanies } from '@/lib/queries/useCompanies';
import { api } from '@/lib/api';
import { Encounter, EncounterStatus } from '@/types';

interface AddEncounterFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ITEMS_PER_PAGE = 8;

export function AddEncounterForm(props: AddEncounterFormProps) {
  return props.open ? <EncounterForm {...props} /> : null;
}

function EncounterForm({ open, onOpenChange }: AddEncounterFormProps) {
  const { data: patientsData } = usePatients({ limit: 1000 });
  const patients = patientsData?.data;
  const { data: companiesData } = useCompanies();
  const companies = companiesData?.data ?? [];
  const { data: serviceCatalog = [] } = useQuery({
    queryKey: ['catalog-services'], queryFn: () => api.services.getAll(),
  });
  const availableServices = serviceCatalog.filter((service) => service.is_active)
    .map((service) => ({ id: service.id, name: service.name, price: service.price, department: service.department }));
  const { mutateAsync: createEncounter, isPending } = useCreateEncounter();

  const [encounterType, setEncounterType] = useState<'OPD' | 'PEME' | 'APE'>('OPD');
  const [patientId, setPatientId] = useState('');
  const [company, setCompany] = useState('');
  const [corporateRequest, setCorporateRequest] = useState('');
  const [status, setStatus] = useState<EncounterStatus>('in_progress');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { data: corporateRequestsData } = useQuery({
    queryKey: ['corporate-requests', company],
    queryFn: () => api.corporateRequests.getAll({ companyId: company, limit: 100 }),
    enabled: encounterType !== 'OPD' && !!company,
  });
  const corporateRequests = corporateRequestsData?.data ?? [];
  
  // Custom searchable patient dropdown state
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPatientDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPatients = useMemo(() => {
    const rows = patients ?? [];
    if (!patientSearch) return rows;
    const lower = patientSearch.toLowerCase();
    return rows.filter(p =>
      p.first_name.toLowerCase().includes(lower) || 
      p.last_name.toLowerCase().includes(lower)
    );
  }, [patients, patientSearch]);

  const selectedPatient = useMemo(() => {
    return patients?.find(p => p.id === patientId);
  }, [patients, patientId]);

  // Payment route is derived from encounterType
  const paymentRoute = encounterType === 'OPD' ? 'Personal Upfront' : 'Company Billed';

  // Services selection
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedServices, setSelectedServices] = useState<{id: string; name: string; price: number; department: string | null}[]>([]);
  const [servicePage, setServicePage] = useState(1);

  const filteredServices = useMemo(() => {
    return availableServices.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()));
  }, [availableServices, serviceSearch]);

  const totalPages = Math.ceil(filteredServices.length / ITEMS_PER_PAGE);
  
  const paginatedServices = useMemo(() => {
    const startIndex = (servicePage - 1) * ITEMS_PER_PAGE;
    return filteredServices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredServices, servicePage]);

  const toggleService = (service: {id: string; name: string; price: number; department: string | null}) => {
    setSelectedServices(prev => {
      if (prev.find(s => s.id === service.id)) {
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  const totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!patientId) {
      alert('Please select a patient.');
      return;
    }

    try {
      const payload: Partial<Encounter> = {
        encounter_type: encounterType,
        patient_id: patientId,
        company: encounterType !== 'OPD' ? company : null,
        corporate_request: encounterType !== 'OPD' ? corporateRequest : null,
        payment_route: paymentRoute,
        status,
        services_selected: selectedServices,
        encounter_date: new Date().toISOString(),
      };
      
      await createEncounter(payload);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create encounter', error);
      setSubmitError(error instanceof Error ? error.message : 'Unable to save encounter to the EHR.');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 z-40 transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-white shadow-2xl transition-transform duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:border-l sm:border-slate-200 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                Create Item in Encounter
              </Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500 mt-1">
                Fill in the details for this patient encounter.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </button>
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 bg-slate-50/30">
            <form id="add-encounter-form" onSubmit={handleSubmit} className="space-y-8">
              {submitError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{submitError}</p>}
              
              {/* Encounter Type */}
              <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Encounter Classification</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-medium text-slate-700">Encounter Type <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-3">
                      {(['OPD', 'PEME', 'APE'] as const).map(type => (
                        <label
                          key={type}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all ${
                            encounterType === type 
                              ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm' 
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="encounterType"
                            value={type}
                            checked={encounterType === type}
                            onChange={() => setEncounterType(type)}
                            className="sr-only"
                          />
                          <span className="text-sm font-medium">
                            {type === 'OPD' ? 'OPD (Outpatient)' : type === 'PEME' ? 'PEME (Newly Hired)' : 'APE (Annual Physical Exam)'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5 relative" ref={dropdownRef}>
                    <label className="text-xs font-medium text-slate-700">Patient <span className="text-red-500">*</span></label>
                    <button
                      type="button"
                      onClick={() => setIsPatientDropdownOpen(!isPatientDropdownOpen)}
                      className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-left"
                    >
                      <span className={selectedPatient ? '' : 'text-slate-400'}>
                        {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Search for a patient...'}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 text-slate-400 opacity-50" />
                    </button>

                    {isPatientDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden flex flex-col">
                        <div className="p-2 border-b border-slate-100">
                          <input
                            type="text"
                            placeholder="Type a name to search..."
                            value={patientSearch}
                            onChange={(e) => setPatientSearch(e.target.value)}
                            className="w-full h-8 px-2 text-sm bg-slate-50 border border-slate-200 rounded outline-none focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                            autoFocus
                          />
                        </div>
                        <ul className="max-h-60 overflow-y-auto p-1">
                          {filteredPatients.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-slate-500 text-center">No patient found.</li>
                          ) : (
                            filteredPatients.map(p => (
                              <li
                                key={p.id}
                                onClick={() => {
                                  setPatientId(p.id);
                                  setIsPatientDropdownOpen(false);
                                  setPatientSearch('');
                                }}
                                className={`flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer ${patientId === p.id ? 'bg-blue-50 text-blue-900 font-medium' : 'text-slate-700 hover:bg-slate-100'}`}
                              >
                                {p.first_name} {p.last_name}
                                {patientId === p.id && <Check className="h-4 w-4 text-blue-600" />}
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="status" className="text-xs font-medium text-slate-700">Status</label>
                    <select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as EncounterStatus)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  
                  {/* Payment Route (Read-only, derived from encounterType) */}
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-medium text-slate-700">Payment Route</label>
                    <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 font-medium cursor-not-allowed">
                      {paymentRoute}
                    </div>
                  </div>

                  {/* Corporate Specific Fields */}
                  {encounterType !== 'OPD' && (
                    <>
                      <div className="space-y-1.5">
                        <label htmlFor="company" className="text-xs font-medium text-slate-700">Company</label>
                        <select
                          id="company"
                          required={true}
                          value={company}
                          onChange={(e) => { setCompany(e.target.value); setCorporateRequest(''); }}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                          <option value="" disabled>Select an item...</option>
                          {companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="corporateRequest" className="text-xs font-medium text-slate-700">Corporate Request</label>
                        <select
                          id="corporateRequest"
                          required={true}
                          value={corporateRequest}
                          onChange={(e) => setCorporateRequest(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                          <option value="" disabled>Select an item...</option>
                          {corporateRequests.map((item) => (
                            <option key={item.id} value={item.id}>{item.company_code ?? item.request_type} ({item.status})</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Service Selection */}
              <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-semibold text-slate-900">Services</h3>
                  <div className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                    Total: ₱ {totalPrice.toFixed(2)}
                  </div>
                </div>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={serviceSearch}
                    onChange={(e) => { setServiceSearch(e.target.value); setServicePage(1); }}
                    placeholder="Search services..."
                    className="w-full h-9 pl-9 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                </div>

                <div className="border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col min-h-[300px]">
                  <div className="flex-1">
                    {paginatedServices.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">No services found.</div>
                    ) : (
                      <ul className="divide-y divide-slate-200">
                        {paginatedServices.map(service => {
                          const isSelected = selectedServices.some(s => s.id === service.id);
                          return (
                            <li 
                              key={service.id}
                              onClick={() => toggleService(service)}
                              className={`flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                            >
                              <div className="flex items-center gap-3">
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  readOnly
                                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                />
                                <span className={`text-sm ${isSelected ? 'font-medium text-blue-900' : 'text-slate-700'}`}>
                                  {service.name}
                                </span>
                              </div>
                              <span className="text-xs font-mono text-slate-500">
                                ₱ {service.price.toFixed(2)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 bg-white rounded-b-lg">
                      <span className="text-xs text-slate-500">
                        Page {servicePage} of {totalPages}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setServicePage(p => Math.max(1, p - 1))}
                          disabled={servicePage === 1}
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setServicePage(p => Math.min(totalPages, p + 1))}
                          disabled={servicePage === totalPages}
                          className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Services Tags */}
                {selectedServices.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-medium text-slate-500 mb-2">Selected ({selectedServices.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedServices.map(s => (
                        <div key={s.id} className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-md pl-2 pr-1 py-1 text-xs text-slate-700">
                          {s.name}
                          <button 
                            type="button" 
                            onClick={(e) => { e.stopPropagation(); toggleService(s); }}
                            className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

            </form>
          </div>

          <div className="border-t border-slate-100 p-6 bg-slate-50/80 flex items-center justify-end gap-3 rounded-b-xl">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200 shadow-sm"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="submit"
              form="add-encounter-form"
              disabled={isPending}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {isPending ? 'Saving...' : 'Save Encounter'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
