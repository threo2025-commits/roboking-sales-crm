'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

function renderTemplate(text: string, vars: Record<string, string>) {
  return text.replaceAll('{{contact_person}}', vars.contactName || 'there')
    .replaceAll('{{organization_name}}', vars.organization || 'your organization')
    .replaceAll('{{employee_name}}', vars.employeeName || 'RoboKing Team');
}

export default function CommunicationsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedDealId, setSelectedDealId] = useState('');
  const [phone, setPhone] = useState('919876543210');
  const [contactName, setContactName] = useState('Mr. Sharma');
  const [organization, setOrganization] = useState('Delhi Public School');
  const [message, setMessage] = useState('Hello {{contact_person}}, this is {{employee_name}} from RoboKing. May I share details about our STEM and Robotics solutions for {{organization_name}}?');
  const [email, setEmail] = useState({ toEmail: '', subject: '', bodyHtml: '' });
  const [callLog, setCallLog] = useState<any>({ phone: '', status: 'CONNECTED', durationSeconds: '', objectionReason: '', budgetDiscussed: '', productInterest: '', summary: '' });
  const [recording, setRecording] = useState<File | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [status, setStatus] = useState('');
  const [employeeName, setEmployeeName] = useState('RoboKing Team');

  async function load() {
    try {
      setLeads(await api<any[]>('/leads'));
      setClients(await api<any[]>('/clients'));
      setDeals(await api<any[]>('/deals'));
      setEmailTemplates(await api<any[]>('/email/templates'));
      setWhatsappTemplates(await api<any[]>('/whatsapp/templates'));
      try { setEmployeeName(JSON.parse(localStorage.getItem('rk_crm_user') || '{}').name || 'RoboKing Team'); } catch {}
    } catch (e: any) { setStatus(e.message); }
  }

  useEffect(() => { load(); }, []);

  function applyLead(id: string) {
    setSelectedLeadId(id);
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    setPhone((lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, ''));
    setContactName(lead.contactName || 'there');
    setOrganization(lead.organization || '');
    setEmail((prev) => ({ ...prev, toEmail: lead.email || prev.toEmail }));
    setCallLog((prev: any) => ({ ...prev, phone: lead.phone || prev.phone, clientName: lead.organization }));
  }

  function applyClient(id: string) {
    setSelectedClientId(id);
    const client = clients.find((c) => c.id === id);
    if (!client) return;
    const contact = client.contacts?.[0];
    setPhone((contact?.whatsapp || contact?.phone || phone).replace(/[^0-9]/g, ''));
    setContactName(contact?.name || contactName);
    setOrganization(client.organization || organization);
    setEmail((prev) => ({ ...prev, toEmail: contact?.email || prev.toEmail }));
    setCallLog((prev: any) => ({ ...prev, phone: contact?.phone || prev.phone, clientName: client.organization }));
  }

  function applyDeal(id: string) {
    setSelectedDealId(id);
    const deal = deals.find((d) => d.id === id);
    if (!deal) return;
    const lead = deal.lead;
    const client = deal.client;
    if (lead?.id) setSelectedLeadId(lead.id);
    if (client?.id) setSelectedClientId(client.id);
    setPhone((lead?.whatsapp || lead?.phone || phone).replace(/[^0-9]/g, ''));
    setContactName(lead?.contactName || contactName);
    setOrganization(lead?.organization || client?.organization || organization);
    setEmail((prev) => ({ ...prev, toEmail: lead?.email || prev.toEmail }));
    setCallLog((prev: any) => ({ ...prev, phone: lead?.phone || prev.phone, clientName: lead?.organization || client?.organization || prev.clientName }));
  }

  function applyWhatsappTemplate(id: string) {
    const template = whatsappTemplates.find((t) => t.id === id);
    if (template) setMessage(template.message);
  }

  function applyEmailTemplate(id: string) {
    const template = emailTemplates.find((t) => t.id === id);
    if (!template) return;
    const vars = { contactName, organization, employeeName };
    setEmail((prev) => ({ ...prev, subject: renderTemplate(template.subject, vars), bodyHtml: renderTemplate(template.bodyHtml, vars) }));
  }

  async function openWhatsApp() {
    const rendered = renderTemplate(message, { contactName, organization, employeeName });
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(rendered)}`;
    try { await api('/whatsapp/open-url', { method: 'POST', body: JSON.stringify({ phone, message: rendered, leadId: selectedLeadId || undefined }) }); } catch {}
    window.open(url, '_blank');
  }

  async function sendEmail() {
    setStatus('');
    try {
      const fd = new FormData();
      if (selectedLeadId) fd.append('leadId', selectedLeadId);
      fd.append('toEmail', email.toEmail);
      fd.append('subject', email.subject);
      fd.append('bodyHtml', email.bodyHtml.replaceAll('\n', '<br/>'));
      attachments.forEach((file) => fd.append('attachments', file));
      await api('/email/send', { method: 'POST', body: fd });
      setStatus('Email sent from employee Hostinger email and auto-BCC applied.');
    } catch (e: any) { setStatus(e.message); }
  }

  async function saveCallLog() {
    setStatus('');
    if (!recording) { setStatus('Call recording upload is mandatory.'); return; }
    const fd = new FormData();
    if (selectedLeadId) fd.append('leadId', selectedLeadId);
    if (selectedClientId) fd.append('clientId', selectedClientId);
    if (selectedDealId) fd.append('dealId', selectedDealId);
    Object.entries(callLog).forEach(([k, v]) => v && fd.append(k, String(v)));
    fd.append('recording', recording);
    try { await api('/calls/log', { method: 'POST', body: fd }); setStatus('Call log saved with mandatory recording.'); }
    catch (e: any) { setStatus(e.message); }
  }

  return (
    <AppShell>
      <PageHeader title="Communications" subtitle="Call, WhatsApp, email, and manual client conversation entry from one screen." />
      <section className="card mb-6 p-6">
        <h2 className="text-xl font-bold">Select Communication Context</h2>
        <p className="mt-1 text-sm text-slate-500">Link calls to a lead, client, or deal. Selecting an item auto-fills contact details where available.</p>
        <select value={selectedLeadId} onChange={(e) => applyLead(e.target.value)} className="mt-4 w-full rounded-xl border px-4 py-3 text-sm">
          <option value="">No linked lead</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.organization} - {l.contactName || 'No contact'} - {l.phone || l.email || 'No contact detail'}</option>)}
        </select>
        <select value={selectedClientId} onChange={(e) => applyClient(e.target.value)} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm">
          <option value="">No linked client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.organization} - {c.contacts?.[0]?.phone || c.contacts?.[0]?.email || 'No contact detail'}</option>)}
        </select>
        <select value={selectedDealId} onChange={(e) => applyDeal(e.target.value)} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm">
          <option value="">No linked deal</option>
          {deals.map((d) => <option key={d.id} value={d.id}>{d.title} - {d.stage?.replaceAll('_', ' ')}</option>)}
        </select>
      </section>

      <div className="grid grid-cols-3 gap-6">
        <section className="card p-6">
          <h2 className="text-xl font-bold">WhatsApp Prefill</h2>
          <p className="mt-1 text-sm text-slate-500">Opens employee&apos;s own WhatsApp app/web with client number and message.</p>
          <select onChange={(e) => applyWhatsappTemplate(e.target.value)} className="mt-4 w-full rounded-xl border px-4 py-3 text-sm"><option value="">Choose WhatsApp template</option>{whatsappTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="WhatsApp number with country code" />
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Client name" />
          <input value={organization} onChange={(e) => setOrganization(e.target.value)} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Organization" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="mt-3 h-32 w-full rounded-xl border px-4 py-3 text-sm" />
          <button onClick={openWhatsApp} className="mt-3 w-full rounded-xl bg-emerald-500 py-3 font-bold text-white">Open WhatsApp</button>
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-bold">Email Compose</h2>
          <p className="mt-1 text-sm text-slate-500">Sends from logged-in employee Hostinger email and auto-BCCs admin.</p>
          <select onChange={(e) => applyEmailTemplate(e.target.value)} className="mt-4 w-full rounded-xl border px-4 py-3 text-sm"><option value="">Choose email template</option>{emailTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <input value={email.toEmail} onChange={(e) => setEmail({ ...email, toEmail: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="To" />
          <input value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Subject" />
          <textarea value={email.bodyHtml} onChange={(e) => setEmail({ ...email, bodyHtml: e.target.value })} className="mt-3 h-32 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Body" />
          <input type="file" multiple onChange={(e) => setAttachments(Array.from(e.target.files || []))} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" />
          <button onClick={sendEmail} className="mt-3 w-full rounded-xl bg-brandGold py-3 font-bold text-slate-950">Send Email</button>
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-bold">Manual Call Entry</h2>
          <p className="mt-1 text-sm text-slate-500">Select a linked lead, client, or deal above. Recording upload is mandatory.</p>
          <input value={callLog.phone} onChange={(e) => setCallLog({ ...callLog, phone: e.target.value })} className="mt-4 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Phone" />
          <a href={callLog.phone ? `tel:${callLog.phone}` : '#'} className="mt-3 block w-full rounded-xl bg-slate-950 py-3 text-center font-bold text-white">Call Client</a>
          <input value={callLog.durationSeconds} onChange={(e) => setCallLog({ ...callLog, durationSeconds: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Duration seconds" />
          <input value={callLog.objectionReason} onChange={(e) => setCallLog({ ...callLog, objectionReason: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Objection / reason" />
          <input value={callLog.budgetDiscussed} onChange={(e) => setCallLog({ ...callLog, budgetDiscussed: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Budget discussed" />
          <input value={callLog.productInterest} onChange={(e) => setCallLog({ ...callLog, productInterest: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Product interest" />
          <textarea value={callLog.summary} onChange={(e) => setCallLog({ ...callLog, summary: e.target.value })} className="mt-3 h-20 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Call summary" />
          <input type="file" onChange={(e) => setRecording(e.target.files?.[0] || null)} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" />
          <button onClick={saveCallLog} className="mt-3 w-full rounded-xl bg-slate-950 py-3 font-bold text-white">Save Call Log</button>
        </section>
      </div>
      {status && <div className="mt-6 rounded-xl bg-slate-900 p-4 text-sm text-white">{status}</div>}
    </AppShell>
  );
}
