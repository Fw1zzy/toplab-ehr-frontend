'use client';

import { ChangeEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LoaderCircle, Printer, RefreshCw, ShieldCheck, Upload, X } from 'lucide-react';
import QRCode from 'qrcode';
import toplabLogo from '@/images/toplab-icon.png';
import { PatientAvatar } from '@/components/patients/PatientAvatar';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface PatientQrIdCardProps {
  patient: { id: string; name: string; patientNumber: string; avatarFileId?: string | null };
}

interface PatientQrResponse {
  active: boolean;
  qrPayload?: string;
  createdAt?: string;
}

export function PatientQrIdCard({ patient }: PatientQrIdCardProps) {
  const queryClient = useQueryClient();
  const queryKey = ['patient-qr', patient.id];
  const [qrImage, setQrImage] = useState<{ payload: string; dataUrl: string } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const qrQuery = useQuery({
    queryKey,
    queryFn: () => api.interclinic.getPatientQr(patient.id),
    staleTime: 0,
  });

  const issueMutation = useMutation({
    mutationFn: () => api.interclinic.createPatientQr(patient.id) as Promise<PatientQrResponse>,
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, result);
      toast.success('Patient QR is ready', { description: 'This QR does not time-expire. It remains valid until revoked.' });
    },
    onError: (cause) => toast.error(cause instanceof Error ? cause.message : 'Unable to generate patient QR.'),
  });

  const revokeMutation = useMutation({
    mutationFn: () => api.interclinic.revokePatientQr(patient.id),
    onSuccess: () => {
      queryClient.setQueryData(queryKey, { active: false });
      setQrImage(null);
      toast.success('Patient QR revoked');
    },
    onError: (cause) => toast.error(cause instanceof Error ? cause.message : 'Unable to revoke patient QR.'),
  });

  const qrPayload = qrQuery.data?.qrPayload;
  useEffect(() => {
    let current = true;
    if (!qrPayload) return () => { current = false; };
    QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: { dark: '#0f172a', light: '#ffffff' },
    }).then((url) => { if (current) setQrImage({ payload: qrPayload, dataUrl: url }); })
      .catch(() => { if (current) toast.error('Unable to render the patient QR image.'); });
    return () => { current = false; };
  }, [qrPayload]);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Choose an image file for the ID card.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPhotoError('The photo must be smaller than 8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhoto(reader.result);
        setPhotoError(null);
      }
    };
    reader.onerror = () => setPhotoError('Unable to read this photo.');
    reader.readAsDataURL(file);
  }

  const busy = issueMutation.isPending || revokeMutation.isPending;
  const activeQrImage = qrPayload && qrImage?.payload === qrPayload ? qrImage.dataUrl : null;

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Patient QR ID</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Generate a reusable interclinic transfer credential and print it as a standard CR80 ID card (85.6 x 53.98 mm). It has no time expiry and remains usable until revoked.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!qrQuery.data?.active && <button type="button" onClick={() => issueMutation.mutate()} disabled={busy || qrQuery.isLoading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {busy || qrQuery.isLoading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Generate QR
          </button>}
          {qrQuery.data?.active && <>
            <button type="button" onClick={() => window.print()} disabled={!activeQrImage} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Printer className="h-3.5 w-3.5" />Print ID</button>
            <button type="button" onClick={() => revokeMutation.mutate()} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
              {revokeMutation.isPending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}Revoke QR
            </button>
          </>}
        </div>
      </div>

      {qrQuery.isLoading ? <p className="flex items-center gap-2 text-xs text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading patient QR status...</p>
        : qrQuery.error ? <p role="alert" className="text-xs text-red-600">{qrQuery.error instanceof Error ? qrQuery.error.message : 'Unable to load QR status.'}</p>
          : qrQuery.data?.active && activeQrImage ? <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="space-y-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 no-print">
                <Upload className="h-3.5 w-3.5" />Choose patient photo for ID
                <input className="sr-only" type="file" accept="image/*" onChange={choosePhoto} />
              </label>
              <p className="text-[11px] text-slate-500">Photo stays in this browser session for printing only. It is not uploaded to the server or saved to the EHR.</p>
              {photoError && <p role="alert" className="text-xs text-red-600">{photoError}</p>}
              <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none" />Anyone holding a clear copy can authorize a patient transfer to their branch. Keep the ID secure and revoke this QR immediately if it is lost.</p>
              {qrQuery.data.createdAt && <p className="text-[10px] text-slate-400">Generated {new Date(qrQuery.data.createdAt).toLocaleString()} · No expiration</p>}
            </div>

            <div data-patient-id-print className="patient-qr-id-card relative grid w-full max-w-[600px] grid-cols-[0.9fr_1.25fr_0.9fr] items-center gap-4 overflow-hidden rounded-2xl border border-blue-100 border-l-4 border-l-blue-700 bg-gradient-to-br from-white via-white to-blue-50 p-5 shadow-sm">
              <div className="patient-id-photo flex aspect-square w-full max-w-[160px] self-center items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                {photo ? <Image src={photo} alt={`${patient.name} ID`} width={160} height={160} unoptimized className="h-full w-full object-cover" />
                  : <PatientAvatar patientId={patient.id} avatarFileId={patient.avatarFileId} name={patient.name} size="xl" className="h-full w-full rounded-xl" />}
              </div>
              <div className="patient-id-details min-w-0">
                <div className="patient-id-brand mb-3 flex items-center gap-2">
                  <Image src={toplabLogo} alt="TOPLAB" width={28} height={28} className="h-auto w-7 rounded-md" />
                  <span className="text-[10px] font-bold tracking-[0.2em] text-blue-800">TOPLAB</span>
                </div>
                <p className="break-words text-base font-bold leading-tight tracking-tight text-slate-900">{patient.name}</p>
                <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-blue-700">Patient ID</p>
                <p className="mt-1 break-all font-mono text-[10px] tracking-wide text-slate-600">{patient.patientNumber}</p>
                <p className="mt-3 text-[8px] leading-relaxed text-slate-400">Interclinic transfer credential</p>
              </div>
              <div className="patient-id-qr relative mx-auto aspect-square w-full max-w-[150px] rounded-xl bg-white p-2 ring-1 ring-slate-200">
                <Image src={activeQrImage} alt={`Permanent interclinic QR for ${patient.name}`} width={320} height={320} unoptimized className="h-full w-full" />
              </div>
            </div>
          </div> : !qrQuery.data?.active && !qrQuery.isLoading ? <p className="text-xs text-slate-500">No active QR is issued for this patient.</p> : null}
    </section>
  );
}
