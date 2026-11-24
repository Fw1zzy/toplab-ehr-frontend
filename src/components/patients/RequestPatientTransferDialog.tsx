'use client';

import { FormEvent, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle2, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import jsQR from 'jsqr';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PatientQrCameraScanner } from '@/components/patients/PatientQrCameraScanner';

interface RequestPatientTransferDialogProps {
  patient: { id: string; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved: () => void;
}

interface RequestResponse {
  consentId: string;
  email: string;
  expiresAt: string;
}

const purposePresets = [
  {
    label: 'Continuity of care',
    text: 'Coordinate ongoing care and review relevant patient information for continuity of treatment.',
  },
  {
    label: 'Referral evaluation',
    text: 'Review relevant patient information to evaluate and coordinate a referral for care.',
  },
  {
    label: 'Clinical consultation',
    text: 'Review relevant patient information to support a clinical consultation and care plan.',
  },
  {
    label: 'Follow-up care',
    text: 'Review relevant patient information to coordinate follow-up care and treatment.',
  },
  {
    label: 'Diagnostic coordination',
    text: 'Review relevant patient information to coordinate diagnostic testing and follow-up.',
  },
];

export function RequestPatientTransferDialog({ patient, open, onOpenChange, onApproved }: RequestPatientTransferDialogProps) {
  const [purpose, setPurpose] = useState('');
  const [selectedPurposePreset, setSelectedPurposePreset] = useState('');
  const [request, setRequest] = useState<RequestResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [method, setMethod] = useState<'email' | 'qr'>('email');
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [qrFileName, setQrFileName] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  function resetFlow() {
    setPurpose('');
    setSelectedPurposePreset('');
    setRequest(null);
    setCode('');
    setError(null);
    setIsSending(false);
    setIsVerifying(false);
    setMethod('email');
    setQrPayload(null);
    setQrFileName(null);
    setShowCamera(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen === false && (isSending || isVerifying)) return;
    if (!nextOpen) resetFlow();
    onOpenChange(nextOpen);
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patient || isSending) return;
    setError(null);
    setIsSending(true);
    try {
      if (method === 'qr') {
        if (!qrPayload) throw new Error('Choose a clear image of this patient’s active QR ID first.');
        await api.interclinic.shareUsingQr({ patientId: patient.id, purpose: purpose.trim(), qrPayload });
        toast.success('Patient access approved', {
          description: 'The patient remains with the home branch. Your branch can view and edit patient profile information until access is revoked.',
        });
        resetFlow();
        onApproved();
        onOpenChange(false);
        return;
      }
      const result = await api.interclinic.requestShare({
        patientId: patient.id,
        purpose: purpose.trim(),
      }) as RequestResponse;
      setRequest(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send an authorization request.');
    } finally {
      setIsSending(false);
    }
  }

  async function readQrImage(file: File | undefined) {
    setShowCamera(false);
    setQrPayload(null);
    setQrFileName(null);
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file containing the patient QR.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('The QR image must be smaller than 10 MB.');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('This browser cannot read the selected image.');
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      const image = context.getImageData(0, 0, width, height);
      const decoded = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
      if (!decoded?.data.startsWith('TOPLAB-QRP1:')) throw new Error('No valid TOPLAB patient QR was found in this image.');
      setQrPayload(decoded.data);
      setQrFileName(file.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to decode the QR image. Try a clearer image.');
    }
  }

  function acceptCameraScan(payload: string) {
    setQrPayload(payload);
    setQrFileName('Camera scan');
    setShowCamera(false);
    setError(null);
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request || isVerifying) return;
    setError(null);
    setIsVerifying(true);
    try {
      await api.interclinic.verifyShare({ consentId: request.consentId, code: code.trim() });
      toast.success('Patient access approved', {
          description: 'The patient remains with the home branch. Your branch can view and edit patient profile information until access is revoked.',
      });
      resetFlow();
      onApproved();
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify the authorization code.');
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col bg-white shadow-2xl sm:border-l sm:border-slate-200">
          <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div><Dialog.Title className="text-lg font-semibold text-slate-900">Request Patient Access</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">Request the patient&apos;s authorization to share {patient?.name ?? 'this patient'} with your branch.</Dialog.Description></div>
            <Dialog.Close asChild><button type="button" aria-label="Close" className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></Dialog.Close>
          </header>

          {!request ? <form id="patient-access-request-form" onSubmit={submitRequest} className="flex-1 space-y-6 overflow-y-auto p-6">
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs leading-relaxed text-blue-900">
              Choose how the patient authorizes sharing. The patient profile remains under its home branch and your branch can view and edit profile information until access is revoked; no duplicate is created.
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Transfer authorization method">
              <button type="button" role="tab" aria-selected={method === 'email'} onClick={() => { setMethod('email'); setQrPayload(null); setQrFileName(null); setError(null); }} className={`rounded-md px-3 py-2 text-xs font-semibold ${method === 'email' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Email OTP</button>
              <button type="button" role="tab" aria-selected={method === 'qr'} onClick={() => { setMethod('qr'); setRequest(null); setError(null); }} className={`rounded-md px-3 py-2 text-xs font-semibold ${method === 'qr' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Patient QR</button>
            </div>
            <label className="block space-y-1.5 text-xs font-medium text-slate-700">Purpose of access <span className="text-red-500">*</span>
              <select
                value={selectedPurposePreset}
                onChange={(event) => {
                  const preset = purposePresets.find((option) => option.label === event.target.value);
                  setSelectedPurposePreset(event.target.value);
                  if (preset) setPurpose(preset.text);
                }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Choose a suggested purpose (optional)</option>
                {purposePresets.map((preset) => <option key={preset.label} value={preset.label}>{preset.label}</option>)}
              </select>
              <textarea required minLength={8} maxLength={500} rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="Explain why you need to view this patient's records" />
            </label>
            {method === 'qr' ? <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setQrPayload(null); setQrFileName(null); setError(null); setShowCamera(true); }} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">Scan with camera</button>
                <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Upload QR image
                  <input type="file" accept="image/*" onChange={(event) => void readQrImage(event.target.files?.[0])} className="sr-only" />
                </label>
              </div>
              {showCamera && patient && <PatientQrCameraScanner expectedPatientId={patient.id} onScan={acceptCameraScan} onClose={() => setShowCamera(false)} />}
              {qrFileName && qrPayload && <p role="status" className="text-xs font-medium text-emerald-700">{qrFileName === 'Camera scan' ? 'Patient QR recognized from camera.' : `QR image decoded: ${qrFileName}`}</p>}
              <p className="rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">This QR is reusable and has no time expiry. Anyone holding a copy can authorize profile sharing with edit access until the patient revokes sharing or the QR is revoked.</p>
            </div> : <div className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-[11px] leading-relaxed text-slate-600"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none text-blue-600" />The email code is sent only to the email address on the patient&apos;s EHR record. Entering it on the next step grants non-expiring access to view and edit the patient profile.</div>}
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            {isSending && <p role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-blue-700"><LoaderCircle className="h-4 w-4 animate-spin" />{method === 'email' ? 'Saving the access request and sending the email code...' : 'Validating the QR and approving shared access...'}</p>}
          </form> : <form id="patient-access-code-form" onSubmit={submitCode} className="flex-1 space-y-5 p-6">
            <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-emerald-800"><CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" /><div><p className="text-sm font-semibold">Authorization email sent</p><p className="mt-1 text-xs leading-relaxed">Enter the six-digit code sent to <strong>{request.email}</strong>. The code expires at {new Date(request.expiresAt).toLocaleTimeString()}.</p></div></div>
            <label className="block space-y-1.5 text-xs font-medium text-slate-700">Email authorization code
              <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="h-12 w-full rounded-lg border border-slate-200 px-4 text-center font-mono text-xl tracking-[0.5em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="000000" />
            </label>
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-800"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-600" />Verifying this code lets your branch view and edit the patient profile until the patient revokes access. The home branch retains custody and access. Encounter, laboratory, and billing records follow their existing permissions.</p>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            {isVerifying && <p role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-blue-700"><LoaderCircle className="h-4 w-4 animate-spin" />Verifying the code and approving shared access...</p>}
          </form>}

          <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6">
            <Dialog.Close asChild><button type="button" disabled={isSending || isVerifying} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">Cancel</button></Dialog.Close>
            {!request ? <button type="submit" form="patient-access-request-form" disabled={!patient || purpose.trim().length < 8 || isSending || (method === 'qr' && !qrPayload)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{isSending && <LoaderCircle className="h-4 w-4 animate-spin" />}{isSending ? (method === 'email' ? 'Sending...' : 'Sharing...') : (method === 'email' ? 'Email Authorization Code' : 'Share Using QR')}</button>
              : <button type="submit" form="patient-access-code-form" disabled={code.length !== 6 || isVerifying} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{isVerifying && <LoaderCircle className="h-4 w-4 animate-spin" />}{isVerifying ? 'Approving...' : 'Confirm Access'}</button>}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
