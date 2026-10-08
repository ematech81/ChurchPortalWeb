'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Flag, Hammer, MessageCircle, Phone, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';
import { FOLLOW_UP_TAG, Member, apiError } from '@/lib/types';
import { useAuthStore } from '@/stores/auth.store';
import { Card, ErrorBox, PageHeader, Spinner, btnDanger, btnOutline, btnPrimary, fmtDate, humanize, inputCls } from '@/components/ui/bits';

const FLAG_REASONS = ['Backsliding', 'Missed several services', 'Needs counselling', 'Other'];

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-2.5 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value || '—'}</span>
    </div>
  );
}

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const role = useAuthStore((s) => s.user?.role) ?? '';
  const [flagOpen, setFlagOpen] = useState(false);
  const [workforceOpen, setWorkforceOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { data: m, isLoading, error: loadError } = useQuery({
    queryKey: ['member', id],
    queryFn: async () => (await api.get<Member>(`/members/${id}`)).data,
  });

  const flag = useMutation({
    mutationFn: async (v: { flag: boolean; reason?: string }) => (await api.post(`/members/${id}/follow-up-flag`, v)).data,
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['member', id] });
      qc.invalidateQueries({ queryKey: ['members'] });
      setFlagOpen(false);
      setMessage(v.flag ? 'Added to the follow-up queue.' : 'Removed from the follow-up queue.');
    },
    onError: (e) => setError(apiError(e)),
  });

  const youth = useMutation({
    mutationFn: async (isYouth: boolean) => (await api.patch(`/members/${id}`, { isYouth })).data,
    onSuccess: (_d, isYouth) => {
      qc.invalidateQueries({ queryKey: ['member', id] });
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['youth'] });
      setMessage(isYouth ? 'Added to the Youth page.' : 'Removed from the Youth page.');
    },
    onError: (e) => setError(apiError(e)),
  });

  if (isLoading) return <Spinner label="Loading member…" />;
  if (loadError || !m) return <ErrorBox message={apiError(loadError, 'Member not found.')} />;

  // Pastors and ministers are the shepherds: never flagged for follow-up or added to the workforce.
  const isShepherd = m.status === 'pastor' || m.status === 'minister' || ['pastor', 'branch_pastor'].includes(m.churchRole ?? '');
  const inactive = ['deceased', 'transferred'].includes(m.status);
  const canManage = ['senior_pastor', 'branch_pastor', 'admin_pastor', 'super_admin'].includes(role) && !isShepherd && !inactive;
  const flagged = m.tags?.includes(FOLLOW_UP_TAG);
  const reason = m.customFields?.followUp?.reason as string | undefined;
  const phoneDigits = m.phone.replace(/\D/g, '');

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard/members" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ChevronLeft className="h-4 w-4" /> All members
      </Link>

      {message && <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800">{message}</div>}
      {error && <div className="mb-4"><ErrorBox message={error} /></div>}

      <PageHeader
        title={[m.firstName, m.middleName, m.lastName].filter(Boolean).join(' ')}
        subtitle={[m.memberId, humanize(m.status), m.isYouth ? 'Youth' : ''].filter(Boolean).join(' · ')}
        actions={
          <>
            <a className={btnOutline} href={`tel:${m.phone}`}><Phone className="h-4 w-4" /> Call</a>
            <a className={btnOutline} href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
          </>
        }
      />

      {flagged && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">
          <Flag className="h-4 w-4" /> In the follow-up queue{reason ? ` · ${reason}` : ''}
        </div>
      )}

      {canManage && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={() => setWorkforceOpen(true)}>
            <Hammer className="h-4 w-4" /> {m.status === 'worker' ? 'Add to another department' : 'Add to workforce'}
          </button>
          <button className={btnOutline} disabled={youth.isPending} onClick={() => youth.mutate(!m.isYouth)}>
            <Sparkles className="h-4 w-4" /> {m.isYouth ? 'Remove from youth' : 'Mark as youth'}
          </button>
          {flagged ? (
            <button className={btnOutline} disabled={flag.isPending} onClick={() => { if (confirm(`Take ${m.firstName} out of the follow-up queue?`)) flag.mutate({ flag: false }); }}>
              <Flag className="h-4 w-4" /> Remove follow-up flag
            </button>
          ) : (
            <button className={btnDanger} onClick={() => setFlagOpen(true)}><Flag className="h-4 w-4" /> Flag for follow-up</button>
          )}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold text-gray-900">Personal</h2>
          <Row label="Phone" value={m.phone} />
          <Row label="Alternate phone" value={m.alternatePhone} />
          <Row label="Email" value={m.email} />
          <Row label="Gender" value={m.gender ? humanize(m.gender) : null} />
          <Row label="Date of birth" value={m.dateOfBirth ? fmtDate(m.dateOfBirth) : null} />
          <Row label="Marital status" value={m.maritalStatus ? humanize(m.maritalStatus) : null} />
          <Row label="Occupation" value={m.occupation} />
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold text-gray-900">Church</h2>
          <Row label="Status" value={humanize(m.status)} />
          <Row label="Church role" value={m.churchRole ? humanize(m.churchRole) : null} />
          <Row label="Department" value={m.departmentName} />
          <Row label="Department role" value={m.departmentRole} />
          <Row label="Date joined" value={m.membershipDate ? fmtDate(m.membershipDate) : null} />
          <Row label="Registered" value={fmtDate(m.createdAt)} />
        </Card>
        <Card className="md:col-span-2">
          <h2 className="mb-2 font-semibold text-gray-900">Address</h2>
          <Row label="Street" value={m.address} />
          <Row label="City" value={m.city} />
          <Row label="State" value={m.state} />
        </Card>
      </div>

      {flagOpen && (
        <Modal title="Flag for follow-up" onClose={() => setFlagOpen(false)}>
          <p className="mb-3 text-sm text-gray-500">Why does {m.firstName} need follow-up?</p>
          <div className="space-y-2">
            {FLAG_REASONS.map((r) => (
              <button key={r} className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm font-medium hover:bg-gray-50 disabled:opacity-50" disabled={flag.isPending} onClick={() => flag.mutate({ flag: true, reason: r })}>
                {r}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {workforceOpen && (
        <WorkforceModal
          member={m}
          onClose={() => setWorkforceOpen(false)}
          onDone={(groupName) => {
            setWorkforceOpen(false);
            setMessage(`${m.firstName} was added to ${groupName} and is now a worker.`);
            qc.invalidateQueries({ queryKey: ['member', id] });
            qc.invalidateQueries({ queryKey: ['members'] });
          }}
        />
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface Group { id: string; name: string; categoryId: string; status: string; isDraft: boolean; memberCount?: number }

function WorkforceModal({ member, onClose, onDone }: { member: Member; onClose: () => void; onDone: (groupName: string) => void }) {
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const groupsQ = useQuery({
    queryKey: ['groups-flat'],
    queryFn: async () => {
      const [g, c] = await Promise.all([
        api.get<Group[]>('/ministry-groups', { params: { flat: 'true' } }),
        api.get<{ id: string; name: string }[]>('/group-categories'),
      ]);
      return { groups: g.data, categories: new Map(c.data.map((x) => [x.id, x.name])) };
    },
  });

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (groupsQ.data?.groups ?? [])
      .filter((g) => !g.isDraft && g.status !== 'inactive' && g.status !== 'draft')
      .filter((g) => !q || g.name.toLowerCase().includes(q) || (groupsQ.data!.categories.get(g.categoryId) ?? '').toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [groupsQ.data, search]);

  async function join(g: Group) {
    if (!confirm(`Add ${member.firstName} to ${g.name}? They will be marked as a Worker.`)) return;
    setBusyId(g.id);
    setError('');
    try {
      await api.post(`/ministry-groups/${g.id}/workforce`, { memberId: member.id });
      onDone(g.name);
    } catch (e) {
      setError(apiError(e));
      setBusyId('');
    }
  }

  return (
    <Modal title="Add to workforce" onClose={onClose}>
      <p className="mb-3 text-sm text-gray-500">Choose the department or group {member.firstName} is joining.</p>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <input className={`${inputCls} mb-3`} placeholder="Search departments or groups…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
      {groupsQ.isLoading ? (
        <Spinner />
      ) : groupsQ.error ? (
        <ErrorBox message={apiError(groupsQ.error)} />
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-500">{search ? 'No match.' : 'No departments yet. Create one in the mobile app (Ministry Groups) first.'}</p>
      ) : (
        <ul className="max-h-80 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
          {shown.map((g) => (
            <li key={g.id}>
              <button className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50" disabled={!!busyId} onClick={() => join(g)}>
                <span>
                  <span className="block text-sm font-medium text-gray-900">{g.name}</span>
                  <span className="block text-xs text-gray-500">{groupsQ.data!.categories.get(g.categoryId) ?? 'Group'} · {g.memberCount ?? 0} members</span>
                </span>
                <span className="text-xs font-semibold text-yellow-700">{busyId === g.id ? 'Adding…' : 'Add'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
