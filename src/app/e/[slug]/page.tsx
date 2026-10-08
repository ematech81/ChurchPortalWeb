import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { fetchPublicEvent, formatWhen } from '@/lib/public-events';
import { RegisterForm } from './RegisterForm';

// Always render on request: spots left and open/closed change constantly.
export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

// This is what WhatsApp / Facebook show when the link is pasted into a chat.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ev = await fetchPublicEvent(params.slug);
  if (!ev) return { title: 'Event not found', robots: { index: false } };
  const bits = [ev.churchName, formatWhen(ev.startsAt), ev.venue].filter(Boolean).join(' · ');
  return {
    title: `Register: ${ev.title}`,
    description: bits || 'Register for this event',
    robots: { index: false, follow: false }, // registration links are for people who were sent them
    openGraph: { title: ev.title, description: bits || 'Register for this event', type: 'website' },
  };
}

export default async function PublicEventPage({ params }: Props) {
  const ev = await fetchPublicEvent(params.slug);
  if (!ev) notFound();

  const when = formatWhen(ev.startsAt);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-8">
      <div className="mx-auto w-full max-w-lg">
        <header className="text-center text-white">
          {ev.churchName && <p className="text-xs uppercase tracking-widest text-yellow-400">{ev.churchName}</p>}
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{ev.title}</h1>
        </header>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-xl sm:p-7">
          <ul className="space-y-2 text-sm text-slate-600">
            {when && (
              <li className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{when}</li>
            )}
            {ev.venue && (
              <li className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />{ev.venue}</li>
            )}
            {ev.spotsLeft !== null && ev.status === 'open' && (
              <li className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                {ev.spotsLeft} {ev.spotsLeft === 1 ? 'spot' : 'spots'} left
              </li>
            )}
          </ul>
          {ev.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">{ev.description}</p>}

          <hr className="my-5 border-slate-100" />

          {ev.status === 'open' ? (
            <RegisterForm slug={ev.slug} fields={ev.fields} />
          ) : (
            <div className="rounded-xl bg-slate-50 p-5 text-center">
              <p className="font-semibold text-slate-800">
                {ev.status === 'full' ? 'This event is full' : 'Registration is closed'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {ev.status === 'full'
                  ? 'All the spots have been taken. Please contact the church office.'
                  : 'Registration for this event is no longer open. Please contact the church office.'}
              </p>
            </div>
          )}
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          Your details are shared only with the church organising this event.
        </p>
      </div>
    </main>
  );
}
