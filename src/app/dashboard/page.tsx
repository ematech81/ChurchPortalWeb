'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface Stats {
  scope: 'organisation' | 'church';
  totalMembers: number;
  totalBranches: number | null;
  totalWorkers: number;
  totalFirstTimers: number;
  totalNewConverts: number;
  totalPastors: number;
  totalFollowUps: number;
  attendanceThisWeek: number;
  totalEvents: number;
  monthlyGiving: number;
  branchBreakdown: { id: string; name: string; isHeadquarters: boolean; memberCount: number }[] | null;
}

const naira = (n: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => (await api.get<Stats>('/dashboard/stats')).data,
    enabled: !!user?.churchId,
  });

  const cards: [string, string | number][] = data
    ? [
        ['Members', data.totalMembers],
        ...(data.totalBranches !== null ? ([['Branches', data.totalBranches]] as [string, number][]) : []),
        ['Pastors', data.totalPastors],
        ['Workers', data.totalWorkers],
        ['First timers', data.totalFirstTimers],
        ['New converts', data.totalNewConverts],
        ['Needing follow-up', data.totalFollowUps],
        ['Attendance this week', data.attendanceThisWeek],
        ['Giving this month', naira(data.monthlyGiving)],
      ]
    : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        {user?.role === 'senior_pastor' ? 'Ministry overview' : 'Church overview'}
      </h1>
      {data && (
        <p className="mt-1 text-sm text-gray-500">
          {data.scope === 'organisation' ? 'Totals across all of your branches' : 'Totals for your church'}
        </p>
      )}

      {isLoading && <p className="mt-6 text-gray-500">Loading…</p>}
      {isError && <p className="mt-6 text-red-600">Could not load the dashboard. Please try again.</p>}

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      {data?.branchBreakdown && data.branchBreakdown.length > 1 && (
        <div className="mt-8 bg-white rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">Members by branch</h2>
          <ul className="mt-3 divide-y divide-gray-100">
            {data.branchBreakdown.map((b) => (
              <li key={b.id} className="flex justify-between py-2 text-sm">
                <span>
                  {b.name}
                  {b.isHeadquarters && <span className="ml-2 text-xs text-yellow-700">HQ</span>}
                </span>
                <span className="font-medium">{b.memberCount}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
