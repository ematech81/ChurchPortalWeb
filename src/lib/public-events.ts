// Server + browser helpers for the public (no-login) event registration pages.

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://churchportalbackend-production.up.railway.app/v1';

export type FieldType =
  | 'short_text' | 'long_text' | 'phone' | 'email' | 'number'
  | 'dropdown' | 'radio' | 'checkbox' | 'date' | 'yes_no';

export interface PublicField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  options?: string[];
  helpText?: string;
}

export interface PublicEvent {
  slug: string;
  title: string;
  description: string | null;
  startsAt: string | null;
  venue: string | null;
  registrationClosesAt: string | null;
  churchName: string | null;
  fields: PublicField[];
  status: 'open' | 'closed' | 'full' | 'scheduled';
  spotsLeft: number | null;
}

/** Server-side fetch (never cached: status and spots change by the minute). Returns null if the link is not valid. */
export async function fetchPublicEvent(slug: string): Promise<PublicEvent | null> {
  try {
    const res = await fetch(`${API_URL}/public/events/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as PublicEvent;
  } catch {
    return null;
  }
}

export function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
