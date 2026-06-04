'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

type Followup = { id: string; title: string; notes?: string; dueAt: string; status: string; lead?: any; assignedTo?: any };

export default function FollowupsPage() {
  const [items, setItems] = useState<Followup[]>([]);
  const [pending, setPending] = useState<Followup[]>([]);
  const [error, setError] = useState('');
  async function load() {
    try { setItems(await api<Followup[]>('/followups/daily')); setPending(await api<Followup[]>('/followups/pending')); }
    catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    await api(`/followups/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  }
  async function reschedule(id: string) {
    const dueAt = prompt('Enter new follow-up date/time in format YYYY-MM-DDTHH:mm');
    if (!dueAt) return;
    await api(`/followups/${id}/reschedule`, { method: 'PATCH', body: JSON.stringify({ dueAt }) });
    load();
  }

  const row = (f: Followup) => (
    <div key={f.id} className="mb-3 grid grid-cols-5 items-center gap-3 rounded-xl border p-4 text-sm">
      <div className="font-bold text-brandGoldDark">{new Date(f.dueAt).toLocaleString()}</div>
      <div className="col-span-2"><b>{f.title}</b><div className="text-slate-500">{f.lead?.organization || f.notes || '-'} · {f.assignedTo?.name || ''}</div></div>
      <div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{f.status}</span></div>
      <div className="flex justify-end gap-2">
        <button onClick={() => setStatus(f.id, 'COMPLETED')} className="rounded-lg border px-3 py-1">Done</button>
        <button onClick={() => setStatus(f.id, 'MISSED')} className="rounded-lg border px-3 py-1">Missed</button>
        <button onClick={() => reschedule(f.id)} className="rounded-lg border px-3 py-1">Reschedule</button>
      </div>
    </div>
  );

  return (
    <AppShell>
      <PageHeader title="Daily Follow-up Dashboard" subtitle="Employees see own follow-ups. Owner, Manager and PA can monitor, mark done/missed, reschedule, and coordinate reminders." />
      {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid grid-cols-3 gap-6">
        <section className="card col-span-2 p-6">
          <h2 className="mb-4 text-xl font-bold">Today’s Follow-ups</h2>
          {items.map(row)}
          {!items.length && <p className="text-sm text-slate-500">No follow-ups for today.</p>}
        </section>
        <section className="card p-6">
          <h2 className="mb-4 text-xl font-bold">Pending Queue</h2>
          {pending.slice(0, 8).map((f) => (
            <div key={f.id} className="border-b border-slate-100 py-3 text-sm"><b>{f.title}</b><div className="text-slate-500">{new Date(f.dueAt).toLocaleString()} · {f.assignedTo?.name}</div>
              <div className="mt-2 flex gap-2"><button onClick={() => setStatus(f.id, 'COMPLETED')} className="rounded-lg border px-2 py-1 text-xs">Done</button><button onClick={() => reschedule(f.id)} className="rounded-lg border px-2 py-1 text-xs">Reschedule</button></div>
            </div>
          ))}
          {!pending.length && <p className="text-sm text-slate-500">No pending follow-ups.</p>}
        </section>
      </div>
    </AppShell>
  );
}
