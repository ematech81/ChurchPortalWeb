'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Phone, Mail, KeyRound, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

// ── Schemas ──────────────────────────────────────────────────────────────────

const adminSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password is required'),
});

const otpSchema = z.object({
  code: z.string().length(6, 'Enter the 6-digit code'),
});

const pastorSchema = z.object({
  phone: z.string().min(10, 'Enter a valid phone number'),
});

const workerSchema = z.object({
  code: z.string().min(4, 'Enter your worker code'),
});

type Tab = 'admin' | 'pastor' | 'worker';

// ── Component ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, user } = useAuthStore();

  const [tab, setTab] = useState<Tab>('admin');
  const [showPassword, setShowPassword] = useState(false);

  // Admin: two-step when email unverified
  const [adminOtpMode, setAdminOtpMode] = useState(false);
  const [pendingAdminEmail, setPendingAdminEmail] = useState('');

  // Branch Pastor: two-step OTP
  const [pastorOtpMode, setPastorOtpMode] = useState(false);
  const [pendingPhone, setPendingPhone] = useState('');

  // Redirect already-logged-in users
  useEffect(() => {
    if (user) {
      router.replace(user.churchId ? '/dashboard' : '/onboarding');
    }
  }, [user, router]);

  function handleAuthSuccess(data: { accessToken: string; refreshToken: string; user: any }) {
    setAuth(data.user, data.accessToken, data.refreshToken);
    toast.success(`Welcome back, ${data.user.firstName}!`);
    router.push(data.user.churchId ? '/dashboard' : '/onboarding');
  }

  function switchTab(t: Tab) {
    setTab(t);
    setAdminOtpMode(false);
    setPastorOtpMode(false);
  }

  // ── Admin forms ───────────────────────────────────────────────────────────

  const adminForm = useForm({ resolver: zodResolver(adminSchema) });
  const adminOtpForm = useForm({ resolver: zodResolver(otpSchema) });

  async function onAdminLogin(values: z.infer<typeof adminSchema>) {
    try {
      const { data } = await api.post('/auth/login', values);
      handleAuthSuccess(data);
    } catch (err: any) {
      const body = err.response?.data;
      if (body?.code === 'EMAIL_NOT_VERIFIED') {
        setPendingAdminEmail(values.email);
        setAdminOtpMode(true);
        toast.info('Check your email for a 6-digit verification code.');
      } else {
        toast.error(body?.message ?? 'Login failed. Check your credentials.');
      }
    }
  }

  async function onAdminOtp(values: z.infer<typeof otpSchema>) {
    try {
      const { data } = await api.post('/auth/verify-otp', {
        email: pendingAdminEmail,
        code: values.code,
      });
      handleAuthSuccess(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Invalid code. Try again.');
    }
  }

  // ── Branch Pastor forms ───────────────────────────────────────────────────

  const pastorForm = useForm({ resolver: zodResolver(pastorSchema) });
  const pastorOtpForm = useForm({ resolver: zodResolver(otpSchema) });

  async function onPastorSendOtp(values: z.infer<typeof pastorSchema>) {
    try {
      await api.post('/auth/login-pastor', { phone: values.phone });
      setPendingPhone(values.phone);
      setPastorOtpMode(true);
      toast.info('A 6-digit code has been sent to your phone.');
    } catch (err: any) {
      const body = err.response?.data;
      toast.error(body?.detail ?? body?.message ?? 'Could not send OTP. Check your phone number.');
    }
  }

  async function onPastorOtp(values: z.infer<typeof otpSchema>) {
    try {
      const { data } = await api.post('/auth/verify-pastor-otp', {
        phone: pendingPhone,
        code: values.code,
      });
      handleAuthSuccess(data);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Invalid code. Try again.');
    }
  }

  // ── Worker form ───────────────────────────────────────────────────────────

  const workerForm = useForm({ resolver: zodResolver(workerSchema) });

  async function onWorkerLogin(values: z.infer<typeof workerSchema>) {
    try {
      const { data } = await api.post('/auth/worker/login', { code: values.code });
      handleAuthSuccess(data);
    } catch (err: any) {
      const body = err.response?.data;
      toast.error(body?.detail ?? body?.message ?? 'Invalid worker code.');
    }
  }

  // ── Shared UI helpers ─────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'admin', label: 'Admin', icon: Mail },
    { key: 'pastor', label: 'Branch Pastor', icon: Phone },
    { key: 'worker', label: 'Worker', icon: KeyRound },
  ];

  const inputClass =
    'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition';

  const btnPrimary =
    'w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-60 text-slate-900 font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2';

  function FieldError({ msg }: { msg?: string }) {
    return msg ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null;
  }

  function OtpInput({ register, error }: { register: any; error?: string }) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Verification code</label>
        <input
          {...register}
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          className={`${inputClass} text-center tracking-[0.5em] font-mono`}
        />
        <FieldError msg={error} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-400 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">⛪</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Kingdom Portal</h1>
          <p className="text-slate-400 text-sm mt-1">Church Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => switchTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-semibold transition-colors ${
                  tab === key
                    ? 'text-yellow-600 border-b-2 border-yellow-500 bg-yellow-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">

            {/* ── Admin: Email + Password ── */}
            {tab === 'admin' && !adminOtpMode && (
              <form onSubmit={adminForm.handleSubmit(onAdminLogin)} className="space-y-4">
                <p className="text-sm text-gray-500">Sign in with your admin email and password.</p>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email address</label>
                  <input
                    {...adminForm.register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="you@church.org"
                    className={inputClass}
                  />
                  <FieldError msg={adminForm.formState.errors.email?.message} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      {...adminForm.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <FieldError msg={adminForm.formState.errors.password?.message} />
                </div>

                <button type="submit" disabled={adminForm.formState.isSubmitting} className={btnPrimary}>
                  {adminForm.formState.isSubmitting && <Loader2 size={15} className="animate-spin" />}
                  Sign in
                </button>

                <p className="text-center text-xs text-gray-500 pt-1">
                  New church?{' '}
                  <a href="/register" className="text-yellow-600 font-semibold hover:underline">
                    Create an account
                  </a>
                </p>
              </form>
            )}

            {/* ── Admin: Email OTP Verification ── */}
            {tab === 'admin' && adminOtpMode && (
              <form onSubmit={adminOtpForm.handleSubmit(onAdminOtp)} className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail size={20} className="text-yellow-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Enter the 6-digit code sent to{' '}
                    <span className="font-semibold text-gray-800">{pendingAdminEmail}</span>
                  </p>
                </div>

                <OtpInput
                  register={adminOtpForm.register('code')}
                  error={adminOtpForm.formState.errors.code?.message}
                />

                <button type="submit" disabled={adminOtpForm.formState.isSubmitting} className={btnPrimary}>
                  {adminOtpForm.formState.isSubmitting && <Loader2 size={15} className="animate-spin" />}
                  Verify & sign in
                </button>

                <button
                  type="button"
                  onClick={() => setAdminOtpMode(false)}
                  className="w-full text-gray-400 text-xs hover:text-gray-600 transition-colors"
                >
                  ← Back to login
                </button>
              </form>
            )}

            {/* ── Branch Pastor: Phone Entry ── */}
            {tab === 'pastor' && !pastorOtpMode && (
              <form onSubmit={pastorForm.handleSubmit(onPastorSendOtp)} className="space-y-4">
                <p className="text-sm text-gray-500">
                  Enter your phone number to receive a one-time verification code.
                </p>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone number</label>
                  <input
                    {...pastorForm.register('phone')}
                    type="tel"
                    autoComplete="tel"
                    placeholder="+2348012345678"
                    className={inputClass}
                  />
                  <FieldError msg={pastorForm.formState.errors.phone?.message} />
                </div>

                <button type="submit" disabled={pastorForm.formState.isSubmitting} className={btnPrimary}>
                  {pastorForm.formState.isSubmitting
                    ? <Loader2 size={15} className="animate-spin" />
                    : <ChevronRight size={15} />}
                  Send code
                </button>
              </form>
            )}

            {/* ── Branch Pastor: OTP Verification ── */}
            {tab === 'pastor' && pastorOtpMode && (
              <form onSubmit={pastorOtpForm.handleSubmit(onPastorOtp)} className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Phone size={20} className="text-yellow-600" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Enter the code sent to{' '}
                    <span className="font-semibold text-gray-800">{pendingPhone}</span>
                  </p>
                </div>

                <OtpInput
                  register={pastorOtpForm.register('code')}
                  error={pastorOtpForm.formState.errors.code?.message}
                />

                <button type="submit" disabled={pastorOtpForm.formState.isSubmitting} className={btnPrimary}>
                  {pastorOtpForm.formState.isSubmitting && <Loader2 size={15} className="animate-spin" />}
                  Verify & sign in
                </button>

                <button
                  type="button"
                  onClick={() => setPastorOtpMode(false)}
                  className="w-full text-gray-400 text-xs hover:text-gray-600 transition-colors"
                >
                  ← Back
                </button>
              </form>
            )}

            {/* ── Worker: Unique Code ── */}
            {tab === 'worker' && (
              <form onSubmit={workerForm.handleSubmit(onWorkerLogin)} className="space-y-4">
                <p className="text-sm text-gray-500">
                  Enter the unique code your pastor gave you to access the follow-up portal.
                </p>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Worker code</label>
                  <input
                    {...workerForm.register('code')}
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. john-AB1234"
                    className={`${inputClass} font-mono`}
                  />
                  <FieldError msg={workerForm.formState.errors.code?.message} />
                </div>

                <button type="submit" disabled={workerForm.formState.isSubmitting} className={btnPrimary}>
                  {workerForm.formState.isSubmitting && <Loader2 size={15} className="animate-spin" />}
                  Access portal
                </button>
              </form>
            )}

          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          © 2025 Kingdom Portal · Empowering churches across Nigeria
        </p>
      </div>
    </div>
  );
}
