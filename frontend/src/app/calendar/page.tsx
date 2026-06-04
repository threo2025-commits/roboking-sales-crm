'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

export default function CalendarPage(){
  const [items,setItems]=useState<any[]>([]);
  useEffect(()=>{ api<any[]>('/followups/pending').then(setItems).catch(()=>{}); },[]);
  return <AppShell><PageHeader title="Calendar" subtitle="Upcoming follow-ups and reminder schedule." />
    <section className="card p-6"><h2 className="mb-4 text-xl font-bold">Upcoming Schedule</h2>{items.map(f=><div key={f.id} className="mb-3 rounded-xl border p-4 text-sm"><b>{new Date(f.dueAt).toLocaleString()}</b><div>{f.title}</div><div className="text-slate-500">{f.assignedTo?.name} · {f.lead?.organization}</div></div>)}{!items.length&&<p className="text-sm text-slate-500">No upcoming follow-ups.</p>}</section>
  </AppShell>;
}
