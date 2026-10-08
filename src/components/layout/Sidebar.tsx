'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Ticket, Users, Sparkles, LogOut, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

// Only pages that exist. Add a link here when its page is built.
const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/events', label: 'Event Registration', icon: Ticket },
  { href: '/dashboard/members', label: 'Members', icon: Users },
  { href: '/dashboard/youth', label: 'Youth', icon: Sparkles },
];

const ROLE_LABEL: Record<string, string> = {
  senior_pastor: 'Senior Pastor',
  branch_pastor: 'Branch Pastor',
  admin_pastor: 'Admin Pastor',
  super_admin: 'Super Admin',
};

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  async function signOut() {
    try {
      const { api } = await import('@/lib/api');
      await api.post('/auth/logout');
    } catch {
      // best effort: we clear the local session either way
    }
    clearAuth();
    router.replace('/login');
  }

  return (
    <>
      {/* phone/tablet: dark backdrop behind the slide-in menu */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-slate-200 transition-transform md:static md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <div>
            <h1 className="text-lg font-bold text-white">Kingdom Portal</h1>
            <p className="text-xs text-yellow-400">Church Management</p>
          </div>
          <button className="md:hidden" onClick={onClose} aria-label="Close menu"><X className="h-5 w-5" /></button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? 'bg-yellow-400 text-slate-900' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          {user && (
            <div className="mb-3">
              <p className="truncate text-sm font-medium text-white">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-slate-400">{ROLE_LABEL[user.role] ?? user.role}</p>
            </div>
          )}
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
