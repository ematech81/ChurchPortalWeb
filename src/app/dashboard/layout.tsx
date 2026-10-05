'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuthStore } from '@/stores/auth.store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { hydrate, accessToken, user } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrate();
    setReady(true);
  }, [hydrate]);

  useEffect(() => {
    if (ready && !accessToken) {
      router.replace('/login');
    }
  }, [ready, accessToken, router]);

  if (!ready || !accessToken) return null;

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {user && !user.churchId ? (
          <div className="max-w-lg mx-auto mt-24 text-center bg-white rounded-2xl p-8 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">Finish setting up your church</h1>
            <p className="mt-2 text-gray-500 text-sm">
              Open the Kingdom Portal mobile app and complete the church setup. Once that is done,
              sign in here again and your dashboard will appear.
            </p>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
