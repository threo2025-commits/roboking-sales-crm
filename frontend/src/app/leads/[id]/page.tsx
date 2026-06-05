'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const [lead, setLead] = useState<any>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      setLead(await api(`/leads/${params.id}`));
    } catch (e: any) {
      setMsg(e.message);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) load();
  }, [params.id, load]);

  async function convert() {
    try {
      await api(`/leads/${params.id}/convert-to-client`, { method: 'POST' });
      setMsg('Lead converted / linked to client.');
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function download(fileId: string) {
    const res: any = await api(`/files/${fileId}/download-url`);
    window.open(res.url, '_blank');
  }

  return (
    <AppShell>
      <PageHeader
        title={lead?.organization || 'Lead Details'}
        subtitle={lead?.deletedAt ? 'This lead has been deleted and is visible only to Owner/Manager.' : 'Complete lead timeline: follow-ups, calls, recordings, emails, WhatsApp and activities.'}
        action={<Link href="/leads" className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">Back to leads</Link>}
      />
      {msg && <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm">{msg}</div>}
      {!lead ? (
        <section className="card p-6 text-sm text-slate-500">Loading lead...</section>
      ) : (
        <>
          <section className={`card p-4 sm:p-6 ${lead.deletedAt ? 'border-red-200 bg-red-50' : ''}`}>
            <div className="flex flex-col items-start justify-between gap-5 lg:flex-row lg:gap-6">
              <div>
                <div className="mb-3">
                  {lead.deletedAt ? <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">DELETED</span> : <StatusBadge status={lead.status} />}
                </div>
                <h2 className="text-2xl font-bold">{lead.organization}</h2>
                <p className="mt-2 text-slate-500">{lead.requirement || 'No requirement entered yet.'}</p>
                {lead.deletedAt && <div className="mt-4 rounded-xl border border-red-200 bg-white p-3 text-sm font-bold text-red-700">Deleted lead. Hidden from PA and Employee views.</div>}
                {lead.duplicateReason && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-800">Duplicate contact found: {lead.duplicateReason}</div>}
              </div>
              {!lead.deletedAt && (
                <div className="flex flex-wrap gap-2">
                  <a href={lead.phone ? `tel:${lead.phone}` : '#'} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Call</a>
                  <Link href="/communications" className="rounded-xl bg-brandGold px-4 py-2 text-sm font-bold text-slate-950">Communicate</Link>
                  <button onClick={convert} className="rounded-xl border px-4 py-2 text-sm font-bold">Convert to Client</button>
                </div>
              )}
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><b>Contact</b><p>{lead.contactName || '-'}</p></div>
              <div><b>Phone</b><p>{lead.phone || '-'}</p></div>
              <div><b>Email</b><p>{lead.email || '-'}</p></div>
              <div><b>Assigned To</b><p>{lead.assignedTo?.name || '-'}</p></div>
            </div>
          </section>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-2 lg:gap-6">
            <section className="card p-6">
              <h2 className="mb-4 text-xl font-bold">Call Logs & Recordings</h2>
              {lead.callLogs?.map((c: any) => (
                <div key={c.id} className="mb-3 rounded-xl border p-4 text-sm">
                  <b>{c.status}</b>
                  <div className="text-slate-500">Duration: {c.durationSeconds || '-'} sec - Budget: {c.budgetDiscussed || '-'}</div>
                  <p className="mt-2">{c.summary || '-'}</p>
                  {c.recordingFile && <button onClick={() => download(c.recordingFile.id)} className="mt-3 rounded-lg border px-3 py-2 text-xs font-bold">Download Recording</button>}
                </div>
              ))}
              {!lead.callLogs?.length && <p className="text-sm text-slate-500">No call logs yet.</p>}
            </section>

            <section className="card p-6">
              <h2 className="mb-4 text-xl font-bold">Follow-ups</h2>
              {lead.followups?.map((f: any) => (
                <div key={f.id} className="mb-3 rounded-xl border p-4 text-sm">
                  <b>{f.title}</b>
                  <div className="text-slate-500">{new Date(f.dueAt).toLocaleString()} - {f.status}</div>
                  <p>{f.notes || ''}</p>
                </div>
              ))}
              {!lead.followups?.length && <p className="text-sm text-slate-500">No follow-ups yet.</p>}
            </section>

            <section className="card p-6">
              <h2 className="mb-4 text-xl font-bold">Email Timeline</h2>
              {lead.emailMessages?.map((m: any) => (
                <div key={m.id} className="mb-3 rounded-xl border p-4 text-sm">
                  <b>{m.subject}</b>
                  <div className="text-slate-500">{m.direction} - {m.fromEmail} to {m.toEmail}</div>
                </div>
              ))}
              {!lead.emailMessages?.length && <p className="text-sm text-slate-500">No emails yet.</p>}
            </section>

            <section className="card p-6">
              <h2 className="mb-4 text-xl font-bold">Activity Timeline</h2>
              {lead.activities?.map((a: any) => (
                <div key={a.id} className="mb-3 rounded-xl border p-4 text-sm">
                  <b>{a.type}</b>
                  <p>{a.summary}</p>
                  <div className="text-slate-500">{new Date(a.createdAt).toLocaleString()}</div>
                </div>
              ))}
              {!lead.activities?.length && <p className="text-sm text-slate-500">No activity yet.</p>}
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}
