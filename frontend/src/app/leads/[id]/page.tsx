'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';

const journey = [
  { label: 'New / Created', statuses: ['NEW_LEAD'] },
  { label: 'Started / Contacted', statuses: ['STARTED', 'CONTACTED'] },
  { label: 'In Progress', statuses: ['IN_PROGRESS', 'REQUIREMENT_COLLECTED', 'DEMO_SCHEDULED', 'DEMO_COMPLETED', 'QUOTATION_SENT', 'NEGOTIATION', 'PAYMENT_PENDING'] },
  { label: 'Follow-up Later', statuses: ['FOLLOW_UP_LATER', 'ON_HOLD'] },
  { label: 'Converted', statuses: ['CONVERTED'] },
  { label: 'Failed / Lost', statuses: ['LOST', 'INVALID_CONTACT'] }
];

function currentJourneyIndex(status: string) {
  const index = journey.findIndex((step) => step.statuses.includes(status));
  return index < 0 ? 0 : index;
}

function formatDate(value?: string) {
  return value ? new Date(value).toLocaleString() : '-';
}

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const [lead, setLead] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [note, setNote] = useState('');
  const [followupAt, setFollowupAt] = useState('');
  const [role, setRole] = useState('');

  const load = useCallback(async () => {
    try {
      setLead(await api(`/leads/${params.id}`));
    } catch (e: any) {
      setMsg(e.message);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) load();
    try {
      const currentRole = JSON.parse(localStorage.getItem('rk_crm_user') || '{}').role || '';
      setRole(currentRole);
      if (['OWNER', 'MANAGER'].includes(currentRole)) api<any[]>('/users/directory').then(setUsers).catch(() => {});
    } catch {}
  }, [params.id, load]);

  const stepIndex = useMemo(() => currentJourneyIndex(lead?.status || 'NEW_LEAD'), [lead?.status]);
  const canManage = role === 'OWNER' || role === 'MANAGER';
  const lastCall = lead?.callLogs?.[0];
  const lastEmail = lead?.emailMessages?.[0];
  const lastWhatsapp = lead?.whatsappLogs?.[0];

  async function changeStage(status: string) {
    if (status === 'FOLLOW_UP_LATER' && !followupAt) {
      setMsg('Select the next follow-up date first.');
      return;
    }
    try {
      await api(`/leads/${params.id}/stage`, {
        method: 'POST',
        body: JSON.stringify({ status, note: note || undefined, nextFollowupAt: status === 'FOLLOW_UP_LATER' ? followupAt : undefined })
      });
      setMsg('Lead journey updated.');
      setNote('');
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function reassign(assignedToId: string) {
    if (!assignedToId) return;
    try {
      await api(`/leads/${params.id}`, { method: 'PATCH', body: JSON.stringify({ assignedToId }) });
      setMsg('Lead reassigned successfully.');
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
        subtitle={lead?.deletedAt ? 'This lead has been deleted and is visible only to Owner/Manager.' : 'Lead journey, ownership, communication history, and next actions.'}
        action={<Link href="/leads" className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">Back to leads</Link>}
      />
      {msg && <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm">{msg}</div>}
      {!lead ? <section className="card p-6 text-sm text-slate-500">Loading lead...</section> : (
        <>
          <section className={`card p-4 sm:p-6 ${lead.deletedAt ? 'border-red-200 bg-red-50' : ''}`}>
            <div className="flex flex-col items-start justify-between gap-5 lg:flex-row">
              <div className="min-w-0">
                <StatusBadge status={lead.deletedAt ? 'DELETED' : lead.status} />
                <h2 className="mt-3 break-words text-2xl font-bold">{lead.organization}</h2>
                <p className="mt-2 text-slate-500">{lead.requirement || 'No requirement entered yet.'}</p>
              </div>
              {!lead.deletedAt && <div className="flex flex-wrap gap-2">
                <a href={lead.phone ? `tel:${lead.phone}` : '#'} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Call</a>
                <Link href="/communications" className="rounded-xl bg-brandGold px-4 py-2 text-sm font-bold text-slate-950">Communicate</Link>
              </div>}
            </div>
          </section>

          {!lead.deletedAt && <section className="card mt-5 p-4 sm:mt-6 sm:p-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div><h2 className="text-xl font-bold">Lead Journey</h2><p className="mt-1 text-sm text-slate-500">Every change is recorded with the person and time.</p></div>
              <StatusBadge status={lead.status} />
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
              {journey.map((step, index) => {
                const current = index === stepIndex;
                const completed = index < stepIndex && !['LOST', 'INVALID_CONTACT'].includes(lead.status);
                return <div key={step.label} className={`relative rounded-xl border p-3 text-sm ${current ? 'border-brandGold bg-amber-50 font-bold text-slate-950' : completed ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                  <div className="text-xs font-bold uppercase">{completed ? 'Completed' : current ? 'Current' : 'Available'}</div>
                  <div className="mt-1">{step.label}</div>
                </div>;
              })}
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_16rem]">
              <input value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl border px-4 py-3 text-sm" placeholder="Optional status note or lost reason" />
              <input type="datetime-local" value={followupAt} onChange={(e) => setFollowupAt(e.target.value)} className="rounded-xl border px-4 py-3 text-sm" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => changeStage('STARTED')} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Mark Started</button>
              <button onClick={() => changeStage('IN_PROGRESS')} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Move In Progress</button>
              <button onClick={() => changeStage('FOLLOW_UP_LATER')} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-800">Schedule Follow-up Later</button>
              <button onClick={() => changeStage('CONVERTED')} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">Convert Lead</button>
              <button onClick={() => changeStage('LOST')} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">Mark Failed / Lost</button>
            </div>
          </section>}

          <section className="card mt-5 p-4 sm:mt-6 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div><h2 className="text-xl font-bold">Handling & Ownership</h2><p className="mt-1 text-sm text-slate-500">Current owner and complete reassignment history.</p></div>
              {canManage && <select value={lead.assignedToId || ''} onChange={(e) => reassign(e.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm lg:w-72">
                <option value="">Select handler</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.name} - {user.role.replaceAll('_', ' ')}</option>)}
              </select>}
            </div>
            <div className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><b>Created by</b><p>{lead.createdBy?.name || '-'}</p><span className="text-xs text-slate-500">{formatDate(lead.createdAt)}</span></div>
              <div><b>Currently handled by</b><p>{lead.assignedTo?.name || 'Unassigned'}</p><span className="text-xs text-slate-500">{lead.assignedTo?.role?.replaceAll('_', ' ') || '-'}</span></div>
              <div><b>Last contacted by</b><p>{lead.lastContact?.by?.name || '-'}</p><span className="text-xs text-slate-500">{lead.lastContact ? `${lead.lastContact.type} - ${formatDate(lead.lastContact.at)}` : 'No contact yet'}</span></div>
              <div><b>Next follow-up</b><p>{formatDate(lead.nextFollowupAt)}</p><span className="text-xs text-slate-500">Handling status: {lead.status.replaceAll('_', ' ')}</span></div>
              <div><b>Last call</b><p>{lastCall?.employee?.name || '-'}</p><span className="text-xs text-slate-500">{formatDate(lastCall?.createdAt)}</span></div>
              <div><b>Last email</b><p>{lastEmail?.senderUser?.name || lastEmail?.direction || '-'}</p><span className="text-xs text-slate-500">{formatDate(lastEmail?.sentAt || lastEmail?.receivedAt || lastEmail?.createdAt)}</span></div>
              <div><b>Last WhatsApp</b><p>{lastWhatsapp?.employee?.name || '-'}</p><span className="text-xs text-slate-500">{formatDate(lastWhatsapp?.createdAt)}</span></div>
            </div>
            {!!lead.assignmentHistory?.length && <div className="mt-5 border-t pt-4">
              <h3 className="font-bold">Reassignment history</h3>
              <div className="mt-3 space-y-2">{lead.assignmentHistory.map((item: any) => <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                <b>{item.fromUser?.name || 'Unassigned'} to {item.toUser?.name || 'Unassigned'}</b>
                <div className="text-slate-500">Changed by {item.changedBy?.name || '-'} ({item.changedBy?.role?.replaceAll('_', ' ')}) - {formatDate(item.createdAt)}</div>
              </div>)}</div>
            </div>}
          </section>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:mt-6 lg:grid-cols-2">
            <section className="card p-4 sm:p-6"><h2 className="mb-4 text-xl font-bold">Call Logs & Recordings</h2>{lead.callLogs?.map((c: any) => <div key={c.id} className="mb-3 rounded-xl border p-4 text-sm"><b>{c.status}</b><div className="text-slate-500">{c.employee?.name || '-'} - {formatDate(c.createdAt)} - Duration {c.durationSeconds || '-'} sec</div><p className="mt-2">{c.summary || '-'}</p>{c.recordingFile && <button onClick={() => download(c.recordingFile.id)} className="mt-3 rounded-lg border px-3 py-2 text-xs font-bold">Download Recording</button>}</div>)}{!lead.callLogs?.length && <p className="text-sm text-slate-500">No call logs yet.</p>}</section>
            <section className="card p-4 sm:p-6"><h2 className="mb-4 text-xl font-bold">Follow-ups</h2>{lead.followups?.map((f: any) => <div key={f.id} className="mb-3 rounded-xl border p-4 text-sm"><b>{f.title}</b><div className="text-slate-500">{formatDate(f.dueAt)} - {f.status}</div><p>{f.notes || ''}</p></div>)}{!lead.followups?.length && <p className="text-sm text-slate-500">No follow-ups yet.</p>}</section>
            <section className="card p-4 sm:p-6"><h2 className="mb-4 text-xl font-bold">Communication Timeline</h2>
              {[...(lead.emailMessages || []).map((m: any) => ({ id: m.id, type: 'EMAIL', title: m.subject, by: m.senderUser?.name, at: m.sentAt || m.receivedAt || m.createdAt })), ...(lead.whatsappLogs || []).map((m: any) => ({ id: m.id, type: 'WHATSAPP', title: m.message, by: m.employee?.name, at: m.createdAt }))].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).map((item: any) => <div key={`${item.type}-${item.id}`} className="mb-3 rounded-xl border p-4 text-sm"><b>{item.type}: {item.title}</b><div className="text-slate-500">{item.by || '-'} - {formatDate(item.at)}</div></div>)}
              {!lead.emailMessages?.length && !lead.whatsappLogs?.length && <p className="text-sm text-slate-500">No messages yet.</p>}
            </section>
            <section className="card p-4 sm:p-6"><h2 className="mb-4 text-xl font-bold">Detailed Activity</h2>{lead.auditLogs?.map((a: any) => <div key={a.id} className="mb-3 rounded-xl border p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><b>{a.action.replaceAll('_', ' ')}</b><span className="text-xs text-slate-500">{formatDate(a.createdAt)}</span></div><p className="mt-1">{a.actor?.name || 'System'} - {(a.actorRole || a.actor?.role || '').replaceAll('_', ' ')}</p>{a.beforeState?.status || a.afterState?.status ? <div className="mt-2 text-xs text-slate-500">{a.beforeState?.status || '-'} to {a.afterState?.status || '-'}</div> : null}{a.notes && <p className="mt-2 text-slate-600">{a.notes}</p>}{canManage && (a.ipAddress || a.userAgent) && <div className="mt-2 break-all rounded-lg bg-slate-50 p-2 text-xs text-slate-500">IP: {a.ipAddress || '-'}<br />Agent: {a.userAgent || '-'}</div>}</div>)}{!lead.auditLogs?.length && <p className="text-sm text-slate-500">No activity yet.</p>}</section>
          </div>
        </>
      )}
    </AppShell>
  );
}
