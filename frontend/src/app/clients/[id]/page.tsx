'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<any>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try { setClient(await api(`/clients/${params.id}`)); } catch (e: any) { setMsg(e.message); }
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  async function download(fileId: string) {
    try {
      const res: any = await api(`/files/${fileId}/download-url`);
      window.open(res.url, '_blank');
    } catch (e: any) { setMsg(e.message); }
  }

  return (
    <AppShell>
      <PageHeader title={client?.organization || 'Client Details'} subtitle="Client contacts, linked leads, deals, activity and call recordings." action={<Link href="/clients" className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">Back to clients</Link>} />
      {msg && <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm">{msg}</div>}
      {!client ? <section className="card p-6 text-sm text-slate-500">Loading client...</section> : <>
        <section className="card p-6">
          <h2 className="text-2xl font-bold">{client.organization}</h2>
          <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
            <div><b>Location</b><p>{[client.city, client.state].filter(Boolean).join(', ') || '-'}</p></div>
            <div><b>Category</b><p>{client.category || '-'}</p></div>
            <div><b>Source</b><p>{client.source || '-'}</p></div>
            <div><b>Primary Contact</b><p>{client.contacts?.[0]?.name || '-'}</p></div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <section className="card p-6">
            <h2 className="mb-4 text-xl font-bold">Call Logs & Recordings</h2>
            {client.callLogs?.map((c: any) => <div key={c.id} className="mb-3 rounded-xl border p-4 text-sm"><b>{c.status}</b><div className="text-slate-500">By {c.employee?.name || '-'} - Duration: {c.durationSeconds || '-'} sec</div><p className="mt-2">{c.summary || '-'}</p>{c.recordingFile && <button onClick={() => download(c.recordingFile.id)} className="mt-3 rounded-lg border px-3 py-2 text-xs font-bold">Download Recording</button>}</div>)}
            {!client.callLogs?.length && <p className="text-sm text-slate-500">No client call logs yet.</p>}
          </section>

          <section className="card p-6">
            <h2 className="mb-4 text-xl font-bold">Activity Timeline</h2>
            {client.activities?.map((a: any) => <div key={a.id} className="mb-3 rounded-xl border p-4 text-sm"><b>{a.type}</b><p>{a.summary}</p><div className="text-slate-500">{new Date(a.createdAt).toLocaleString()}</div></div>)}
            {!client.activities?.length && <p className="text-sm text-slate-500">No activity yet.</p>}
          </section>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6">
          <section className="card p-6"><h2 className="mb-4 text-xl font-bold">Linked Leads</h2>{client.leads?.map((lead: any) => <div key={lead.id} className="mb-3 rounded-xl border p-4 text-sm"><b>{lead.organization}</b><div className="text-slate-500">{lead.status}</div></div>)}{!client.leads?.length && <p className="text-sm text-slate-500">No linked leads.</p>}</section>
          <section className="card p-6"><h2 className="mb-4 text-xl font-bold">Linked Deals</h2>{client.deals?.map((deal: any) => <div key={deal.id} className="mb-3 rounded-xl border p-4 text-sm"><b>{deal.title}</b><div className="text-slate-500">{deal.stage}</div></div>)}{!client.deals?.length && <p className="text-sm text-slate-500">No linked deals.</p>}</section>
        </div>
      </>}
    </AppShell>
  );
}
