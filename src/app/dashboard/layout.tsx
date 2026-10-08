'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthStore } from '@/stores/auth.store';
import { ADMIN_ROLES } from '@/lib/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hydrate, accessToken, user } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  useEffect(() => {
    if (ready && !accessToken) router.replace('/login');
  }, [ready, accessToken, router]);

  if (!ready || !accessToken) return null;

  const noChurch = user && !user.churchId;
  const notAllowed = user && user.churchId && !ADMIN_ROLES.includes(user.role);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* phone/tablet top bar with the menu button */}
        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu className="h-6 w-6 text-slate-700" /></button>
          <span className="font-semibold text-slate-900">Kingdom Portal</span>
        </div>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {noChurch ? (
            <Notice
              title="Finish setting up your church"
              body="Open the Kingdom Portal mobile app and complete the church setup. Once that is done, sign in here again and your dashboard will appear."
            />
          ) : notAllowed ? (
            <Notice
              title="This area is for pastors"
              body="Your account does not have access to the web dashboard. Please use the mobile app, or ask your Senior Pastor for access."
            />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">{body}</p>
    </div>
  );
}
