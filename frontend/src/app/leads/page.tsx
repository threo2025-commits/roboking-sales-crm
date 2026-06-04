'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';

type Lead = {
  id: string;
  organization: string;
  contactName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  status: string;
  nextFollowupAt?: string;
  duplicateOfId?: string;
  duplicateReason?: string;
  deletedAt?: string;
};

const empty = { organization: '', contactName: '', phone: '', whatsapp: '', email: '', city: '', state: '', requirement: '', source: '', priority: 'MEDIUM', nextFollowupAt: '' };

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [allowDuplicateOverride, setAllowDuplicateOverride] = useState(false);
  const [role, setRole] = useState('');
  const canDelete = role === 'OWNER' || role === 'MANAGER';

  async function load() {
    try {
      setLeads(await api<Lead[]>('/leads'));
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
    try {
      setRole(JSON.parse(localStorage.getItem('rk_crm_user') || '{}').role || '');
    } catch {}
  }, []);

  async function createLead(e: FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    try {
      await api('/leads', { method: 'POST', body: JSON.stringify({ ...form, nextFollowupAt: form.nextFollowupAt || undefined, allowDuplicateOverride }) });
      setOk('Lead created successfully. Owner/Manager can see and reassign it immediately.');
      setForm(empty);
      setAllowDuplicateOverride(false);
      load();
    } catch (e: any) {
      setError(e.message?.includes('DUPLICATE_CONTACT_FOUND') ? 'Duplicate contact found. Exact phone/email already exists. Owner/Manager can override.' : e.message);
    }
  }

  async function deleteLead(id: string, organization: string) {
    if (!confirm(`Delete lead "${organization}"? It will be hidden from PA and Employee dashboards, but Owner/Manager can still see it in red.`)) return;
    setError('');
    setOk('');
    try {
      await api(`/leads/${id}`, { method: 'DELETE' });
      setOk('Lead deleted. Owner/Manager can still see it marked in red.');
      load();
    } catch (e: any) {
      setError(e.message || 'Could not delete lead.');
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="My Leads"
        subtitle={canDelete ? 'Owner/Manager can delete leads. Deleted leads stay visible here in red and are hidden from PA/Employee views.' : 'Create manual leads, view assigned clients, and catch duplicate contacts before they enter the system.'}
      />
      <div className="grid grid-cols-3 gap-6">
        <form onSubmit={createLead} className="card p-6">
          <h2 className="text-xl font-bold">Add Manual Lead</h2>
          <p className="mt-1 text-sm text-slate-500">Employee-created leads are visible to Owner/Manager immediately.</p>
          <div className="mt-5 space-y-3">
            <input required placeholder="Organization / School / Company" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" />
            <input placeholder="Contact person" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" />
            <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" />
            <input placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" />
            <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" />
            <textarea placeholder="Requirement" value={form.requirement} onChange={(e) => setForm({ ...form, requirement: e.target.value })} className="h-24 w-full rounded-xl border px-4 py-3 text-sm" />
            <input type="datetime-local" value={form.nextFollowupAt} onChange={(e) => setForm({ ...form, nextFollowupAt: e.target.value })} className="w-full rounded-xl border px-4 py-3 text-sm" />
            {canDelete && (
              <label className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                <input type="checkbox" checked={allowDuplicateOverride} onChange={(e) => setAllowDuplicateOverride(e.target.checked)} /> Override exact duplicate phone/email if found
              </label>
            )}
            <button className="w-full rounded-xl bg-brandGold py-3 font-bold text-slate-950">Create Lead</button>
            {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            {ok && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{ok}</div>}
          </div>
        </form>

        <section className="card col-span-2 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Recent Leads</h2>
            <button onClick={load} className="rounded-xl border px-4 py-2 text-sm font-bold">Refresh</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="py-3">Organization</th>
                  <th>Contact</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Next Follow-up</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className={`border-t ${lead.deletedAt ? 'border-red-200 bg-red-50 text-red-900' : 'border-slate-100'}`}>
                    <td className="py-4 font-semibold">
                      {lead.organization}
                      {lead.deletedAt && <div className="mt-1 text-xs font-bold uppercase text-red-700">Deleted lead</div>}
                      {lead.duplicateReason && <div className="mt-1 text-xs font-bold text-amber-600">Duplicate contact found</div>}
                    </td>
                    <td>{lead.contactName || '-'}</td>
                    <td>{lead.phone || '-'}</td>
                    <td>{lead.deletedAt ? <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">DELETED</span> : <StatusBadge status={lead.status} />}</td>
                    <td>{lead.nextFollowupAt ? new Date(lead.nextFollowupAt).toLocaleString() : '-'}</td>
                    <td className="space-x-3 font-semibold">
                      {!lead.deletedAt && <a href={lead.phone ? `tel:${lead.phone}` : '#'}>Call</a>}
                      {!lead.deletedAt && <a href={lead.whatsapp ? `https://wa.me/${lead.whatsapp}` : '#'}>WhatsApp</a>}
                      <Link href={`/leads/${lead.id}`}>View</Link>
                      {canDelete && !lead.deletedAt && (
                        <button onClick={() => deleteLead(lead.id, lead.organization)} className="font-bold text-red-600">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {!leads.length && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No leads yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
