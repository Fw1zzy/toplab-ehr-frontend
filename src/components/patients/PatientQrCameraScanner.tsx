'use client';

import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, LoaderCircle, X } from 'lucide-react';

interface PatientQrCameraScannerProps {
  expectedPatientId: string;
  onScan: (payload: string) => void;
  onClose: () => void;
}

const qrPattern = /^TOPLAB-QRP1:([0-9a-f-]{36}):([0-9a-f-]{36}):([A-Za-z0-9_-]{43})$/i;

export function PatientQrCameraScanner({ expectedPatientId, onScan, onClose }: PatientQrCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanHandlerRef = useRef(onScan);
  const [status, setStatus] = useState('Starting camera...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    scanHandlerRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const videoElement = videoRef.current;
    let stopped = false;
    let stream: MediaStream | null = null;
    let animationFrame = 0;
    let lastScanTime = 0;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    async function startCamera() {
      if (!window.isSecureContext) {
        setError('Camera access requires HTTPS (or localhost). You can upload a QR image instead.');
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('This browser does not support camera access. You can upload a QR image instead.');
        return;
      }
      if (!context) {
        setError('This browser cannot decode camera images. You can upload a QR image instead.');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoElement;
        if (!video) throw new Error('Camera preview is unavailable.');
        video.srcObject = stream;
        await video.play();
        setStatus('Point the camera at the patient QR code.');

        const scanFrame = () => {
          if (stopped) return;
          const currentVideo = videoElement;
          const now = performance.now();
          if (currentVideo && currentVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && currentVideo.videoWidth > 0 && now - lastScanTime >= 150) {
            lastScanTime = now;
            if (canvas.width !== currentVideo.videoWidth || canvas.height !== currentVideo.videoHeight) {
              canvas.width = currentVideo.videoWidth;
              canvas.height = currentVideo.videoHeight;
            }
            context.drawImage(currentVideo, 0, 0, canvas.width, canvas.height);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            const decoded = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' });
            if (decoded) {
              const match = qrPattern.exec(decoded.data);
              if (!match) {
                setError('That QR is not a valid TOPLAB patient ID. Keep scanning or upload the correct image.');
              } else if (match[1].toLowerCase() !== expectedPatientId.toLowerCase()) {
                setError('This QR belongs to a different patient. Scan the selected patient’s ID.');
              } else {
                stopped = true;
                stream?.getTracks().forEach((track) => track.stop());
                scanHandlerRef.current(decoded.data);
                return;
              }
            }
          }
          animationFrame = window.requestAnimationFrame(scanFrame);
        };
        animationFrame = window.requestAnimationFrame(scanFrame);
      } catch (cause) {
        if (stopped) return;
        const cameraError = cause instanceof Error ? cause : null;
        setError(cameraError?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser settings or upload a QR image instead.'
          : cameraError?.name === 'NotFoundError'
            ? 'No camera was found on this device. You can upload a QR image instead.'
            : cameraError?.message ?? 'Unable to start the camera. You can upload a QR image instead.');
      }
    }

    void startCamera();
    return () => {
      stopped = true;
      window.cancelAnimationFrame(animationFrame);
      stream?.getTracks().forEach((track) => track.stop());
      if (videoElement) videoElement.srcObject = null;
    };
  }, [expectedPatientId]);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-950 p-3">
      <div className="flex items-center justify-between gap-3 text-white">
        <p className="flex items-center gap-2 text-xs font-medium"><Camera className="h-4 w-4" />Scan patient QR</p>
        <button type="button" onClick={onClose} aria-label="Close camera scanner" className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
        <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-cyan-300/90 shadow-[0_0_0_999px_rgba(0,0,0,0.18)]" />
      </div>
      {error
        ? <p role="alert" className="text-[11px] leading-relaxed text-amber-200">{error}</p>
        : <p role="status" aria-live="polite" className="flex items-center gap-2 text-[11px] text-slate-200"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />{status}</p>}
    </div>
  );
}
