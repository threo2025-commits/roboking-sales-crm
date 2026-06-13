'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { FileDropzone } from '@/components/FileDropzone';
import { api } from '@/lib/api';

function renderTemplate(text: string, vars: Record<string, string>) {
  return text.replaceAll('{{contact_person}}', vars.contactName || 'there')
    .replaceAll('{{organization_name}}', vars.organization || 'your organization')
    .replaceAll('{{employee_name}}', vars.employeeName || 'RoboKing Team');
}

export default function CommunicationsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
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
  const [role, setRole] = useState('');

  async function load() {
    try {
      setLeads(await api<any[]>('/leads'));
      setClients(await api<any[]>('/clients'));
      setEmailTemplates(await api<any[]>('/email/templates'));
      setWhatsappTemplates(await api<any[]>('/whatsapp/templates'));
      try {
        const stored = JSON.parse(localStorage.getItem('rk_crm_user') || '{}');
        setEmployeeName(stored.name || 'RoboKing Team');
        setRole(stored.role || '');
      } catch {}
    } catch (e: any) { setStatus(e.message); }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!leads.length || typeof window === 'undefined') return;
    const leadId = new URLSearchParams(window.location.search).get('leadId');
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.id === selectedLeadId) return;
    setSelectedLeadId(lead.id);
    setSelectedDealId(lead.deals?.[0]?.id || '');
    setPhone((lead.whatsapp || lead.phone || '').replace(/[^0-9]/g, ''));
    setContactName(lead.contactName || 'there');
    setOrganization(lead.organization || '');
    setEmail((current) => ({ ...current, toEmail: lead.email || current.toEmail }));
    setCallLog((current: any) => ({ ...current, phone: lead.phone || current.phone, clientName: lead.organization }));
  }, [leads, selectedLeadId]);

  function applyLead(id: string) {
    setSelectedLeadId(id);
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    setSelectedDealId(lead.deals?.[0]?.id || '');
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
      setStatus('Email sent from the configured employee mailbox.');
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
      <div className="mb-5 flex flex-wrap gap-2">
        <Link href="/chat" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Team Chat</Link>
        <Link href="/inbox" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold">Email Inbox</Link>
        {['OWNER', 'MANAGER'].includes(role) && <Link href="/templates" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold">Message Templates</Link>}
      </div>
      <section className="card mb-5 p-4 sm:mb-6 sm:p-6">
        <h2 className="text-xl font-bold">Select Communication Context</h2>
        <p className="mt-1 text-sm text-slate-500">Choose an opportunity or existing client. Linked deal details are attached automatically after conversion.</p>
        <select value={selectedLeadId} onChange={(e) => applyLead(e.target.value)} className="mt-4 w-full rounded-xl border px-4 py-3 text-sm">
          <option value="">No linked opportunity</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.organization} - {l.contactName || 'No contact'} - {l.phone || l.email || 'No contact detail'}</option>)}
        </select>
        <select value={selectedClientId} onChange={(e) => applyClient(e.target.value)} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm">
          <option value="">No linked client</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.organization} - {c.contacts?.[0]?.phone || c.contacts?.[0]?.email || 'No contact detail'}</option>)}
        </select>
        {selectedDealId && <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Linked deal context is active for this opportunity.</div>}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3 xl:gap-6">
        <section className="card p-4 sm:p-6">
          <h2 className="text-xl font-bold">WhatsApp Prefill</h2>
          <p className="mt-1 text-sm text-slate-500">Opens employee&apos;s own WhatsApp app/web with client number and message.</p>
          <select onChange={(e) => applyWhatsappTemplate(e.target.value)} className="mt-4 w-full rounded-xl border px-4 py-3 text-sm"><option value="">Choose WhatsApp template</option>{whatsappTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="WhatsApp number with country code" />
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Client name" />
          <input value={organization} onChange={(e) => setOrganization(e.target.value)} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Organization" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="mt-3 h-32 w-full rounded-xl border px-4 py-3 text-sm" />
          <button onClick={openWhatsApp} className="mt-3 w-full rounded-xl bg-emerald-500 py-3 font-bold text-white">Open WhatsApp</button>
        </section>

        <section className="card p-4 sm:p-6">
          <h2 className="text-xl font-bold">Email Compose</h2>
          <p className="mt-1 text-sm text-slate-500">Sends from the logged-in employee&apos;s configured Hostinger mailbox.</p>
          <select onChange={(e) => applyEmailTemplate(e.target.value)} className="mt-4 w-full rounded-xl border px-4 py-3 text-sm"><option value="">Choose email template</option>{emailTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <input value={email.toEmail} onChange={(e) => setEmail({ ...email, toEmail: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="To" />
          <input value={email.subject} onChange={(e) => setEmail({ ...email, subject: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Subject" />
          <textarea value={email.bodyHtml} onChange={(e) => setEmail({ ...email, bodyHtml: e.target.value })} className="mt-3 h-32 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Body" />
          <div className="mt-3"><FileDropzone label="Drag attachments here or click to upload" hint="Multiple common document/image files, up to 50MB each" multiple maxBytes={50 * 1024 * 1024} files={attachments} onFiles={setAttachments} /></div>
          <button onClick={sendEmail} className="mt-3 w-full rounded-xl bg-brandGold py-3 font-bold text-slate-950">Send Email</button>
        </section>

        <section className="card p-4 sm:p-6 lg:col-span-2 xl:col-span-1">
          <h2 className="text-xl font-bold">Manual Call Entry</h2>
          <p className="mt-1 text-sm text-slate-500">Select a linked lead, client, or deal above. Recording upload is mandatory.</p>
          <input value={callLog.phone} onChange={(e) => setCallLog({ ...callLog, phone: e.target.value })} className="mt-4 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Phone" />
          <a href={callLog.phone ? `tel:${callLog.phone}` : '#'} className="mt-3 block w-full rounded-xl bg-slate-950 py-3 text-center font-bold text-white">Call Client</a>
          <input value={callLog.durationSeconds} onChange={(e) => setCallLog({ ...callLog, durationSeconds: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Duration seconds" />
          <input value={callLog.objectionReason} onChange={(e) => setCallLog({ ...callLog, objectionReason: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Objection / reason" />
          <input value={callLog.budgetDiscussed} onChange={(e) => setCallLog({ ...callLog, budgetDiscussed: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Budget discussed" />
          <input value={callLog.productInterest} onChange={(e) => setCallLog({ ...callLog, productInterest: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Product interest" />
          <textarea value={callLog.summary} onChange={(e) => setCallLog({ ...callLog, summary: e.target.value })} className="mt-3 h-20 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Call summary" />
          <div className="mt-3"><FileDropzone label="Drag call recording here or click to upload" hint="Required: mp3, m4a, wav, aac, ogg, amr, mp4, webm, or 3gp; maximum 50MB" accept=".mp3,.m4a,.wav,.aac,.ogg,.amr,.mp4,.webm,.3gp" maxBytes={50 * 1024 * 1024} files={recording ? [recording] : []} onFiles={(files) => setRecording(files[0] || null)} /></div>
          <button onClick={saveCallLog} className="mt-3 w-full rounded-xl bg-slate-950 py-3 font-bold text-white">Save Call Log</button>
        </section>
      </div>
      {status && <div className="mt-6 rounded-xl bg-slate-900 p-4 text-sm text-white">{status}</div>}
    </AppShell>
  );
}
