'use client';

import { Suspense } from 'react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Cpu, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '/dashboard';

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
      // Always land on /dashboard — avoids server-redirect loops if `from` is / or empty
      const destination = from && from !== '/' && from !== '/login' ? from : '/dashboard';
      router.replace(destination);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Authentication failed. Please try again.',
      );
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Mobile logo */}
      <div className="flex lg:hidden items-center gap-2.5 mb-8">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Cpu className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-sm font-bold text-slate-900">Toplab EHR</span>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter your credentials to access the EHR system.
        </p>
      </div>

      {/* Demo credentials hint */}
      <div className="mb-5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
        <p className="text-xs font-medium text-blue-700 mb-1">Demo credentials</p>
        <p className="text-xs text-blue-600 font-mono">admin@toplab.com / password</p>
      </div>

      {/* Error */}
      {authError && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
          <p className="text-xs text-red-700">{authError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className={cn(
              'w-full h-10 rounded-lg border px-3 text-sm outline-none transition',
              'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400',
              errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white',
            )}
            placeholder="you@hospital.com"
          />
          {errors.email && (
            <p role="alert" className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <a href="#" className="text-xs text-blue-600 hover:text-blue-700 hover:underline">
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              {...register('password')}
              className={cn(
                'w-full h-10 rounded-lg border px-3 pr-10 text-sm outline-none transition',
                'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400',
                errors.password ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white',
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
          <label htmlFor="remember" className="text-sm text-slate-600">
            Remember me for 7 days
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          id="login-submit"
          className={cn(
            'w-full h-10 rounded-lg bg-blue-600 text-sm font-semibold text-white transition',
            'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          )}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-400">
        Protected health information. Unauthorized access is prohibited.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[420px] flex-col justify-between bg-blue-600 p-10 text-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            <Cpu className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-base font-bold leading-none">Toplab</p>
            <p className="text-[11px] text-blue-200 leading-none mt-0.5">EHR System</p>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold leading-snug mb-4">
            Modern clinical management for modern healthcare.
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            Toplab EHR streamlines patient care from registration to laboratory results, powered by AI-enhanced clinical tools and real-time analytics.
          </p>
        </div>

        <div className="flex gap-4 text-xs text-blue-200">
          <span>Secure</span>
          <span>·</span>
          <span>HIPAA-aligned</span>
          <span>·</span>
          <span>Role-based access</span>
        </div>
      </div>

      {/* Right panel — login form wrapped in Suspense for useSearchParams */}
      <div className="flex flex-1 items-center justify-center p-6">
        <Suspense fallback={<div className="w-full max-w-sm animate-pulse space-y-4"><div className="h-8 w-48 bg-slate-200 rounded" /><div className="h-10 bg-slate-100 rounded-lg" /><div className="h-10 bg-slate-100 rounded-lg" /></div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
