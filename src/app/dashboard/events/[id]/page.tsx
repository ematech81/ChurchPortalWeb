'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Copy, Download, ExternalLink, MapPin,
  Pencil, Pause, Play, Search, Share2, Trash2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { downloadFile } from '@/lib/download';
import { EventSummary, FormField, Registration, apiError } from '@/lib/types';
import {
  Card, ErrorBox, PageHeader, Spinner, StatusPill, btnDanger, btnOutline, btnPrimary, fmtDateTime, inputCls,
} from '@/components/ui/bits';

const PAGE_SIZE = 25;

function answerText(f: FormField, v: unknown): string {
  if (v === undefined || v === null || v === '') return '—';
  if (Array.isArray(v)) return v.join(', ');
  if (f.type === 'yes_no') return v === 'yes' ? 'Yes' : 'No';
  return String(v);
}

export default function EventDetailPage() {
  // useSearchParams needs a Suspense boundary in the App Router
  return (
    <Suspense fallback={<Spinner />}>
      <EventDetail />
    </Suspense>
  );
}

function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const justCreated = useSearchParams().get('created') === '1';

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const eventQ = useQuery({
    queryKey: ['event', id],
    queryFn: async () => (await api.get<EventSummary>(`/event-forms/${id}`)).data,
  });
  const regsQ = useQuery({
    queryKey: ['registrations', id, debounced, page],
    queryFn: async () =>
      (await api.get<{ items: Registration[]; total: number; page: number; limit: number }>(`/event-forms/${id}/registrations`, {
        params: { search: debounced || undefined, page, limit: PAGE_SIZE },
      })).data,
    placeholderData: keepPreviousData,
  });

  const toggleOpen = useMutation({
    mutationFn: async (isOpen: boolean) => (await api.patch(`/event-forms/${id}`, { isOpen })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event', id] }),
    onError: (e) => setError(apiError(e)),
  });
  const removeReg = useMutation({
    mutationFn: async (regId: string) => api.delete(`/event-forms/${id}/registrations/${regId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['registrations', id] });
      qc.invalidateQueries({ queryKey: ['event', id] });
    },
    onError: (e) => setError(apiError(e)),
  });

  const ev = eventQ.data;
  if (eventQ.isLoading) return <Spinner label="Loading event…" />;
  if (eventQ.error || !ev) return <ErrorBox message={apiError(eventQ.error, 'Event not found.')} />;

  const link = ev.shareUrl;
  const regs = regsQ.data;
  const totalPages = regs ? Math.max(Math.ceil(regs.total / PAGE_SIZE), 1) : 1;
  const spotsLeft = ev.capacity ? Math.max(ev.capacity - ev.registrationCount, 0) : null;

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function exportFile(format: 'xlsx' | 'csv') {
    setBusy(format);
    setError('');
    try {
      const { data } = await api.post(`/event-forms/${id}/export`, { format });
      if (!data.count) setError('No one has registered yet, so there is nothing to export.');
      else downloadFile(data);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy('');
    }
  }

  async function deleteEvent() {
    if (!confirm('Delete this event? The registration link will stop working.')) return;
    try {
      await api.delete(`/event-forms/${id}`);
      qc.invalidateQueries({ queryKey: ['events'] });
      router.replace('/dashboard/events');
    } catch (e) {
      setError(apiError(e));
    }
  }

  const whatsappHref = link
    ? `https://wa.me/?text=${encodeURIComponent(`Register for ${ev.title}${ev.startsAt ? ` (${new Date(ev.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })})` : ''}:\n${link}`)}`
    : null;

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/dashboard/events" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ChevronLeft className="h-4 w-4" /> All events
      </Link>

      {justCreated && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800">
          <CheckCircle2 className="h-5 w-5" /> Event created. Share the link below so people can register.
        </div>
      )}
      {error && <div className="mb-4"><ErrorBox message={error} /></div>}

      <PageHeader
        title={ev.title}
        subtitle={ev.churchName ?? undefined}
        actions={
          <>
            <button className={btnOutline} onClick={() => toggleOpen.mutate(!ev.isOpen)} disabled={toggleOpen.isPending}>
              {ev.isOpen ? <><Pause className="h-4 w-4" /> Close registration</> : <><Play className="h-4 w-4" /> Reopen registration</>}
            </button>
            <Link href={`/dashboard/events/${id}/edit`} className={btnOutline}><Pencil className="h-4 w-4" /> Edit</Link>
            <button className={btnDanger} onClick={deleteEvent}><Trash2 className="h-4 w-4" /> Delete</button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-3"><StatusPill status={ev.status} /></div>
          <ul className="space-y-1.5 text-sm text-gray-600">
            <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gray-400" />{ev.startsAt ? fmtDateTime(ev.startsAt) : 'Date not set'}</li>
            {ev.venue && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gray-400" />{ev.venue}</li>}
            {ev.registrationClosesAt && <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-400" />Registration closes {fmtDateTime(ev.registrationClosesAt)}</li>}
          </ul>
          {ev.description && <p className="mt-3 whitespace-pre-line text-sm text-gray-700">{ev.description}</p>}
        </Card>
        <Card>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-gray-50 py-4"><p className="text-3xl font-bold text-gray-900">{ev.registrationCount}</p><p className="text-xs text-gray-500">registered</p></div>
            <div className="rounded-lg bg-gray-50 py-4"><p className="text-3xl font-bold text-gray-900">{spotsLeft ?? '∞'}</p><p className="text-xs text-gray-500">spots left</p></div>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <h2 className="mb-3 font-semibold text-gray-900">Shareable registration link</h2>
        {link ? (
          <>
            <div className="flex flex-wrap gap-2">
              <input readOnly value={link} onFocus={(e) => e.target.select()} className={`${inputCls} min-w-0 flex-1 bg-gray-50`} />
              <button className={btnPrimary} onClick={copyLink}><Copy className="h-4 w-4" /> {copied ? 'Copied ✓' : 'Copy'}</button>
              {whatsappHref && <a className={btnOutline} href={whatsappHref} target="_blank" rel="noreferrer"><Share2 className="h-4 w-4" /> WhatsApp</a>}
              <a className={btnOutline} href={link} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Open</a>
            </div>
            <p className="mt-2 text-xs text-gray-500">Anyone with this link can register. It needs no login and works on any phone.</p>
          </>
        ) : (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            The link is not available yet: the server&apos;s PUBLIC_WEB_URL setting has not been configured.
          </p>
        )}
      </Card>

      <Card className="mt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">Responses ({regs?.total ?? ev.registrationCount})</h2>
          <div className="flex flex-wrap gap-2">
            <button className={btnOutline} onClick={() => exportFile('xlsx')} disabled={!!busy}><Download className="h-4 w-4" /> {busy === 'xlsx' ? 'Preparing…' : 'Excel'}</button>
            <button className={btnOutline} onClick={() => exportFile('csv')} disabled={!!busy}><Download className="h-4 w-4" /> {busy === 'csv' ? 'Preparing…' : 'CSV'}</button>
          </div>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input className={`${inputCls} pl-9`} placeholder="Search name, phone or ticket…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {regsQ.error ? (
          <ErrorBox message={apiError(regsQ.error)} />
        ) : !regs ? (
          <Spinner />
        ) : regs.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            {debounced ? 'No match.' : 'No registrations yet. Share the link above and people will appear here as they register.'}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5">Phone</th>
                    <th className="px-3 py-2.5">Ticket</th>
                    <th className="px-3 py-2.5">Registered</th>
                    {ev.fields.map((f) => <th key={f.id} className="whitespace-nowrap px-3 py-2.5">{f.label}</th>)}
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {regs.items.map((r, i) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-gray-400">{(regs.page - 1) * PAGE_SIZE + i + 1}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium text-gray-900">{r.fullName}</td>
                      <td className="whitespace-nowrap px-3 py-2.5">{r.phone}</td>
                      <td className="px-3 py-2.5 font-mono text-xs tracking-wider">{r.ticketCode}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-gray-500">{fmtDateTime(r.createdAt)}</td>
                      {ev.fields.map((f) => <td key={f.id} className="max-w-xs px-3 py-2.5 text-gray-700">{answerText(f, r.answers?.[f.id])}</td>)}
                      <td className="px-3 py-2.5 text-right">
                        <button
                          aria-label={`Remove ${r.fullName}`}
                          className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                          onClick={() => { if (confirm(`Remove ${r.fullName}? They will be able to register again.`)) removeReg.mutate(r.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                <span>Page {regs.page} of {totalPages}</span>
                <div className="flex gap-2">
                  <button className={btnOutline} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Previous</button>
                  <button className={btnOutline} disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
