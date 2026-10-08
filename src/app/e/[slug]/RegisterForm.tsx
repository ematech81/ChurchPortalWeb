'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { API_URL, PublicField } from '@/lib/public-events';

type Answers = Record<string, string | string[]>;

const input =
  'w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-yellow-400';

function Label({ text, required, help }: { text: string; required?: boolean; help?: string }) {
  return (
    <div className="mb-1.5">
      <label className="block text-sm font-medium text-slate-800">
        {text} {required && <span className="text-red-500">*</span>}
      </label>
      {help && <p className="text-xs text-slate-500">{help}</p>}
    </div>
  );
}

export function RegisterForm({ slug, fields }: { slug: string; fields: PublicField[] }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [honeypot, setHoneypot] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ ticketCode: string; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (id: string, v: string | string[]) => setAnswers((a) => ({ ...a, [id]: v }));

  function clientCheck(): string[] {
    const problems: string[] = [];
    if (fullName.trim().length < 2) problems.push('Please enter your full name.');
    if (phone.replace(/\D/g, '').length < 7) problems.push('Please enter a valid phone number.');
    for (const f of fields) {
      const v = answers[f.id];
      const empty = v === undefined || v === '' || (Array.isArray(v) && v.length === 0);
      if (f.required && empty) problems.push(`"${f.label}" is required.`);
    }
    return problems;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const problems = clientCheck();
    if (problems.length) { setErrors(problems); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    setSubmitting(true);
    setErrors([]);
    try {
      const clean: Answers = {};
      for (const [k, v] of Object.entries(answers)) {
        if (v !== '' && !(Array.isArray(v) && v.length === 0)) clean[k] = v;
      }
      const res = await fetch(`${API_URL}/public/events/${encodeURIComponent(slug)}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), phone: phone.trim(), answers: clean, website: honeypot }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone({ ticketCode: body.ticketCode, message: body.message });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (res.status === 429) setErrors(['Too many attempts. Please wait a minute and try again.']);
      else setErrors(Array.isArray(body.message) ? body.message : [body.message ?? 'Something went wrong. Please try again.']);
    } catch {
      setErrors(['Could not reach the server. Check your internet connection and try again.']);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
        <h2 className="mt-3 text-xl font-bold text-slate-900">You&apos;re registered!</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{done.message}</p>
        <div className="mt-5 rounded-xl bg-slate-900 p-5">
          <p className="text-xs uppercase tracking-widest text-slate-400">Your ticket code</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-yellow-400">{done.ticketCode}</p>
        </div>
        <p className="mt-3 text-xs text-slate-500">Take a screenshot or note this code down — you may be asked for it at the event.</p>
        <button
          type="button"
          className="mt-3 text-sm font-medium text-yellow-700 underline"
          onClick={() => { navigator.clipboard?.writeText(done.ticketCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        >
          {copied ? 'Copied ✓' : 'Copy code'}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {errors.length > 0 && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <ul className="list-inside list-disc space-y-0.5">{errors.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>
      )}

      <div>
        <Label text="Full name" required />
        <input className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" maxLength={120} placeholder="Your full name" />
      </div>
      <div>
        <Label text="Phone number" required />
        <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="0803 123 4567" />
      </div>

      {fields.map((f) => (
        <div key={f.id}>
          <Label text={f.label} required={f.required} help={f.helpText} />
          {f.type === 'long_text' ? (
            <textarea className={input} rows={4} maxLength={3000} value={(answers[f.id] as string) ?? ''} onChange={(e) => set(f.id, e.target.value)} />
          ) : f.type === 'dropdown' ? (
            <select className={input} value={(answers[f.id] as string) ?? ''} onChange={(e) => set(f.id, e.target.value)}>
              <option value="">Select…</option>
              {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.type === 'radio' || f.type === 'yes_no' ? (
            <div className="space-y-2">
              {(f.type === 'yes_no' ? [['yes', 'Yes'], ['no', 'No']] : (f.options ?? []).map((o) => [o, o])).map(([value, label]) => (
                <label key={value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm has-[:checked]:border-yellow-400 has-[:checked]:bg-yellow-50">
                  <input type="radio" name={f.id} className="h-4 w-4 accent-yellow-500" checked={answers[f.id] === value} onChange={() => set(f.id, value)} />
                  {label}
                </label>
              ))}
            </div>
          ) : f.type === 'checkbox' ? (
            <div className="space-y-2">
              {f.options?.map((o) => {
                const list = (answers[f.id] as string[]) ?? [];
                return (
                  <label key={o} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm has-[:checked]:border-yellow-400 has-[:checked]:bg-yellow-50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-yellow-500"
                      checked={list.includes(o)}
                      onChange={(e) => set(f.id, e.target.checked ? [...list, o] : list.filter((x) => x !== o))}
                    />
                    {o}
                  </label>
                );
              })}
            </div>
          ) : (
            <input
              className={input}
              value={(answers[f.id] as string) ?? ''}
              onChange={(e) => set(f.id, e.target.value)}
              type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
              inputMode={f.type === 'number' ? 'decimal' : f.type === 'phone' ? 'tel' : undefined}
              maxLength={f.type === 'short_text' ? 500 : undefined}
            />
          )}
        </div>
      ))}

      {/* Honeypot: invisible to people, irresistible to bots. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>Website <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-400 py-3 font-semibold text-slate-900 transition-colors hover:bg-yellow-500 disabled:opacity-60"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? 'Registering…' : 'Register'}
      </button>
    </form>
  );
}
