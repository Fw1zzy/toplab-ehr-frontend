'use client';

import { FormEvent, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle2, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import jsQR from 'jsqr';
import { toast } from 'sonner';
import { api } from '@/lib/api';

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

export function RequestPatientTransferDialog({ patient, open, onOpenChange, onApproved }: RequestPatientTransferDialogProps) {
  const [purpose, setPurpose] = useState('');
  const [request, setRequest] = useState<RequestResponse | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [method, setMethod] = useState<'email' | 'qr'>('email');
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [qrFileName, setQrFileName] = useState<string | null>(null);

  function resetFlow() {
    setPurpose('');
    setRequest(null);
    setCode('');
    setError(null);
    setIsSending(false);
    setIsVerifying(false);
    setMethod('email');
    setQrPayload(null);
    setQrFileName(null);
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
        await api.interclinic.transferUsingQr({ patientId: patient.id, purpose: purpose.trim(), qrPayload });
        toast.success('Patient record transferred', {
          description: 'The patient’s reusable QR authorized the transfer. It remains active until the patient QR is revoked.',
        });
        resetFlow();
        onApproved();
        onOpenChange(false);
        return;
      }
      const result = await api.interclinic.requestTransfer({
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

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request || isVerifying) return;
    setError(null);
    setIsVerifying(true);
    try {
      await api.interclinic.verifyTransfer({ consentId: request.consentId, code: code.trim() });
      toast.success('Patient record transferred', {
        description: 'Your branch is now the custodian. Linked patient history is available here, and the previous branch no longer has normal access.',
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
            <div><Dialog.Title className="text-lg font-semibold text-slate-900">Transfer Patient Record</Dialog.Title><Dialog.Description className="mt-1 text-sm text-slate-500">Request the patient&apos;s authorization to transfer {patient?.name ?? 'this patient'} to your branch.</Dialog.Description></div>
            <Dialog.Close asChild><button type="button" aria-label="Close" className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button></Dialog.Close>
          </header>

          {!request ? <form id="patient-access-request-form" onSubmit={submitRequest} className="flex-1 space-y-6 overflow-y-auto p-6">
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs leading-relaxed text-blue-900">
              Choose how the patient authorizes the transfer. The patient&apos;s EHR record and its linked history move to your branch; no duplicate is created.
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Transfer authorization method">
              <button type="button" role="tab" aria-selected={method === 'email'} onClick={() => { setMethod('email'); setQrPayload(null); setQrFileName(null); setError(null); }} className={`rounded-md px-3 py-2 text-xs font-semibold ${method === 'email' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Email OTP</button>
              <button type="button" role="tab" aria-selected={method === 'qr'} onClick={() => { setMethod('qr'); setRequest(null); setError(null); }} className={`rounded-md px-3 py-2 text-xs font-semibold ${method === 'qr' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>Patient QR</button>
            </div>
            <label className="block space-y-1.5 text-xs font-medium text-slate-700">Purpose of transfer <span className="text-red-500">*</span>
              <textarea required minLength={8} maxLength={500} rows={3} value={purpose} onChange={(event) => setPurpose(event.target.value)} className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="Explain why custody is being transferred" />
            </label>
            {method === 'qr' ? <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <label className="block text-xs font-semibold text-slate-700">Upload an image of the patient&apos;s QR ID
                <input type="file" accept="image/*" onChange={(event) => void readQrImage(event.target.files?.[0])} className="mt-2 block w-full text-xs font-normal text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700" />
              </label>
              {qrFileName && qrPayload && <p role="status" className="text-xs font-medium text-emerald-700">QR image decoded: {qrFileName}</p>}
              <p className="rounded-lg bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">This QR is reusable and has no time expiry. Anyone holding a copy can authorize transfers until the patient&apos;s QR is revoked.</p>
            </div> : <div className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-[11px] leading-relaxed text-slate-600"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none text-blue-600" />The email code is sent only to the email address on the patient&apos;s EHR record. Entering it on the next step confirms this transfer.</div>}
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            {isSending && <p role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-blue-700"><LoaderCircle className="h-4 w-4 animate-spin" />{method === 'email' ? 'Saving the transfer request and sending the email code...' : 'Validating the QR and transferring custody...'}</p>}
          </form> : <form id="patient-access-code-form" onSubmit={submitCode} className="flex-1 space-y-5 p-6">
            <div className="flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-emerald-800"><CheckCircle2 className="mt-0.5 h-5 w-5 flex-none" /><div><p className="text-sm font-semibold">Authorization email sent</p><p className="mt-1 text-xs leading-relaxed">Enter the six-digit code sent to <strong>{request.email}</strong>. The code expires at {new Date(request.expiresAt).toLocaleTimeString()}.</p></div></div>
            <label className="block space-y-1.5 text-xs font-medium text-slate-700">Email authorization code
              <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="h-12 w-full rounded-lg border border-slate-200 px-4 text-center font-mono text-xl tracking-[0.5em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10" placeholder="000000" />
            </label>
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-amber-800"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-600" />Verifying this code completes the custody transfer. The source branch will lose normal access, and all linked patient records will follow the new custodian branch.</p>
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            {isVerifying && <p role="status" aria-live="polite" className="flex items-center gap-2 text-xs text-blue-700"><LoaderCircle className="h-4 w-4 animate-spin" />Verifying the code and transferring custody...</p>}
          </form>}

          <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 p-6">
            <Dialog.Close asChild><button type="button" disabled={isSending || isVerifying} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">Cancel</button></Dialog.Close>
            {!request ? <button type="submit" form="patient-access-request-form" disabled={!patient || purpose.trim().length < 8 || isSending || (method === 'qr' && !qrPayload)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{isSending && <LoaderCircle className="h-4 w-4 animate-spin" />}{isSending ? (method === 'email' ? 'Sending...' : 'Transferring...') : (method === 'email' ? 'Email Transfer Code' : 'Transfer Using QR')}</button>
              : <button type="submit" form="patient-access-code-form" disabled={code.length !== 6 || isVerifying} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{isVerifying && <LoaderCircle className="h-4 w-4 animate-spin" />}{isVerifying ? 'Transferring...' : 'Confirm Transfer'}</button>}
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
