'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

export default function TemplatesPage() {
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [emailForm, setEmailForm] = useState({ name: '', subject: '', bodyHtml: '' });
  const [waForm, setWaForm] = useState({ name: '', message: '' });
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      setEmailTemplates(await api<any[]>('/email/templates'));
      setWhatsappTemplates(await api<any[]>('/whatsapp/templates'));
    } catch (e: any) { setMsg(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function createEmail(e: FormEvent) {
    e.preventDefault();
    try { await api('/email/templates', { method: 'POST', body: JSON.stringify(emailForm) }); setEmailForm({ name: '', subject: '', bodyHtml: '' }); setMsg('Email template created.'); load(); } catch (e: any) { setMsg(e.message); }
  }

  async function createWhatsapp(e: FormEvent) {
    e.preventDefault();
    try { await api('/whatsapp/templates', { method: 'POST', body: JSON.stringify(waForm) }); setWaForm({ name: '', message: '' }); setMsg('WhatsApp template created.'); load(); } catch (e: any) { setMsg(e.message); }
  }

  return (
    <AppShell>
      <PageHeader title="Company Templates" subtitle="Owner/Manager creates master email and WhatsApp templates. Employees can edit copies before sending but cannot modify these master templates." />
      {msg && <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm">{msg}</div>}
      <div className="grid grid-cols-2 gap-6">
        <section className="card p-6">
          <h2 className="text-xl font-bold">Create Email Template</h2>
          <form onSubmit={createEmail} className="mt-4 space-y-3">
            <input required value={emailForm.name} onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" placeholder="Template name" />
            <input required value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" placeholder="Subject, e.g. Proposal for {{organization_name}}" />
            <textarea required value={emailForm.bodyHtml} onChange={(e) => setEmailForm({ ...emailForm, bodyHtml: e.target.value })} className="h-40 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Body with variables: {{contact_person}}, {{organization_name}}, {{employee_name}}" />
            <button className="rounded-xl bg-brandGold px-6 py-3 font-bold text-slate-950">Save Email Template</button>
          </form>
          <h3 className="mt-8 font-bold">Existing Email Templates</h3>
          {emailTemplates.map((t) => <div key={t.id} className="mt-3 rounded-xl border p-3 text-sm"><b>{t.name}</b><div className="text-slate-500">{t.subject}</div></div>)}
        </section>

        <section className="card p-6">
          <h2 className="text-xl font-bold">Create WhatsApp Template</h2>
          <form onSubmit={createWhatsapp} className="mt-4 space-y-3">
            <input required value={waForm.name} onChange={(e) => setWaForm({ ...waForm, name: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" placeholder="Template name" />
            <textarea required value={waForm.message} onChange={(e) => setWaForm({ ...waForm, message: e.target.value })} className="h-40 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Message with variables: {{contact_person}}, {{organization_name}}, {{employee_name}}" />
            <button className="rounded-xl bg-brandGold px-6 py-3 font-bold text-slate-950">Save WhatsApp Template</button>
          </form>
          <h3 className="mt-8 font-bold">Existing WhatsApp Templates</h3>
          {whatsappTemplates.map((t) => <div key={t.id} className="mt-3 rounded-xl border p-3 text-sm"><b>{t.name}</b><div className="text-slate-500">{t.message}</div></div>)}
        </section>
      </div>
    </AppShell>
  );
}
