'use client';
import Link from 'next/link';
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
    try {
      setItems(await api<Followup[]>('/followups/daily'));
      setPending(await api<Followup[]>('/followups/pending'));
    } catch (e: any) {
      setError(e.message);
    }
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

  const row = (followup: Followup) => {
    const overdue = followup.status === 'PENDING' && new Date(followup.dueAt).getTime() < Date.now();
    return <div key={followup.id} className={`mb-3 grid grid-cols-1 gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2 lg:grid-cols-5 lg:items-center ${overdue ? 'border-red-200 bg-red-50' : ''}`}>
      <div className={`font-bold ${overdue ? 'text-red-700' : 'text-brandGoldDark'}`}>{new Date(followup.dueAt).toLocaleString()}{overdue && <div className="text-xs uppercase">Overdue</div>}</div>
      <div className="sm:col-span-1 lg:col-span-2"><b>{followup.title}</b><div className="text-slate-500">{followup.lead?.organization || followup.notes || '-'} - {followup.assignedTo?.name || ''}</div></div>
      <div><span className="rounded-full bg-white px-3 py-1 text-xs font-bold">{followup.status}</span></div>
      <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-1 lg:justify-end">
        <button onClick={() => setStatus(followup.id, 'COMPLETED')} className="min-h-10 rounded-lg border bg-white px-3 py-2">Done</button>
        <button onClick={() => setStatus(followup.id, 'MISSED')} className="min-h-10 rounded-lg border bg-white px-3 py-2">Missed</button>
        <button onClick={() => reschedule(followup.id)} className="min-h-10 rounded-lg border bg-white px-3 py-2">Reschedule</button>
      </div>
    </div>;
  };

  return <AppShell>
    <PageHeader title="Tasks & Follow-ups" subtitle="Manage today&apos;s actions, overdue follow-ups, reminders, and linked sales work from one queue." action={<Link href="/tasks" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Open Tasks</Link>} />
    {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
      <section className="card p-4 sm:p-6 lg:col-span-2">
        <h2 className="mb-4 text-xl font-bold">Today&apos;s Follow-ups</h2>
        {items.map(row)}
        {!items.length && <p className="text-sm text-slate-500">No follow-ups for today.</p>}
      </section>
      <section className="card p-4 sm:p-6">
        <h2 className="mb-4 text-xl font-bold">Pending Queue</h2>
        {pending.slice(0, 8).map((followup) => {
          const overdue = new Date(followup.dueAt).getTime() < Date.now();
          return <div key={followup.id} className={`border-b py-3 text-sm ${overdue ? 'border-red-100 bg-red-50 px-3 text-red-900' : 'border-slate-100'}`}>
            <b>{followup.title}</b>
            <div className="text-slate-500">{new Date(followup.dueAt).toLocaleString()} - {followup.assignedTo?.name}</div>
            <div className="mt-2 flex gap-2"><button onClick={() => setStatus(followup.id, 'COMPLETED')} className="rounded-lg border bg-white px-2 py-1 text-xs">Done</button><button onClick={() => reschedule(followup.id)} className="rounded-lg border bg-white px-2 py-1 text-xs">Reschedule</button></div>
          </div>;
        })}
        {!pending.length && <p className="text-sm text-slate-500">No pending follow-ups.</p>}
      </section>
    </div>
  </AppShell>;
}
