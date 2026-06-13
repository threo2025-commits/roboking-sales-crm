'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { LeadKanbanBoard } from '@/components/LeadKanbanBoard';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

export default function LeadPipelinePage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api<any[]>('/leads').then(setLeads).catch((error: any) => setMessage(error.message)).finally(() => setLoading(false));
  }, []);

  return <AppShell>
    <PageHeader
      title="Sales Pipeline"
      subtitle="Manage every opportunity from first contact through interest, follow-up, conversion, and client handover in one workspace."
      action={<div className="flex flex-wrap gap-2"><Link href="/imports" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold">Import</Link><Link href="/leads" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Add Opportunity</Link></div>}
    />
    {message && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</div>}
    {loading ? <section className="card p-8 text-center text-sm text-slate-500">Loading pipeline...</section> : <LeadKanbanBoard initialLeads={leads} />}
  </AppShell>;
}
