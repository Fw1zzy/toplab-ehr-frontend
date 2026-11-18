'use client';

import { Suspense } from 'react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle, LockKeyhole, LoaderCircle, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import ehrBackground from '@/images/background_ehr.webp';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { useAuth } from '@/lib/auth/AuthProvider';
import { usePreferences } from '@/lib/auth/PreferencesProvider';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from');
  const { preferences } = usePreferences();

  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  async function onSubmit(data: LoginForm) {
    setAuthError(null);
    try {
      await login(data.email, data.password);
      const safeFrom = from && from.startsWith('/') && !from.startsWith('//') && from !== '/' && from !== '/login'
        ? from
        : null;
      const destination = safeFrom ?? preferences.defaultLanding;
      router.replace(destination);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Authentication failed. Please try again.',
      );
    }
  }

  return (
    <div className="w-full max-w-[430px] rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_26px_80px_-42px_rgba(15,39,67,0.28)] sm:p-9">
      {/* Mobile logo */}
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <BrandLogo size="md" alt="TOPLAB" />
        <div>
          <span className="block text-sm font-bold tracking-wide text-slate-900">TOPLAB</span>
          <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-400">Clinical workspace</span>
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700">
          <LockKeyhole className="h-3 w-3" /> Secure sign in
        </div>
        <h2 className="text-[28px] font-semibold tracking-tight text-slate-950">Welcome back</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">Sign in to continue to your clinical workspace.</p>
      </div>

      {/* Error */}
      {authError && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-xs text-red-700">{authError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className={cn(
              'h-12 w-full rounded-xl border px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400',
              'focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10',
              errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50/60',
            )}
            placeholder="you@hospital.com"
          />
          {errors.email && (
            <p role="alert" className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="mb-2">
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Password
            </label>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password')}
              className={cn(
                'h-12 w-full rounded-xl border px-3.5 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400',
                'focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10',
                errors.password ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50/60',
              )}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              id="toggle-password"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-2 flex justify-end">
            <a href="#" className="text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline">
              Forgot password?
            </a>
          </div>
          {errors.password && (
            <p role="alert" className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <input
            id="remember"
            type="checkbox"
            {...register('remember')}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
            <label htmlFor="remember" className="text-xs text-slate-500">
            Remember me for 7 days
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          id="login-submit"
          className={cn(
            'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 text-sm font-semibold text-white shadow-[0_10px_22px_-12px_rgba(29,78,216,0.85)] transition',
            'hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:ring-offset-2',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Protected health information. Authorized users only.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(480px,0.92fr)]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-[#071b33] px-12 py-10 text-white lg:flex lg:flex-col xl:px-16">
        <Image
          src={ehrBackground}
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) 56vw, 58vw"
          className="pointer-events-none object-cover"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#06182e]/95 via-[#082849]/70 to-[#07213e]/25" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#06182e]/65 via-transparent to-[#06182e]/20" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.1] [background-image:linear-gradient(rgba(186,230,253,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(186,230,253,.18)_1px,transparent_1px)] [background-size:64px_64px]" />

        <header className="relative z-10 flex items-center gap-3">
          <BrandLogo size="md" tone="inverse" alt="TOPLAB" priority />
          <div>
            <p className="text-sm font-bold tracking-[0.16em]">TOPLAB</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-blue-200/70">Clinical information system</p>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-[700px] flex-1 flex-col justify-center py-10">
          <div className="max-w-[540px]">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-300">Care + Link + Ka</p>
            <h1 className="max-w-[580px] text-4xl font-semibold leading-[1.08] tracking-[-0.035em] xl:text-5xl">
              A clearer view of every patient journey.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-blue-100/75">
              Securely coordinate registration, encounters, and laboratory services in one clinical workspace.
            </p>
          </div>

        </div>

        <footer className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-[10px] tracking-wide text-blue-100/55">
          <span>Protected clinical workspace</span>
          <span>Role-based access</span>
        </footer>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <Suspense fallback={<BrandLoader compact label="Preparing sign in" detail="Loading your secure login form" />}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
