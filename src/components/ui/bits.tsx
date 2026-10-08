import { Loader2 } from 'lucide-react';
import type { EventStatus } from '@/lib/types';

// Small shared building blocks so every dashboard page looks the same.

export const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-yellow-400';
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-yellow-500 disabled:opacity-60';
export const btnOutline =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-gray-50 disabled:opacity-60';
export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
      <Loader2 className="h-5 w-5 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{message}</div>;
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="py-14 text-center">
      <p className="font-semibold text-gray-800">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const STATUS: Record<string, { cls: string; label: string }> = {
  open: { cls: 'bg-green-100 text-green-800', label: 'Open' },
  closed: { cls: 'bg-gray-100 text-gray-600', label: 'Closed' },
  full: { cls: 'bg-amber-100 text-amber-800', label: 'Full' },
};

export function StatusPill({ status }: { status: EventStatus }) {
  const s = STATUS[status] ?? STATUS.closed;
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

/** snake_case / lowercase → Title Case, '—' when empty. */
export const humanize = (v?: string | null) => (v ? v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—');
