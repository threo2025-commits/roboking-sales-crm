'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

type Client = { id: string; organization: string; city?: string; state?: string; contacts?: any[]; leads?: any[]; deals?: any[]; callLogs?: any[] };
const empty = { organization: '', contactName: '', phone: '', whatsapp: '', email: '', city: '', state: '', category: '', source: '' };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState<any>(empty);
  const [msg, setMsg] = useState('');
  async function load() { try { setClients(await api<Client[]>('/clients')); } catch (e: any) { setMsg(e.message); } }
  useEffect(() => { load(); }, []);
  async function create(e: FormEvent) { e.preventDefault(); setMsg(''); try { await api('/clients', { method: 'POST', body: JSON.stringify(form) }); setForm(empty); setMsg('Client created.'); load(); } catch (e: any) { setMsg(e.message); } }
  return (
    <AppShell>
      <PageHeader title="Clients" subtitle="Converted or long-term organizations with contacts, deals and activity history." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        <form onSubmit={create} className="card p-4 sm:p-6">
          <h2 className="text-xl font-bold">Create Client</h2>
          {['organization','contactName','phone','whatsapp','email','city','state','category','source'].map((k) => <input key={k} value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={k} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" required={k==='organization'} />)}
          <button className="mt-3 w-full rounded-xl bg-brandGold py-3 font-bold text-slate-950">Create Client</button>
          {msg && <div className="mt-3 rounded-xl bg-slate-100 p-3 text-sm">{msg}</div>}
        </form>
        <section className="card overflow-x-auto p-4 sm:p-6 lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Client List</h2>
          <table className="w-full min-w-[680px] text-left text-sm"><thead className="text-xs uppercase text-slate-400"><tr><th className="py-3">Organization</th><th>Contact</th><th>Location</th><th>Deals</th><th>Calls</th></tr></thead><tbody>
            {clients.map((c) => <tr key={c.id} className="border-t border-slate-100"><td className="py-4 font-semibold"><Link href={`/clients/${c.id}`} className="text-brandGoldDark">{c.organization}</Link></td><td>{c.contacts?.[0]?.name || '-'}<div className="text-slate-500">{c.contacts?.[0]?.phone || c.contacts?.[0]?.email}</div></td><td>{[c.city,c.state].filter(Boolean).join(', ') || '-'}</td><td>{c.deals?.length || 0}</td><td>{c.callLogs?.length || 0}</td></tr>)}
            {!clients.length && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No clients yet.</td></tr>}
          </tbody></table>
        </section>
      </div>
    </AppShell>
  );
}
