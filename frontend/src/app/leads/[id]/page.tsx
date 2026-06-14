'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { LeadProgress } from '@/components/LeadProgress';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';

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
  const [nextActionType, setNextActionType] = useState('CALL');
  const [nextActionNote, setNextActionNote] = useState('');
  const [nextActionAt, setNextActionAt] = useState('');
  const [showAllTimeline, setShowAllTimeline] = useState(false);
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

  const canManage = role === 'OWNER' || role === 'MANAGER';
  const lastCall = lead?.callLogs?.[0];
  const lastEmail = lead?.emailMessages?.[0];
  const lastWhatsapp = lead?.whatsappLogs?.[0];
  const timeline = useMemo(() => {
    if (!lead) return [];
    const items: any[] = [];
    (lead.auditLogs || []).forEach((item: any) => items.push({
      id: `audit-${item.id}`,
      type: item.action?.includes('STATUS') || item.action?.includes('STAGE') ? 'STATUS' : 'AUDIT',
      title: item.action?.replaceAll('_', ' ') || 'Lead updated',
      detail: item.beforeState?.status || item.afterState?.status
        ? `${item.beforeState?.status?.replaceAll('_', ' ') || 'New'} to ${item.afterState?.status?.replaceAll('_', ' ') || '-'}`
        : item.notes,
      actor: item.actor,
      actorRole: item.actorRole,
      at: item.createdAt,
      ipAddress: item.ipAddress,
      userAgent: item.userAgent
    }));
    (lead.assignmentHistory || []).forEach((item: any) => items.push({
      id: `assignment-${item.id}`,
      type: 'ASSIGNMENT',
      title: 'Lead reassigned',
      detail: `${item.fromUser?.name || 'Unassigned'} to ${item.toUser?.name || 'Unassigned'}`,
      actor: item.changedBy,
      at: item.createdAt
    }));
    (lead.activities || []).forEach((item: any) => items.push({
      id: `activity-${item.id}`,
      type: item.type || 'ACTIVITY',
      title: item.type?.replaceAll('_', ' ') || 'Activity',
      detail: item.summary,
      actor: item.user,
      at: item.createdAt
    }));
    (lead.callLogs || []).forEach((item: any) => items.push({
      id: `call-${item.id}`,
      type: 'CALL',
      title: `Call log - ${item.status?.replaceAll('_', ' ') || 'Recorded'}`,
      detail: [
        item.durationSeconds ? `Duration ${item.durationSeconds} sec` : '',
        item.productInterest ? `Interest: ${item.productInterest}` : '',
        item.budgetDiscussed ? `Budget: Rs ${Number(item.budgetDiscussed).toLocaleString('en-IN')}` : '',
        item.summary
      ].filter(Boolean).join(' | '),
      actor: item.employee,
      at: item.createdAt,
      recordingFile: item.recordingFile
    }));
    (lead.emailMessages || []).forEach((item: any) => items.push({
      id: `email-${item.id}`,
      type: 'EMAIL',
      title: item.subject || 'Email',
      detail: `${item.direction || 'SENT'} - ${item.fromEmail || '-'} to ${item.toEmail || '-'}`,
      actor: item.senderUser,
      at: item.sentAt || item.receivedAt || item.createdAt
    }));
    (lead.whatsappLogs || []).forEach((item: any) => items.push({
      id: `whatsapp-${item.id}`,
      type: 'WHATSAPP',
      title: 'WhatsApp message',
      detail: item.message,
      actor: item.employee,
      at: item.createdAt
    }));
    (lead.followups || []).forEach((item: any) => items.push({
      id: `followup-${item.id}`,
      type: 'FOLLOW_UP',
      title: item.title || 'Follow-up',
      detail: `${item.status?.replaceAll('_', ' ') || 'PENDING'} - due ${formatDate(item.dueAt)}${item.notes ? ` - ${item.notes}` : ''}`,
      actor: item.assignedTo,
      at: item.updatedAt || item.createdAt || item.dueAt
    }));
    (lead.tasks || []).forEach((item: any) => items.push({
      id: `task-${item.id}`,
      type: 'TASK',
      title: item.title || 'Task',
      detail: `${item.status?.replaceAll('_', ' ') || 'PENDING'}${item.description ? ` - ${item.description}` : ''}`,
      actor: item.createdBy,
      at: item.createdAt
    }));
    if (!items.some((item) => item.type === 'AUDIT' && item.title?.includes('CREATE'))) {
      items.push({
        id: `created-${lead.id}`,
        type: 'CREATED',
        title: 'Lead created',
        detail: lead.source ? `Source: ${lead.source}` : undefined,
        actor: lead.createdBy,
        at: lead.createdAt
      });
    }
    return items
      .filter((item) => item.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [lead]);
  const importantTimeline = useMemo(() => {
    const importantTypes = new Set(['CREATED', 'ASSIGNMENT', 'CALL', 'EMAIL', 'WHATSAPP', 'FOLLOW_UP', 'STATUS']);
    const seen = new Set<string>();
    return timeline.filter((item: any) => {
      const title = String(item.title || '').toLowerCase();
      const important = importantTypes.has(item.type)
        || title.includes('created')
        || title.includes('converted')
        || title.includes('reassign')
        || title.includes('moved')
        || title.includes('lost')
        || title.includes('failed');
      const key = `${item.type}-${title}-${String(item.at).slice(0, 16)}`;
      if (!important || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [timeline]);
  const displayedTimeline = showAllTimeline ? importantTimeline : importantTimeline.slice(0, 8);

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

  async function scheduleNextAction() {
    if (!nextActionAt || !nextActionNote.trim()) {
      setMsg('Add the next communication details and due date.');
      return;
    }
    const assignedToId = lead?.assignedToId || lead?.createdBy?.id;
    if (!assignedToId) {
      setMsg('Assign this lead to a team member before scheduling communication.');
      return;
    }
    try {
      await api('/followups', {
        method: 'POST',
        body: JSON.stringify({
          leadId: lead.id,
          assignedToId,
          title: `${nextActionType}: ${nextActionNote.trim()}`,
          dueAt: nextActionAt
        })
      });
      await api(`/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify({ nextFollowupAt: nextActionAt }) });
      setNextActionNote('');
      setNextActionAt('');
      setMsg('Next communication reminder scheduled.');
      await load();
    } catch (error: any) {
      setMsg(error.message);
    }
  }

  async function download(fileId: string) {
    const res: any = await api(`/files/${fileId}/download-url`);
    window.open(res.url, '_blank');
  }

  async function openWhatsapp() {
    const phone = String(lead?.whatsapp || lead?.phone || '');
    if (!phone) {
      setMsg('No WhatsApp or phone number is saved for this lead.');
      return;
    }
    try {
      const result: any = await api('/whatsapp/open-url', {
        method: 'POST',
        body: JSON.stringify({
          phone,
          message: `Hello ${lead.contactName || 'there'}, this is the RoboKing team following up regarding ${lead.organization}.`,
          leadId: lead.id
        })
      });
      window.open(result.url, '_blank');
      await load();
    } catch (error: any) {
      setMsg(error.message);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title={lead?.organization || 'Lead Details'}
        subtitle={lead?.deletedAt ? 'This opportunity has been deleted and is visible only to Owner/Manager.' : 'Opportunity stage, linked deal, ownership, communication history, and next actions.'}
        action={<Link href="/leads/pipeline" className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">Back to Pipeline</Link>}
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
                <button onClick={openWhatsapp} className="rounded-xl border px-4 py-2 text-sm font-bold">WhatsApp</button>
                <Link href={`/communications?leadId=${lead.id}`} className="rounded-xl bg-brandGold px-4 py-2 text-sm font-bold text-slate-950">Email / Call Log</Link>
              </div>}
            </div>
            {!!lead.deals?.length && <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-3">
              <div><div className="text-xs font-bold uppercase text-emerald-700">Linked Deal</div><p className="mt-1 font-bold">{lead.deals[0].title}</p></div>
              <div><div className="text-xs font-bold uppercase text-slate-500">Deal Stage</div><p className="mt-1 font-bold">{lead.deals[0].stage.replaceAll('_', ' ')}</p></div>
              <div><div className="text-xs font-bold uppercase text-slate-500">Expected Value</div><p className="mt-1 font-bold">{lead.deals[0].expectedValue ? `Rs ${Number(lead.deals[0].expectedValue).toLocaleString('en-IN')}` : '-'}</p></div>
            </div>}
          </section>

          {!lead.deletedAt && <section className="card mt-5 p-4 sm:mt-6 sm:p-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div><h2 className="text-xl font-bold">Lead Journey</h2><p className="mt-1 text-sm text-slate-500">Every change is recorded with the person and time.</p></div>
              <StatusBadge status={lead.status} />
            </div>
            <div className="mt-5"><LeadProgress status={lead.status} /></div>
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

          {!lead.deletedAt && <section className="card mt-5 p-4 sm:mt-6 sm:p-6">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
              <div>
                <h2 className="text-xl font-bold">Next Communication</h2>
                <p className="mt-1 text-sm text-slate-500">Make the next action clear for the assigned handler.</p>
                {lead.followups?.filter((item: any) => item.status === 'PENDING').slice(0, 3).map((item: any) => {
                  const overdue = new Date(item.dueAt).getTime() < Date.now();
                  return <div key={item.id} className={`mt-3 rounded-lg border-l-4 p-4 ${overdue ? 'border-l-red-500 bg-red-50' : 'border-l-amber-400 bg-amber-50'}`}>
                    <div className="flex flex-col justify-between gap-1 sm:flex-row">
                      <b>{item.title}</b>
                      <span className={`text-xs font-bold ${overdue ? 'text-red-700' : 'text-amber-800'}`}>{overdue ? 'OVERDUE' : 'PENDING'}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{formatDate(item.dueAt)} - {item.assignedTo?.name || lead.assignedTo?.name || 'Unassigned'}</p>
                  </div>;
                })}
                {!lead.followups?.some((item: any) => item.status === 'PENDING') && <div className="mt-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">No next communication is scheduled.</div>}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm font-bold">
                  <a href={lead.phone ? `tel:${lead.phone}` : '#'} className="rounded-lg bg-slate-950 px-3 py-3 text-white">Call</a>
                  <button onClick={openWhatsapp} className="rounded-lg bg-emerald-600 px-3 py-3 text-white">WhatsApp</button>
                  <Link href={`/communications?leadId=${lead.id}&mode=email`} className="rounded-lg bg-brandGold px-3 py-3 text-slate-950">Email</Link>
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="font-bold">Schedule next action</h3>
                <select value={nextActionType} onChange={(event) => setNextActionType(event.target.value)} className="mt-3 w-full rounded-lg border bg-white px-3 py-3 text-sm">
                  <option value="CALL">Call client</option>
                  <option value="WHATSAPP">Send WhatsApp</option>
                  <option value="EMAIL">Send email</option>
                  <option value="TEAM_MEMBER">Contact through team member</option>
                  <option value="FOLLOW_UP">General follow-up</option>
                </select>
                <textarea value={nextActionNote} onChange={(event) => setNextActionNote(event.target.value)} placeholder="What needs to happen next?" className="mt-3 h-24 w-full rounded-lg border bg-white px-3 py-3 text-sm" />
                <input type="datetime-local" value={nextActionAt} onChange={(event) => setNextActionAt(event.target.value)} className="mt-3 w-full rounded-lg border bg-white px-3 py-3 text-sm" />
                <button onClick={scheduleNextAction} disabled={!nextActionNote.trim() || !nextActionAt} className="mt-3 w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">Schedule reminder</button>
              </div>
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

          <section className="card mt-5 p-4 sm:mt-6 sm:p-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div><h2 className="text-xl font-bold">Important Activity</h2><p className="mt-1 text-sm text-slate-500">The key moments needed to understand this opportunity quickly.</p></div>
              <span className="text-sm font-semibold text-slate-500">{importantTimeline.length} important events</span>
            </div>
            <div className="relative mt-6 space-y-4 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-slate-200 sm:before:left-[19px]">
              {displayedTimeline.map((item: any) => <article key={item.id} className="relative pl-11 sm:pl-14">
                <div className="absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-slate-950 text-[9px] font-bold text-white shadow-sm sm:h-10 sm:w-10">
                  {item.type.slice(0, 2)}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase text-brandGoldDark">{item.type.replaceAll('_', ' ')}</div>
                      <h3 className="mt-1 break-words font-bold text-slate-950">{item.title}</h3>
                    </div>
                    <time className="shrink-0 text-xs text-slate-500">{formatDate(item.at)}</time>
                  </div>
                  {item.detail && <p className="mt-2 break-words text-sm leading-6 text-slate-600">{item.detail}</p>}
                  <p className="mt-2 text-xs text-slate-500">
                    {item.actor?.name || 'System'}
                    {(item.actorRole || item.actor?.role) ? ` - ${(item.actorRole || item.actor.role).replaceAll('_', ' ')}` : ''}
                  </p>
                  {item.recordingFile && <button onClick={() => download(item.recordingFile.id)} className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:border-brandGold">Download Recording</button>}
                  {canManage && (item.ipAddress || item.userAgent) && <div className="mt-3 break-all rounded-lg bg-slate-50 p-2 text-xs text-slate-500">IP: {item.ipAddress || '-'}<br />Agent: {item.userAgent || '-'}</div>}
                </div>
              </article>)}
              {!importantTimeline.length && <p className="pl-11 text-sm text-slate-500 sm:pl-14">No important activity yet.</p>}
            </div>
            {importantTimeline.length > 8 && <button onClick={() => setShowAllTimeline((value) => !value)} className="mt-5 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold">
              {showAllTimeline ? 'Show recent activity only' : `Show all ${importantTimeline.length} important events`}
            </button>}
          </section>
        </>
      )}
    </AppShell>
  );
}
