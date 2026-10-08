'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Info, Lock, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { CHOICE_TYPES, EventSummary, FIELD_TYPE_LABELS, FieldType, apiError } from '@/lib/types';
import { Card, ErrorBox, btnOutline, btnPrimary, inputCls } from '@/components/ui/bits';

interface Draft {
  key: string;
  id?: string; // server id: kept when editing so earlier answers stay attached
  type: FieldType;
  label: string;
  required: boolean;
  optionsText: string; // one option per line
}

let seq = 0;
const key = () => `k${++seq}`;
const blank = (type: FieldType, label = '', required = false): Draft => ({ key: key(), type, label, required, optionsText: '' });

/** Sensible starting questions. Full name and phone are always asked, so they are not listed. */
const starter = (): Draft[] => [
  blank('short_text', 'Church / Branch', true),
  { ...blank('dropdown', 'Gender', true), optionsText: 'Male\nFemale' },
  blank('email', 'Email address'),
];

const parseOptions = (t: string) => [...new Set(t.split(/[\n,]/).map((o) => o.trim()).filter(Boolean))];

/** ISO → value for <input type="datetime-local"> (local time). */
const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** Create a new event, or edit an existing one when `event` is given. */
export function EventBuilder({ event }: { event?: EventSummary }) {
  const router = useRouter();
  const editing = !!event;
  const hasAnswers = (event?.registrationCount ?? 0) > 0;

  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [venue, setVenue] = useState(event?.venue ?? '');
  const [startsAt, setStartsAt] = useState(toLocalInput(event?.startsAt ?? null));
  const [closesAt, setClosesAt] = useState(toLocalInput(event?.registrationClosesAt ?? null));
  const [capacity, setCapacity] = useState(event?.capacity ? String(event.capacity) : '');
  const [uniquePhone, setUniquePhone] = useState(event?.uniquePhone ?? true);
  const [confirmation, setConfirmation] = useState(event?.confirmationMessage ?? '');
  const [fields, setFields] = useState<Draft[]>(
    event
      ? event.fields.map((f) => ({ key: key(), id: f.id, type: f.type, label: f.label, required: f.required, optionsText: (f.options ?? []).join('\n') }))
      : starter(),
  );
  const [addType, setAddType] = useState<FieldType>('short_text');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const patch = (k: string, p: Partial<Draft>) => setFields((fs) => fs.map((f) => (f.key === k ? { ...f, ...p } : f)));
  const move = (k: string, dir: -1 | 1) =>
    setFields((fs) => {
      const i = fs.findIndex((f) => f.key === k);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= fs.length) return fs;
      const c = [...fs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  function validate(): string | null {
    if (title.trim().length < 2) return 'Give the event a name.';
    if (capacity && (!/^\d+$/.test(capacity) || Number(capacity) < 1)) return 'Capacity must be a whole number, or leave it empty for no limit.';
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f.label.trim()) return `Question ${i + 1} needs some text.`;
      if (CHOICE_TYPES.includes(f.type) && parseOptions(f.optionsText).length < 1) return `"${f.label}" needs at least one option.`;
    }
    return null;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) { setError(problem); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setSaving(true);
    setError('');
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || null,
        venue: venue.trim() || null,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        registrationClosesAt: closesAt ? new Date(closesAt).toISOString() : null,
        capacity: capacity ? Number(capacity) : null,
        uniquePhone,
        confirmationMessage: confirmation.trim() || null,
        fields: fields.map((f) => ({
          ...(f.id ? { id: f.id } : {}),
          type: f.type,
          label: f.label.trim(),
          required: f.required,
          ...(CHOICE_TYPES.includes(f.type) ? { options: parseOptions(f.optionsText) } : {}),
        })),
      };
      const res = editing ? await api.patch(`/event-forms/${event!.id}`, body) : await api.post('/event-forms', body);
      router.push(`/dashboard/events/${res.data.id}${editing ? '' : '?created=1'}`);
    } catch (err) {
      setError(apiError(err));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setSaving(false);
    }
  }

  const label = 'mb-1.5 block text-sm font-medium text-slate-800';

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-5">
      {error && <ErrorBox message={error} />}

      <Card>
        <h2 className="mb-4 font-semibold text-gray-900">Event details</h2>
        <div className="space-y-4">
          <div>
            <label className={label}>Event name *</label>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} placeholder="e.g. Redeemed Crusade 2026" />
          </div>
          <div>
            <label className={label}>Description</label>
            <textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={3000} placeholder="What is this event about?" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Venue</label>
              <input className={inputCls} value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={250} placeholder="Where will it hold?" />
            </div>
            <div>
              <label className={label}>Date &amp; time of the event</label>
              <input className={inputCls} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-gray-900">Registration rules</h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Registration closes (optional)</label>
              <input className={inputCls} type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
            </div>
            <div>
              <label className={label}>Maximum people (optional)</label>
              <input className={inputCls} inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))} placeholder="No limit" maxLength={7} />
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-1 h-4 w-4 accent-yellow-500" checked={uniquePhone} onChange={(e) => setUniquePhone(e.target.checked)} />
            <span>
              <span className="block text-sm font-medium text-slate-800">One registration per phone number</span>
              <span className="block text-xs text-gray-500">Stops the same person registering twice. Turn off if families share a phone.</span>
            </span>
          </label>
          <div>
            <label className={label}>&quot;Thank you&quot; message</label>
            <textarea className={inputCls} rows={2} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} maxLength={1000} placeholder="Shown after someone registers, e.g. See you at the arena!" />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 font-semibold text-gray-900">Registration form</h2>
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0" /> Full name and phone number are always asked. Add any other questions you need.
        </p>
        {hasAnswers && (
          <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" /> People have already registered, so existing questions can be renamed but not removed or changed to another type.
          </p>
        )}

        <div className="space-y-4">
          {fields.map((f, i) => {
            const locked = hasAnswers && !!f.id;
            return (
              <div key={f.key} className="rounded-xl border border-gray-200 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="rounded-md bg-yellow-50 px-2 py-1 text-xs font-semibold text-slate-800">{FIELD_TYPE_LABELS[f.type]}</span>
                  <div className="flex gap-1">
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(f.key, -1)} className="rounded-md p-1.5 hover:bg-gray-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" aria-label="Move down" disabled={i === fields.length - 1} onClick={() => move(f.key, 1)} className="rounded-md p-1.5 hover:bg-gray-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                    {!locked && (
                      <button type="button" aria-label="Remove question" onClick={() => setFields((fs) => fs.filter((x) => x.key !== f.key))} className="rounded-md p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>
                </div>
                <input className={inputCls} value={f.label} onChange={(e) => patch(f.key, { label: e.target.value })} maxLength={200} placeholder="Question" />
                {CHOICE_TYPES.includes(f.type) && (
                  <textarea className={`${inputCls} mt-2`} rows={4} value={f.optionsText} onChange={(e) => patch(f.key, { optionsText: e.target.value })} placeholder={'One option per line\nMale\nFemale'} />
                )}
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" className="h-4 w-4 accent-yellow-500" checked={f.required} onChange={(e) => patch(f.key, { required: e.target.checked })} />
                  Required
                </label>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select className={`${inputCls} max-w-xs`} value={addType} onChange={(e) => setAddType(e.target.value as FieldType)}>
            {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>)}
          </select>
          <button type="button" className={btnOutline} onClick={() => setFields((fs) => [...fs, blank(addType)])}>
            <Plus className="h-4 w-4" /> Add question
          </button>
        </div>
      </Card>

      <div className="flex justify-end gap-2">
        <button type="button" className={btnOutline} onClick={() => router.back()} disabled={saving}>Cancel</button>
        <button type="submit" className={btnPrimary} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create event'}</button>
      </div>
    </form>
  );
}
