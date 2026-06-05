'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';

const stages = ['NEW_LEAD','CONTACTED','STARTED','IN_PROGRESS','REQUIREMENT_COLLECTED','DEMO_SCHEDULED','QUOTATION_SENT','NEGOTIATION','PAYMENT_PENDING','CONVERTED','LOST','FOLLOW_UP_LATER','ON_HOLD'];

type Deal = { id: string; title: string; stage: string; expectedValue?: string; lead?: any; client?: any; callLogs?: any[] };

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [title, setTitle] = useState('');
  const [expectedValue, setExpectedValue] = useState('');
  const [msg, setMsg] = useState('');

  async function load() { try { setDeals(await api<Deal[]>('/deals')); } catch (e: any) { setMsg(e.message); } }
  useEffect(() => { load(); }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    await api('/deals', { method: 'POST', body: JSON.stringify({ title, expectedValue: expectedValue ? Number(expectedValue) : undefined }) });
    setTitle('');
    setExpectedValue('');
    load();
  }

  async function move(dealId: string, stage: string) {
    await api('/deals/stage', { method: 'POST', body: JSON.stringify({ dealId, stage }) });
    load();
  }

  async function download(fileId: string) {
    try {
      const res: any = await api(`/files/${fileId}/download-url`);
      window.open(res.url, '_blank');
    } catch (e: any) { setMsg(e.message); }
  }

  return (
    <AppShell>
      <PageHeader title="Deal Board" subtitle="Track sales progress stage-wise from New Lead to Converted/Lost." />
      <form onSubmit={create} className="card mb-6 grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_13rem_auto]">
        <input required placeholder="Deal title" value={title} onChange={(e)=>setTitle(e.target.value)} className="min-w-0 rounded-xl border px-4 py-3 text-sm"/>
        <input placeholder="Expected value" value={expectedValue} onChange={(e)=>setExpectedValue(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm"/>
        <button className="min-h-11 rounded-xl bg-brandGold px-6 py-3 font-bold text-slate-950 sm:col-span-2 lg:col-span-1">Create Deal</button>
      </form>
      {msg && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stages.map(stage => (
          <section key={stage} className="card min-h-60 p-4">
            <h2 className="mb-3 font-bold">{stage.replaceAll('_',' ')}</h2>
            {deals.filter(d=>d.stage===stage).map(d => (
              <div key={d.id} className="mb-3 rounded-xl border p-3 text-sm">
                <b>{d.title}</b>
                <div className="mt-1 text-slate-500">Rs. {d.expectedValue || 0}</div>
                <StatusBadge status={d.stage}/>
                <select value={d.stage} onChange={(e)=>move(d.id,e.target.value)} className="mt-3 w-full rounded-lg border px-2 py-2 text-xs">
                  {stages.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                {d.callLogs?.length ? (
                  <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs">
                    <b>{d.callLogs.length} linked call(s)</b>
                    {d.callLogs.slice(0,2).map((call:any)=>(
                      <div key={call.id} className="mt-2 border-t pt-2">
                        <div>{call.status} - {call.employee?.name || '-'}</div>
                        {call.recordingFile && <button onClick={()=>download(call.recordingFile.id)} className="mt-1 rounded border px-2 py-1 font-bold">Download</button>}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </section>
        ))}
      </div>
    </AppShell>
  );
}
