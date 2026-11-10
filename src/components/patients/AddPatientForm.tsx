'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useCreatePatient, useUpdatePatient } from '@/lib/queries/usePatients';
import { useCompanies } from '@/lib/queries/useCompanies';
import { Patient } from '@/types';
import Image from 'next/image';

interface AddPatientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient;
}

function initialFormData(patient?: Patient) {
  if (!patient) return {
    firstName: '', middleName: '', lastName: '', suffix: '', dateOfBirth: '', sex: '', civilStatus: '',
    address: '', mobileNumber: '', email: '', company: '', validIdPresented: '', validIdNumber: '',
  };
  return {
    firstName: patient.first_name ?? '',
    middleName: patient.middle_name ?? '',
    lastName: patient.last_name ?? '',
    suffix: patient.suffix ?? '',
    dateOfBirth: patient.date_of_birth ?? '',
    sex: patient.sex ?? '',
    civilStatus: patient.civil_status
      ? patient.civil_status === 'widowed'
        ? 'Widow/Widower'
        : patient.civil_status[0].toUpperCase() + patient.civil_status.slice(1)
      : '',
    address: patient.address ?? '',
    mobileNumber: patient.contact_number ?? '',
    email: patient.email ?? '',
    company: patient.company_id ?? '',
    validIdPresented: patient.valid_id_presented ?? '',
    validIdNumber: patient.valid_id_number ?? '',
  };
}

export function AddPatientForm(props: AddPatientFormProps) {
  return <PatientForm key={`${props.open ? 'open' : 'closed'}-${props.patient?.id ?? 'new'}`} {...props} />;
}

function PatientForm({ open, onOpenChange, patient }: AddPatientFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  // Form State
  const [formData, setFormData] = useState(() => initialFormData(patient));

  const { mutateAsync: createPatient, isPending: isCreating } = useCreatePatient();
  const { mutateAsync: updatePatient, isPending: isUpdating } = useUpdatePatient();
  const isPending = isCreating || isUpdating;

  const { data: companiesData } = useCompanies();
  const companiesList = companiesData?.data ?? [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSubmitError(null);
    setPhotoFile(file);
    setPhotoPreview(null);
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setPhotoFile(null);
      setSubmitError('Choose a JPEG, PNG, or WebP photo smaller than 8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setPhotoPreview(reader.result); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    try {
      const payload = {
        first_name: formData.firstName,
        middle_name: formData.middleName || null,
        last_name: formData.lastName,
        suffix: formData.suffix || null,
        date_of_birth: formData.dateOfBirth,
        sex: formData.sex.toLowerCase() as Patient['sex'],
        civil_status: (formData.civilStatus.toLowerCase() === 'widow/widower' ? 'widowed' : formData.civilStatus.toLowerCase()) as Patient['civil_status'],
        address: formData.address || null,
        contact_number: formData.mobileNumber,
        email: formData.email,
        company_id: formData.company || null,
        valid_id_presented: formData.validIdPresented || null,
        valid_id_number: formData.validIdNumber || null,
      };

      if (patient) {
        await updatePatient({ id: patient.id, data: payload, photo: photoFile ?? undefined });
      } else {
        await createPatient({ data: payload, photo: photoFile ?? undefined });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save patient', error);
      setSubmitError(error instanceof Error ? error.message : 'Unable to save patient to the EHR.');
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
                {patient ? 'Update the patient\'s information.' : 'Enter the patient\'s information. A Patient-role EHR user will also be created; password setup is handled through the EHR reset flow.'}
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
                    <label htmlFor="middleName" className="text-xs font-medium text-slate-700">Middle Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      id="middleName"
                      name="middleName"
                      required
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
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widow/Widower">Widow/Widower</option>
                      <option value="Separated">Separated</option>
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
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                      placeholder="examplemail@gmail.com"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Patient Photo</h3>
                <div className="flex flex-wrap items-center gap-4">
                  {photoPreview && <Image src={photoPreview} alt="Selected patient avatar" width={72} height={72} unoptimized className="h-18 w-18 rounded-full object-cover ring-2 ring-blue-100" />}
                  <div className="space-y-1.5">
                    <label htmlFor="patientPhoto" className="text-xs font-medium text-slate-700">Upload avatar photo</label>
                    <input id="patientPhoto" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700" />
                    <p className="text-[11px] text-slate-500">Saved to the linked Patient-role EHR user&apos;s avatar. JPEG, PNG, or WebP up to 8 MB.</p>
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
                      <option value="">No company</option>
                      {companiesList.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
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
                      <option value="Driver&apos;s License">Driver&apos;s License</option>
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
            {submitError && <p role="alert" className="mr-auto text-xs text-red-600">{submitError}</p>}
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
