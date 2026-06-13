'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { StageChangeModal } from './StageChangeModal';

type Person = { id?: string; name: string; role?: string };
type Lead = {
  id: string;
  organization: string;
  contactName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  source?: string;
  requirement?: string;
  priority: string;
  status: string;
  expectedValue?: number | string;
  nextFollowupAt?: string;
  assignedTo?: Person;
  client?: { id: string; organization: string };
  deals?: { id: string; title: string; stage: string; expectedValue?: number | string; probability?: number; updatedAt: string }[];
  activities?: { summary: string; details?: string; createdAt: string; user?: Person }[];
  callLogs?: { status?: string; productInterest?: string; budgetDiscussed?: number | string; summary?: string; createdAt: string; employee?: Person }[];
  emailMessages?: { subject?: string; sentAt?: string; createdAt: string; senderUser?: Person }[];
  whatsappLogs?: { message?: string; createdAt: string; employee?: Person }[];
};

const stages = [
  { id: 'NEW_LEAD', label: 'New Lead', accepts: ['NEW_LEAD'], color: 'border-blue-400' },
  { id: 'STARTED', label: 'Contacted / Started', accepts: ['CONTACTED', 'STARTED'], color: 'border-cyan-400' },
  { id: 'IN_PROGRESS', label: 'Interested', accepts: ['IN_PROGRESS', 'REQUIREMENT_COLLECTED', 'DEMO_SCHEDULED', 'DEMO_COMPLETED', 'QUOTATION_SENT', 'NEGOTIATION', 'PAYMENT_PENDING'], color: 'border-amber-400' },
  { id: 'FOLLOW_UP_LATER', label: 'Follow-up Later', accepts: ['FOLLOW_UP_LATER', 'ON_HOLD'], color: 'border-violet-400' },
  { id: 'CONVERTED', label: 'Converted / Deal', accepts: ['CONVERTED'], color: 'border-emerald-500' },
  { id: 'LOST', label: 'Lost / Failed', accepts: ['LOST', 'INVALID_CONTACT'], color: 'border-red-400' }
];

function money(value?: number | string) {
  if (value === undefined || value === null || value === '') return '-';
  return `Rs ${Number(value).toLocaleString('en-IN')}`;
}

function touch(lead: Lead) {
  const items = [
    ...(lead.callLogs || []).map((item) => ({ type: 'Call', at: item.createdAt, by: item.employee?.name, text: item.summary })),
    ...(lead.emailMessages || []).map((item) => ({ type: 'Email', at: item.sentAt || item.createdAt, by: item.senderUser?.name, text: item.subject })),
    ...(lead.whatsappLogs || []).map((item) => ({ type: 'WhatsApp', at: item.createdAt, by: item.employee?.name, text: item.message })),
    ...(lead.activities || []).map((item) => ({ type: 'Note', at: item.createdAt, by: item.user?.name, text: item.details || item.summary }))
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items[0];
}

export function LeadKanbanBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads.filter((lead: any) => !lead.deletedAt));
  const [draggedId, setDraggedId] = useState('');
  const [overStage, setOverStage] = useState('');
  const [pending, setPending] = useState<{ lead: Lead; stage: string } | null>(null);
  const [quick, setQuick] = useState<{ lead: Lead; type: 'note' | 'followup' } | null>(null);
  const [quickText, setQuickText] = useState('');
  const [quickDate, setQuickDate] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [handler, setHandler] = useState('');
  const [dueFilter, setDueFilter] = useState('all');

  const handlers = useMemo(() => Array.from(new Map(leads.filter((lead) => lead.assignedTo?.id).map((lead) => [lead.assignedTo!.id!, lead.assignedTo!])).values()), [leads]);
  const visibleLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = Date.now();
    return leads.filter((lead) => {
      const matchesSearch = !query || [lead.organization, lead.contactName, lead.phone, lead.email, lead.source, lead.requirement, lead.assignedTo?.name]
        .some((value) => value?.toLowerCase().includes(query));
      const matchesHandler = !handler || lead.assignedTo?.id === handler;
      const due = lead.nextFollowupAt ? new Date(lead.nextFollowupAt).getTime() : 0;
      const matchesDue = dueFilter === 'all' || (dueFilter === 'overdue' ? due > 0 && due < now : due > now);
      return matchesSearch && matchesHandler && matchesDue;
    });
  }, [leads, search, handler, dueFilter]);
  const grouped = useMemo(() => stages.map((stage) => ({
    ...stage,
    leads: visibleLeads.filter((lead) => stage.accepts.includes(lead.status))
  })), [visibleLeads]);

  function requestMove(leadId: string, stage: string) {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || stage === lead.status || stages.find((item) => item.id === stage)?.accepts.includes(lead.status)) return;
    if (['FOLLOW_UP_LATER', 'LOST', 'CONVERTED'].includes(stage)) {
      setPending({ lead, stage });
      return;
    }
    move(lead, stage, {});
  }

  async function move(lead: Lead, stage: string, values: { note?: string; nextFollowupAt?: string }) {
    setMessage('');
    try {
      await api(`/leads/${lead.id}/stage`, { method: 'POST', body: JSON.stringify({ status: stage, ...values }) });
      setLeads((current) => current.map((item) => item.id === lead.id ? {
        ...item,
        status: stage,
        nextFollowupAt: values.nextFollowupAt || item.nextFollowupAt,
        deals: stage === 'CONVERTED' && !item.deals?.length
          ? [{ id: `${item.id}-deal`, title: item.organization, stage: 'CONVERTED', expectedValue: item.expectedValue, probability: 100, updatedAt: new Date().toISOString() }]
          : item.deals
      } : item));
      setPending(null);
      setMessage(`${lead.organization} moved to ${stages.find((item) => item.id === stage)?.label}.`);
    } catch (error: any) {
      setPending(null);
      setMessage(error.message || 'Could not move opportunity.');
    }
  }

  function openQuick(lead: Lead, type: 'note' | 'followup') {
    setQuick({ lead, type });
    setQuickText('');
    setQuickDate('');
  }

  async function saveQuick() {
    if (!quick || !quickText.trim() || (quick.type === 'followup' && !quickDate)) return;
    setMessage('');
    try {
      if (quick.type === 'note') {
        await api(`/leads/${quick.lead.id}/notes`, { method: 'POST', body: JSON.stringify({ note: quickText }) });
        setLeads((current) => current.map((item) => item.id === quick.lead.id ? {
          ...item,
          activities: [{ summary: 'Note added', details: quickText, createdAt: new Date().toISOString() }, ...(item.activities || [])]
        } : item));
      } else {
        await api('/followups', {
          method: 'POST',
          body: JSON.stringify({
            leadId: quick.lead.id,
            assignedToId: quick.lead.assignedTo?.id,
            title: quickText,
            dueAt: quickDate
          })
        });
        await api(`/leads/${quick.lead.id}`, { method: 'PATCH', body: JSON.stringify({ nextFollowupAt: quickDate }) });
        setLeads((current) => current.map((item) => item.id === quick.lead.id ? { ...item, nextFollowupAt: quickDate } : item));
      }
      setMessage(quick.type === 'note' ? 'Note added to the opportunity timeline.' : 'Follow-up scheduled.');
      setQuick(null);
    } catch (error: any) {
      setMessage(error.message || 'Could not save action.');
    }
  }

  return <>
    <section className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_14rem_12rem_auto]">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, contact, handler, source..." className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
      <select value={handler} onChange={(event) => setHandler(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
        <option value="">All handlers</option>
        {handlers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <select value={dueFilter} onChange={(event) => setDueFilter(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
        <option value="all">All follow-ups</option>
        <option value="overdue">Overdue</option>
        <option value="upcoming">Upcoming</option>
      </select>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 px-3 py-2 text-sm"><span className="text-slate-500">Visible</span><b>{visibleLeads.length}</b></div>
    </section>
    {message && <div className="mb-4 rounded-xl bg-slate-900 p-3 text-sm text-white">{message}</div>}
    <div className="max-w-full overflow-x-auto pb-4">
      <div className="grid min-w-[1780px] grid-cols-6 gap-4">
        {grouped.map((stage) => <section
          key={stage.id}
          onDragOver={(event) => { event.preventDefault(); setOverStage(stage.id); }}
          onDragLeave={() => setOverStage('')}
          onDrop={(event) => {
            event.preventDefault();
            requestMove(event.dataTransfer.getData('text/lead-id') || draggedId, stage.id);
            setOverStage('');
          }}
          className={`min-h-[560px] rounded-lg border border-slate-200 border-t-4 bg-slate-100 p-3 transition ${stage.color} ${overStage === stage.id ? 'ring-2 ring-brandGold ring-offset-2' : ''}`}
        >
          <header className="mb-3 flex items-center justify-between gap-3 px-1"><h2 className="font-bold">{stage.label}</h2><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold shadow-sm">{stage.leads.length}</span></header>
          <div className="space-y-3">
            {stage.leads.map((lead) => {
              const latest = touch(lead);
              const deal = lead.deals?.[0];
              const productInterest = lead.callLogs?.[0]?.productInterest || lead.requirement;
              const value = deal?.expectedValue || lead.expectedValue || lead.callLogs?.[0]?.budgetDiscussed;
              const overdue = lead.nextFollowupAt && new Date(lead.nextFollowupAt).getTime() < Date.now() && !['CONVERTED', 'LOST'].includes(lead.status);
              const whatsapp = (lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, '');
              return <article
                key={lead.id}
                draggable
                onDragStart={(event) => { setDraggedId(lead.id); event.dataTransfer.setData('text/lead-id', lead.id); event.dataTransfer.effectAllowed = 'move'; }}
                onDragEnd={() => { setDraggedId(''); setOverStage(''); }}
                className={`cursor-grab rounded-lg border bg-white p-4 shadow-sm transition hover:border-brandGold hover:shadow-md active:cursor-grabbing ${draggedId === lead.id ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/leads/${lead.id}`} className="min-w-0 break-words font-bold text-slate-950 hover:text-brandGoldDark">{lead.organization}</Link>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${lead.priority === 'URGENT' ? 'bg-red-100 text-red-700' : lead.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`}>{lead.priority}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{lead.contactName || 'No contact person'}</p>
                {deal && <div className="mt-2 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-800">Deal active: {deal.stage.replaceAll('_', ' ')}{deal.probability ? ` - ${deal.probability}%` : ''}</div>}
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <p className="truncate">{lead.phone || lead.email || 'No contact detail'}</p>
                  <p>Handler: <b>{lead.assignedTo?.name || 'Unassigned'}</b></p>
                  <p>Source: {lead.source || '-'}</p>
                  <p className="line-clamp-2">Interest: {productInterest || '-'}</p>
                  <p>Expected value: {money(value)}</p>
                  <p className={overdue ? 'font-bold text-red-600' : ''}>Follow-up: {lead.nextFollowupAt ? new Date(lead.nextFollowupAt).toLocaleString() : '-'}{overdue ? ' (Overdue)' : ''}</p>
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
                  <span className="font-bold text-slate-700">{latest?.type || 'Activity'}:</span> {latest?.text || 'No activity yet'}
                  {latest && <div className="mt-1">{latest.by || 'System'} - {new Date(latest.at).toLocaleString()}</div>}
                </div>
                <div className="mt-3 grid grid-cols-4 gap-1 text-center text-[11px] font-bold">
                  <a href={lead.phone ? `tel:${lead.phone}` : '#'} className="rounded-lg border px-1 py-2">Call</a>
                  <a href={whatsapp ? `https://wa.me/${whatsapp}` : '#'} target="_blank" rel="noreferrer" className="rounded-lg border px-1 py-2">WhatsApp</a>
                  <Link href={`/communications?leadId=${lead.id}&mode=email`} className="rounded-lg border px-1 py-2">Email</Link>
                  <Link href={`/leads/${lead.id}`} className="rounded-lg bg-slate-950 px-1 py-2 text-white">Open</Link>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openQuick(lead, 'note')} className="rounded-lg border px-2 py-2 text-xs font-bold">Add note</button>
                  <button type="button" onClick={() => openQuick(lead, 'followup')} className="rounded-lg border px-2 py-2 text-xs font-bold">Follow-up</button>
                </div>
                <label className="mt-3 block text-xs font-bold text-slate-600 sm:hidden">
                  Move to stage
                  <select value={stage.id} onChange={(event) => requestMove(lead.id, event.target.value)} onClick={(event) => event.stopPropagation()} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900">
                    {stages.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                  </select>
                </label>
              </article>;
            })}
            {!stage.leads.length && <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">Drop an opportunity here</div>}
          </div>
        </section>)}
      </div>
    </div>
    <StageChangeModal open={!!pending} stage={pending?.stage || ''} leadName={pending?.lead.organization} onCancel={() => setPending(null)} onConfirm={(values) => pending && move(pending.lead, pending.stage, values)} />
    {quick && <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/60 sm:items-center sm:justify-center sm:p-6">
      <section className="w-full rounded-t-xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-xl sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{quick.type === 'note' ? 'Add note' : 'Schedule follow-up'}</h2><p className="mt-1 text-sm text-slate-500">{quick.lead.organization}</p></div><button onClick={() => setQuick(null)} className="h-10 w-10 rounded-lg border font-bold">X</button></div>
        <textarea value={quickText} onChange={(event) => setQuickText(event.target.value)} placeholder={quick.type === 'note' ? 'Write the handling note...' : 'Follow-up purpose'} className="mt-4 h-28 w-full rounded-lg border px-3 py-3 text-sm" />
        {quick.type === 'followup' && <input type="datetime-local" value={quickDate} onChange={(event) => setQuickDate(event.target.value)} className="mt-3 w-full rounded-lg border px-3 py-3 text-sm" />}
        <button disabled={!quickText.trim() || (quick.type === 'followup' && !quickDate)} onClick={saveQuick} className="mt-4 w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">Save</button>
      </section>
    </div>}
  </>;
}
