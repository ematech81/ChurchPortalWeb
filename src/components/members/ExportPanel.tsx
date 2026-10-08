'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, X } from 'lucide-react';
import { api } from '@/lib/api';
import { downloadFile } from '@/lib/download';
import { apiError } from '@/lib/types';
import { useAuthStore } from '@/stores/auth.store';
import { ErrorBox, btnOutline, btnPrimary, inputCls } from '@/components/ui/bits';

const STATUS_OPTIONS = [
  ['all', 'Everyone'], ['worker', 'Workers'], ['first_timer', 'First timers'], ['new_convert', 'New converts'],
  ['member', 'Members'], ['visitor', 'Visitors'], ['backslidden', 'Backslidden'], ['minister', 'Ministers'], ['pastor', 'Pastors'],
] as const;

const DETAIL_OPTIONS = [
  ['numbers', 'Numbers only', 'One column of phone numbers'],
  ['name_number', 'Names and numbers', 'Name + phone'],
  ['full', 'Full details', 'Email, department, branch, address…'],
] as const;

const FORMAT_OPTIONS = [
  ['xlsx', 'Excel (.xlsx)'], ['csv', 'CSV (.csv)'], ['vcf', 'Contacts (.vcf)'], ['txt', 'Text (.txt)'],
] as const;

interface Group { id: string; name: string; isDraft?: boolean; status?: string }
interface Branch { id: string; name: string }

/** Download member phone numbers/details, filtered by who they are. Every export is recorded by the server. */
export function ExportPanel({ initialStatus, onClose }: { initialStatus?: string; onClose: () => void }) {
  const role = useAuthStore((s) => s.user?.role) ?? '';
  const isSenior = role === 'senior_pastor' || role === 'super_admin';

  const [statuses, setStatuses] = useState<string[]>(initialStatus && initialStatus !== 'all' ? [initialStatus] : ['all']);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [groupId, setGroupId] = useState('');
  const [branchId, setBranchId] = useState('all'); // 'own' | 'all' | <branch id>  (senior only)
  const [detail, setDetail] = useState<'numbers' | 'name_number' | 'full'>('name_number');
  const [format, setFormat] = useState<'xlsx' | 'csv' | 'vcf' | 'txt'>('xlsx');
  const [groups, setGroups] = useState<Group[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/ministry-groups', { params: { flat: 'true' } })
      .then((r) => setGroups((r.data ?? []).filter((g: Group) => !g.isDraft && g.status !== 'draft')))
      .catch(() => {});
    if (isSenior) api.get('/churches/branches').then((r) => setBranches(r.data ?? [])).catch(() => {});
  }, [isSenior]);

  const filters = useMemo(
    () => ({
      statuses,
      flaggedOnly: flaggedOnly || undefined,
      groupId: groupId || undefined,
      branchId: isSenior && branchId !== 'own' ? branchId : undefined,
    }),
    [statuses, flaggedOnly, groupId, branchId, isSenior],
  );

  // live "how many people?"
  const seq = useRef(0);
  useEffect(() => {
    const mine = ++seq.current;
    setCount(null);
    const t = setTimeout(async () => {
      try {
        const r = await api.post('/members/export/count', filters);
        if (seq.current === mine) setCount(r.data.count);
      } catch {
        if (seq.current === mine) setCount(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [filters]);

  function toggle(key: string) {
    setStatuses((prev) => {
      if (key === 'all') return ['all'];
      const rest = prev.filter((s) => s !== 'all');
      const next = rest.includes(key) ? rest.filter((s) => s !== key) : [...rest, key];
      return next.length ? next : ['all'];
    });
  }

  const namesOnly = format === 'vcf' || format === 'txt';

  async function run() {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/members/export', { ...filters, detail: namesOnly && detail === 'full' ? 'name_number' : detail, format });
      downloadFile(data);
      if (data.skipped > 0) setError(`${data.count} people exported. ${data.skipped} were left out because their phone number looks invalid.`);
      else onClose();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  }

  const chip = (on: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${on ? 'border-yellow-400 bg-yellow-400 text-slate-900' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Export members</h2>
            <p className="text-sm text-gray-500">Download phone numbers and details.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        {error && <div className="mb-4"><ErrorBox message={error} /></div>}

        <p className="mb-2 text-sm font-semibold text-gray-800">Who should be included?</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(([k, label]) => <button key={k} type="button" className={chip(statuses.includes(k))} onClick={() => toggle(k)}>{label}</button>)}
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-800">
          <input type="checkbox" className="h-4 w-4 accent-yellow-500" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
          Only people flagged for follow-up
        </label>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Department / group</label>
            <select className={inputCls} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">Any</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {isSenior && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Branch</label>
              <select className={inputCls} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="all">All branches</option>
                <option value="own">Headquarters only</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <p className="mb-2 mt-5 text-sm font-semibold text-gray-800">What to export</p>
        <div className="space-y-2">
          {DETAIL_OPTIONS.map(([k, label, sub]) => {
            const disabled = namesOnly && k === 'full';
            return (
              <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${detail === k && !disabled ? 'border-slate-900' : 'border-gray-200'} ${disabled ? 'opacity-40' : ''}`}>
                <input type="radio" name="detail" className="mt-1 accent-yellow-500" disabled={disabled} checked={detail === k && !disabled} onChange={() => setDetail(k)} />
                <span><span className="block text-sm font-medium text-gray-900">{label}</span><span className="block text-xs text-gray-500">{sub}</span></span>
              </label>
            );
          })}
        </div>

        <p className="mb-2 mt-5 text-sm font-semibold text-gray-800">File type</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FORMAT_OPTIONS.map(([k, label]) => <button key={k} type="button" className={chip(format === k)} onClick={() => setFormat(k)}>{label}</button>)}
        </div>
        {format === 'vcf' && <p className="mt-2 text-xs text-gray-500">Contacts files import straight into a phone book, which is handy for WhatsApp broadcast lists.</p>}
        {namesOnly && <p className="mt-1 text-xs text-gray-500">Contacts and text files use names and phone numbers only.</p>}
        <p className="mt-3 text-xs text-gray-400">Numbers are written in international format (+234…). Every export is recorded.</p>

        <div className="mt-6 flex justify-end gap-2">
          <button className={btnOutline} onClick={onClose} disabled={busy}>Cancel</button>
          <button className={btnPrimary} onClick={run} disabled={busy || count === 0}>
            <Download className="h-4 w-4" />
            {busy ? 'Preparing…' : count === null ? 'Export' : count === 0 ? 'No one matches' : `Export ${count} ${count === 1 ? 'person' : 'people'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
