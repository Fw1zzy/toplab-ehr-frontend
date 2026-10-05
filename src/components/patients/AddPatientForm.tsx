'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCreatePatient, useUpdatePatient } from '@/lib/queries/usePatients';
import { useCompanies } from '@/lib/queries/useCompanies';
import { Patient } from '@/types';

interface AddPatientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient;
}

export function AddPatientForm({ open, onOpenChange, patient }: AddPatientFormProps) {
  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    dateOfBirth: '',
    sex: '',
    civilStatus: '',
    address: '',
    mobileNumber: '',
    email: '',
    company: '',
    validIdPresented: '',
    validIdNumber: '',
    status: 'active',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactNumber: '',
    bloodType: '',
    nationality: '',
    religion: '',
  });

  useEffect(() => {
    if (open) {
      if (patient) {
        setFormData({
          firstName: patient.first_name ?? '',
          middleName: patient.middle_name ?? '',
          lastName: patient.last_name ?? '',
          suffix: patient.suffix ?? '',
          dateOfBirth: patient.date_of_birth ?? '',
          sex: patient.sex ?? '',
          civilStatus: patient.civil_status ?? '',
          address: patient.address ?? '',
          mobileNumber: patient.contact_number ?? '',
          email: patient.email ?? '',
          company: '',
          validIdPresented: '',
          validIdNumber: '',
          status: patient.status ?? 'active',
          emergencyContactName: patient.emergency_contact_name ?? '',
          emergencyContactRelationship: patient.emergency_contact_relationship ?? '',
          emergencyContactNumber: patient.emergency_contact_number ?? '',
          bloodType: patient.blood_type ?? '',
          nationality: patient.nationality ?? '',
          religion: patient.religion ?? '',
        });
      } else {
        // Reset form for new patient
        setFormData({
          firstName: '',
          middleName: '',
          lastName: '',
          suffix: '',
          dateOfBirth: '',
          sex: '',
          civilStatus: '',
          address: '',
          mobileNumber: '',
          email: '',
          company: '',
          validIdPresented: '',
          validIdNumber: '',
          status: 'active',
          emergencyContactName: '',
          emergencyContactRelationship: '',
          emergencyContactNumber: '',
          bloodType: '',
          nationality: '',
          religion: '',
        });
      }
    }
  }, [open, patient]);

  const { mutateAsync: createPatient, isPending: isCreating } = useCreatePatient();
  const { mutateAsync: updatePatient, isPending: isUpdating } = useUpdatePatient();
  const isPending = isCreating || isUpdating;

  const { data: companiesData } = useCompanies();
  const companiesList = companiesData?.data ?? [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        first_name: formData.firstName,
        middle_name: formData.middleName || null,
        last_name: formData.lastName,
        suffix: formData.suffix || null,
        date_of_birth: formData.dateOfBirth,
        sex: formData.sex.toLowerCase() as any,
        civil_status: formData.civilStatus.toLowerCase() as any,
        address: formData.address || null,
        contact_number: formData.mobileNumber,
        email: formData.email || null,
        status: formData.status as any,
        emergency_contact_name: formData.emergencyContactName || null,
        emergency_contact_relationship: formData.emergencyContactRelationship || null,
        emergency_contact_number: formData.emergencyContactNumber || null,
        blood_type: formData.bloodType || null,
        nationality: formData.nationality || null,
        religion: formData.religion || null,
      };

      if (patient) {
        await updatePatient({ id: patient.id, data: payload });
      } else {
        await createPatient(payload);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save patient', error);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/50 z-40 transition-opacity data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white shadow-2xl transition-transform duration-300 ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:border-l sm:border-slate-200 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-slate-900">
                {patient ? 'Edit Patient' : 'Add New Patient'}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500 mt-1">
                {patient ? 'Update the patient\'s information.' : 'Enter the patient\'s personal and contact information.'}
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

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <form id="add-patient-form" onSubmit={handleSubmit} className="space-y-8">
              
              {/* Personal Details Section */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Personal Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="firstName" className="text-xs font-medium text-slate-700">First Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                      placeholder="e.g. Juan"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label htmlFor="middleName" className="text-xs font-medium text-slate-700">Middle Name</label>
                    <input
                      type="text"
                      id="middleName"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                      placeholder="e.g. Dela"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="lastName" className="text-xs font-medium text-slate-700">Last Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                      placeholder="e.g. Cruz"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="suffix" className="text-xs font-medium text-slate-700">Suffix</label>
                    <select
                      id="suffix"
                      name="suffix"
                      value={formData.suffix}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="">None</option>
                      <option value="Jr.">Jr.</option>
                      <option value="Sr.">Sr.</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="dateOfBirth" className="text-xs font-medium text-slate-700">Date of Birth <span className="text-red-500">*</span></label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      required
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="sex" className="text-xs font-medium text-slate-700">Sex <span className="text-red-500">*</span></label>
                    <select
                      id="sex"
                      name="sex"
                      required
                      value={formData.sex}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="" disabled>Select sex</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="civilStatus" className="text-xs font-medium text-slate-700">Civil Status <span className="text-red-500">*</span></label>
                    <select
                      id="civilStatus"
                      name="civilStatus"
                      required
                      value={formData.civilStatus}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="" disabled>Select status</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="widow/widower">Widow/Widower</option>
                      <option value="separated">Separated</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="nationality" className="text-xs font-medium text-slate-700">Nationality</label>
                    <input
                      type="text"
                      id="nationality"
                      name="nationality"
                      value={formData.nationality}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                      placeholder="e.g. Filipino"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="religion" className="text-xs font-medium text-slate-700">Religion</label>
                    <input
                      type="text"
                      id="religion"
                      name="religion"
                      value={formData.religion}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                      placeholder="e.g. Catholic"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label htmlFor="bloodType" className="text-xs font-medium text-slate-700">Blood Type</label>
                    <select
                      id="bloodType"
                      name="bloodType"
                      value={formData.bloodType}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="">Unknown</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Contact Information */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <label htmlFor="address" className="text-xs font-medium text-slate-700">Address</label>
                    <textarea
                      id="address"
                      name="address"
                      rows={2}
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none placeholder:text-slate-400"
                      placeholder="Full residential address"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="mobileNumber" className="text-xs font-medium text-slate-700">Mobile Number <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      id="mobileNumber"
                      name="mobileNumber"
                      required
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                      placeholder="+63"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-medium text-slate-700">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                      placeholder="examplemail@gmail.com"
                    />
                  </div>
                </div>
              </section>

              {/* Emergency Contact */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="emergencyContactName" className="text-xs font-medium text-slate-700">Contact Name</label>
                    <input
                      type="text"
                      id="emergencyContactName"
                      name="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                      placeholder="e.g. Maria Cruz"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label htmlFor="emergencyContactRelationship" className="text-xs font-medium text-slate-700">Relationship</label>
                    <input
                      type="text"
                      id="emergencyContactRelationship"
                      name="emergencyContactRelationship"
                      value={formData.emergencyContactRelationship}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                      placeholder="e.g. Spouse"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="emergencyContactNumber" className="text-xs font-medium text-slate-700">Contact Number</label>
                    <input
                      type="tel"
                      id="emergencyContactNumber"
                      name="emergencyContactNumber"
                      value={formData.emergencyContactNumber}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                      placeholder="+63"
                    />
                  </div>
                </div>
              </section>

              {/* Other Details */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Other Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="company" className="text-xs font-medium text-slate-700">Company</label>
                    <select
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="" disabled>Select an item...</option>
                      {companiesList.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label htmlFor="status" className="text-xs font-medium text-slate-700">Status <span className="text-red-500">*</span></label>
                    <select
                      id="status"
                      name="status"
                      required
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="deceased">Deceased</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="validIdPresented" className="text-xs font-medium text-slate-700">Valid ID Presented</label>
                    <select
                      id="validIdPresented"
                      name="validIdPresented"
                      value={formData.validIdPresented}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    >
                      <option value="" disabled>Select ID type</option>
                      <option value="Passport">Passport</option>
                      <option value="Driver's License">Driver's License</option>
                      <option value="National ID">National ID</option>
                      <option value="SSS/GSIS">SSS / GSIS</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="validIdNumber" className="text-xs font-medium text-slate-700">Valid ID Number</label>
                    <input
                      type="text"
                      id="validIdNumber"
                      name="validIdNumber"
                      value={formData.validIdNumber}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                      placeholder="ID Number"
                    />
                  </div>
                </div>
              </section>

            </form>
          </div>

          <div className="border-t border-slate-100 p-6 bg-slate-50/50 flex items-center justify-end gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="submit"
              form="add-patient-form"
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {isPending ? 'Saving...' : 'Save Patient'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
