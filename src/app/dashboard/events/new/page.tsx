'use client';

import { EventBuilder } from '@/components/events/EventBuilder';
import { PageHeader } from '@/components/ui/bits';

export default function NewEventPage() {
  return (
    <div>
      <PageHeader title="New event" subtitle="Set it up once, then share the link it gives you." />
      <EventBuilder />
    </div>
  );
}
