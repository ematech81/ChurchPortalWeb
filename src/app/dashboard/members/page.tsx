'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Download, Flag, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { FOLLOW_UP_TAG, Member, apiError } from '@/lib/types';
import { useAuthStore } from '@/stores/auth.store';
import { ExportPanel } from '@/components/members/ExportPanel';
import { Card, Empty, ErrorBox, PageHeader, Spinner, btnOutline, humanize, inputCls } from '@/components/ui/bits';

const FILTERS = [
  ['all', 'All'], ['worker', 'Workers'], ['first_timer', 'First timers'], ['new_convert', 'New converts'],
  ['member', 'Members'], ['visitor', 'Visitors'], ['backslidden', 'Backslidden'], ['minister', 'Ministers'], ['pastor', 'Pastors'],
] as const;

const STATUS_COLOR: Record<string, string> = {
  member: 'bg-green-100 text-green-800', worker: 'bg-violet-100 text-violet-800', first_timer: 'bg-blue-100 text-blue-800',
  new_convert: 'bg-sky-100 text-sky-800', visitor: 'bg-yellow-100 text-yellow-800', minister: 'bg-red-100 text-red-800',
  pastor: 'bg-slate-900 text-yellow-300', backslidden: 'bg-orange-100 text-orange-800',
};

const PAGE_SIZE = 25;

export default function MembersPage() {
  const role = useAuthStore((s) => s.user?.role) ?? '';
  const isSenior = role === 'senior_pastor' || role === 'super_admin';

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['members', debounced, status, isSenior],
    queryFn: async () =>
      (await api.get<Member[]>('/members', {
        params: { search: debounced || undefined, status: status === 'all' ? undefined : status, limit: 500, scope: isSenior ? 'all' : undefined },
      })).data,
  });
  const total = useQuery({
    queryKey: ['members-count', status, isSenior],
    queryFn: async () => Number((await api.get('/members/count', { params: { status: status === 'all' ? undefined : status, scope: isSenior ? 'all' : undefined } })).data),
  });

  const pages = Math.max(Math.ceil((data?.length ?? 0) / PAGE_SIZE), 1);
  const rows = useMemo(() => (data ?? []).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [data, page]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Members"
        subtitle={total.data !== undefined ? `${total.data.toLocaleString()} ${status === 'all' ? 'members' : humanize(status).toLowerCase()}${isSenior ? ' across all branches' : ''}` : undefined}
        actions={<button className={btnOutline} onClick={() => setExporting(true)}><Download className="h-4 w-4" /> Export</button>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => { setStatus(k); setPage(1); }}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${status === k ? 'border-yellow-400 bg-yellow-400 text-slate-900' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input className={`${inputCls} pl-9`} placeholder="Search name, phone, email or member ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error ? (
        <ErrorBox message={apiError(error, 'Could not load members.')} />
      ) : isLoading ? (
        <Spinner label="Loading members…" />
      ) : !data?.length ? (
        <Card><Empty title="No members found" body={debounced || status !== 'all' ? 'Try a different search or filter.' : 'Members you register in the mobile app appear here.'} /></Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Member ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link href={`/dashboard/members/${m.id}`} className="font-medium text-gray-900 hover:underline">
                        {m.firstName} {m.lastName}
                      </Link>
                      {m.isYouth && <span className="ml-2 rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-800">YOUTH</span>}
                      {m.tags?.includes(FOLLOW_UP_TAG) && <Flag className="ml-2 inline h-3.5 w-3.5 text-red-500" aria-label="Flagged for follow-up" />}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{m.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[m.status] ?? 'bg-gray-100 text-gray-700'}`}>{humanize(m.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.departmentName ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.memberId ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
            <span>
              {data.length >= 500 ? 'Showing the first 500 matches — search to narrow down.' : `${data.length} ${data.length === 1 ? 'person' : 'people'}`}
            </span>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                <span>Page {page} of {pages}</span>
                <button className={btnOutline} disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
                <button className={btnOutline} disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        </Card>
      )}

      {exporting && <ExportPanel initialStatus={status} onClose={() => setExporting(false)} />}
    </div>
  );
}
