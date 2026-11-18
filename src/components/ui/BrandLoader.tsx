import { BrandLogo } from '@/components/ui/BrandLogo';

interface BrandLoaderProps {
  label?: string;
  detail?: string;
  compact?: boolean;
}

export function BrandLoader({
  label = 'Opening your workspace',
  detail = 'Securing your connection to the EHR',
  compact = false,
}: BrandLoaderProps) {
  return (
    <div className={`relative flex ${compact ? 'min-h-[60vh]' : 'min-h-screen'} items-center justify-center overflow-hidden bg-[#f4f7fc] px-6`}>
      <div className="pointer-events-none absolute -left-36 -top-36 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -right-28 h-[30rem] w-[30rem] rounded-full bg-cyan-100/60 blur-3xl" />

      <div className="relative flex flex-col items-center text-center" role="status" aria-live="polite">
        <div className="relative mb-8 flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-blue-200/80" />
          <div className="absolute inset-2 rounded-full border border-dashed border-blue-300/80 motion-safe:animate-[spin_16s_linear_infinite] motion-reduce:animate-none" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 motion-safe:animate-spin motion-reduce:animate-none" />
          <BrandLogo size="lg" alt="TOPLAB" priority className="p-0 shadow-[0_14px_36px_-12px_rgba(37,99,235,0.7)] ring-4 ring-white" />
          <span className="absolute right-2 top-3 h-2.5 w-2.5 rounded-full bg-cyan-400 ring-4 ring-[#f4f7fc] motion-safe:animate-pulse" />
        </div>

        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-blue-700">Toplab EHR</p>
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">{label}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{detail}</p>
        </div>

        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-300 motion-safe:animate-[pulse_1.2s_ease-in-out_infinite]" />
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 motion-safe:animate-[pulse_1.2s_ease-in-out_200ms_infinite]" />
          <span className="h-1.5 w-1.5 rounded-full bg-blue-700 motion-safe:animate-[pulse_1.2s_ease-in-out_400ms_infinite]" />
        </div>
      </div>
    </div>
  );
}
