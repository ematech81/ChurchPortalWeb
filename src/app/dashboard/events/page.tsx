'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { EventSummary, apiError } from '@/lib/types';
import { Card, Empty, ErrorBox, PageHeader, Spinner, StatusPill, btnPrimary, fmtDate, inputCls } from '@/components/ui/bits';

/** One place for every event registration: recent events first, search to find any other. */
export default function EventsPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['events', debounced],
    queryFn: async () => (await api.get<EventSummary[]>('/event-forms', { params: { search: debounced || undefined, limit: 100 } })).data,
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Event Registration"
        subtitle="Crusades, conferences and programmes. Share one link, collect sign-ups, download the list."
        actions={<Link href="/dashboard/events/new" className={btnPrimary}><Plus className="h-4 w-4" /> Add event</Link>}
      />

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input className={`${inputCls} pl-9`} placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error ? (
        <ErrorBox message={apiError(error, 'Could not load events.')} />
      ) : isLoading ? (
        <Spinner label="Loading events…" />
      ) : !data?.length ? (
        <Card>
          <Empty
            title={debounced ? 'No event found' : 'No events yet'}
            body={debounced ? 'Try a different name.' : 'Create an event to get a link people can use to register.'}
            action={!debounced && <Link href="/dashboard/events/new" className={btnPrimary}>Create an event</Link>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{debounced ? 'Results' : 'Recent events'}</p>
          {data.map((ev) => (
            <Link key={ev.id} href={`/dashboard/events/${ev.id}`} className="block rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900">{ev.title}</h2>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{ev.startsAt ? fmtDate(ev.startsAt) : 'Date not set'}</span>
                    {ev.venue && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ev.venue}</span>}
                    {ev.churchName && <span className="italic text-gray-400">{ev.churchName}</span>}
                  </p>
                </div>
                <div className="text-right">
                  <StatusPill status={ev.status} />
                  <p className="mt-2 text-xl font-bold text-gray-900">
                    {ev.registrationCount}
                    <span className="text-xs font-medium text-gray-500">{ev.capacity ? ` / ${ev.capacity}` : ''} registered</span>
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
