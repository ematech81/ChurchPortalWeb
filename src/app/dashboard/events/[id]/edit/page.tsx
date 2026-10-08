'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EventSummary, apiError } from '@/lib/types';
import { EventBuilder } from '@/components/events/EventBuilder';
import { ErrorBox, PageHeader, Spinner } from '@/components/ui/bits';

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => (await api.get<EventSummary>(`/event-forms/${id}`)).data,
  });

  if (isLoading) return <Spinner label="Loading…" />;
  if (error || !data) return <ErrorBox message={apiError(error, 'Event not found.')} />;
  return (
    <div>
      <PageHeader title="Edit event" subtitle="The registration link stays the same when you save changes." />
      <EventBuilder event={data} />
    </div>
  );
}
