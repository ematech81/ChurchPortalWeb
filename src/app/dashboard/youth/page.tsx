'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cake, Download, Flag, MessageCircle, Plus, Search, UserPlus, Users, X } from 'lucide-react';
import { api } from '@/lib/api';
import { FOLLOW_UP_TAG, Member, apiError } from '@/lib/types';
import { useAuthStore } from '@/stores/auth.store';
import { ExportPanel } from '@/components/members/ExportPanel';
import { Card, Empty, ErrorBox, PageHeader, Spinner, btnOutline, btnPrimary, humanize, inputCls } from '@/components/ui/bits';

interface Birthday { id: string; firstName: string; lastName: string; phone: string; month: number; day: number; inDays: number }
interface Summary {
  total: number; male: number; female: number; flagged: number; newThisMonth: number; smsOptedOut: number;
  upcomingBirthdays: Birthday[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const when = (b: Birthday) => (b.inDays === 0 ? 'Today 🎂' : b.inDays === 1 ? 'Tomorrow' : `in ${b.inDays} days`);

function Stat({ label, value, tone = 'text-gray-900' }: { label: string; value: number | string; tone?: string }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </Card>
  );
}

/** Pick existing members (who are not yet youth) and mark them as youth in one go. */
function AddYouthModal({ scope, onClose, onDone }: { scope?: string; onClose: () => void; onDone: (n: number) => void }) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['members-picker', debounced, scope],
    queryFn: async () => (await api.get<Member[]>('/members', { params: { search: debounced || undefined, limit: 200, scope } })).data,
  });
  const candidates = useMemo(() => (data ?? []).filter((m) => !m.isYouth && !['deceased', 'transferred'].includes(m.status)), [data]);

  const save = useMutation({
    mutationFn: async () => (await api.post<{ updated: number }>('/members/youth/bulk', { memberIds: [...picked], isYouth: true })).data,
    onSuccess: (r) => onDone(r.updated),
    onError: (e) => setError(apiError(e)),
  });

  const toggle = (id: string) =>
    setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Add existing members to Youth</h2>
          <button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-gray-500" /></button>
        </div>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className={`${inputCls} pl-9`} placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {error && <div className="mb-3"><ErrorBox message={error} /></div>}
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-gray-100">
          {isLoading ? <Spinner label="Loading…" /> : !candidates.length ? (
            <p className="p-6 text-center text-sm text-gray-500">No matching members who are not already in Youth.</p>
          ) : candidates.map((m) => (
            <label key={m.id} className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-sm last:border-0 hover:bg-gray-50">
              <input type="checkbox" className="h-4 w-4 accent-yellow-500" checked={picked.has(m.id)} onChange={() => toggle(m.id)} />
              <span className="flex-1 font-medium text-gray-900">{m.firstName} {m.lastName}</span>
              <span className="text-gray-500">{m.phone}</span>
            </label>
          ))}
        </div>
        <button className={`${btnPrimary} mt-4 w-full justify-center`} disabled={!picked.size || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : `Add ${picked.size || ''} to Youth`.replace('  ', ' ')}
        </button>
      </div>
    </div>
  );
}

export default function YouthPage() {
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role) ?? '';
  const isSenior = role === 'senior_pastor' || role === 'super_admin';
  const canEdit = ['senior_pastor', 'branch_pastor', 'admin_pastor', 'super_admin'].includes(role);
  const scope = isSenior ? 'all' : undefined;

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const summary = useQuery({
    queryKey: ['youth', 'summary', scope],
    queryFn: async () => (await api.get<Summary>('/members/youth/summary', { params: { scope } })).data,
  });
  const list = useQuery({
    queryKey: ['youth', 'list', debounced, scope],
    queryFn: async () => (await api.get<Member[]>('/members', { params: { youth: 'true', search: debounced || undefined, limit: 500, scope } })).data,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => (await api.post('/members/youth/bulk', { memberIds: [id], isYouth: false })).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['youth'] }); qc.invalidateQueries({ queryKey: ['members'] }); setNotice('Removed from the Youth page (they are still a member).'); },
    onError: (e) => setNotice(apiError(e)),
  });

  const rows = useMemo(
    () => (list.data ?? []).filter((m) => !flaggedOnly || m.tags?.includes(FOLLOW_UP_TAG)),
    [list.data, flaggedOnly],
  );
  const s = summary.data;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Youth"
        subtitle={s ? `${s.total.toLocaleString()} young ${s.total === 1 ? 'person' : 'people'}${isSenior ? ' across all branches' : ''}` : undefined}
        actions={
          <>
            <Link href="/dashboard/events/new" className={btnOutline}><Plus className="h-4 w-4" /> Add event</Link>
            <button className={btnOutline} onClick={() => setExporting(true)}><Download className="h-4 w-4" /> Export</button>
            {canEdit && <button className={btnPrimary} onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" /> Add members</button>}
          </>
        }
      />

      {notice && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800">{notice}</div>}

      {summary.error ? <ErrorBox message={apiError(summary.error, 'Could not load the youth summary.')} /> : s && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="Total youth" value={s.total} />
            <Stat label="Female" value={s.female} />
            <Stat label="Male" value={s.male} />
            <Stat label="New this month" value={s.newThisMonth} tone="text-green-700" />
            <Stat label="Need follow-up" value={s.flagged} tone={s.flagged ? 'text-red-600' : 'text-gray-900'} />
          </div>

          <Card className="mb-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900"><Cake className="h-4 w-4 text-fuchsia-600" /> Birthdays in the next 30 days</h2>
            {!s.upcomingBirthdays.length ? (
              <p className="text-sm text-gray-500">None coming up. Only youths with a birth date (day and month) appear here.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {s.upcomingBirthdays.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/dashboard/members/${b.id}`} className="font-medium text-gray-900 hover:underline">{b.firstName} {b.lastName}</Link>
                    <span className="flex items-center gap-3 text-gray-600">
                      {b.day} {MONTHS[b.month - 1]} · {when(b)}
                      <a
                        className="text-green-700 hover:underline"
                        aria-label={`Send ${b.firstName} a WhatsApp birthday wish`}
                        target="_blank"
                        rel="noreferrer"
                        href={`https://wa.me/${b.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Happy birthday ${b.firstName}! 🎉 We celebrate you today. God bless you.`)}`}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className={`${inputCls} pl-9`} placeholder="Search youth by name, phone or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setFlaggedOnly((v) => !v)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${flaggedOnly ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          <Flag className="mr-1 inline h-3.5 w-3.5" /> Needs follow-up
        </button>
      </div>

      {list.error ? (
        <ErrorBox message={apiError(list.error, 'Could not load the youth list.')} />
      ) : list.isLoading ? (
        <Spinner label="Loading youth…" />
      ) : !rows.length ? (
        <Card>
          <Empty
            title="No youth here yet"
            body={debounced || flaggedOnly ? 'Try a different search.' : 'Turn on “Is a Youth” when registering a member, or add existing members with the button above.'}
            action={canEdit && !debounced && !flaggedOnly ? <button className={btnPrimary} onClick={() => setAdding(true)}>Add members</button> : undefined}
          />
        </Card>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Status</th><th className="px-4 py-3">Department</th><th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link href={`/dashboard/members/${m.id}`} className="font-medium text-gray-900 hover:underline">{m.firstName} {m.lastName}</Link>
                      {m.tags?.includes(FOLLOW_UP_TAG) && <Flag className="ml-2 inline h-3.5 w-3.5 text-red-500" aria-label="Flagged for follow-up" />}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{m.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{m.gender ? humanize(m.gender) : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{humanize(m.status)}</td>
                    <td className="px-4 py-3 text-gray-600">{m.departmentName ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && (
                        <button
                          className="text-xs text-gray-400 hover:text-red-600"
                          disabled={remove.isPending}
                          onClick={() => { if (confirm(`Remove ${m.firstName} from the Youth page? They stay in the members list.`)) remove.mutate(m.id); }}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
            <Users className="h-4 w-4" /> {rows.length} {rows.length === 1 ? 'person' : 'people'}
          </div>
        </Card>
      )}

      {adding && (
        <AddYouthModal
          scope={scope}
          onClose={() => setAdding(false)}
          onDone={(n) => {
            setAdding(false);
            setNotice(`${n} ${n === 1 ? 'person' : 'people'} added to Youth.`);
            qc.invalidateQueries({ queryKey: ['youth'] });
            qc.invalidateQueries({ queryKey: ['members'] });
          }}
        />
      )}
      {exporting && <ExportPanel initialYouthOnly onClose={() => setExporting(false)} />}
    </div>
  );
}
