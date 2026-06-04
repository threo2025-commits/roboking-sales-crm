'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { KpiCard } from '@/components/KpiCard';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';

const stageLabels = ['NEW_LEAD','CONTACTED','STARTED','IN_PROGRESS','QUOTATION_SENT','NEGOTIATION','CONVERTED'];

type Summary = { totalLeads: number; activeDeals: number; followupsToday: number; conversionRate: number; revenuePipeline: number; duplicateContacts: number; warnings?: string[] };

type StoredUser = { name: string; role: string; loginId: string } | null;

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [user, setUser] = useState<StoredUser>(null);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      setSummary(await api<Summary>('/dashboard/summary'));
      setLeads(await api<any[]>('/leads'));
      setFollowups(await api<any[]>('/followups/daily'));
      try { setUser(JSON.parse(localStorage.getItem('rk_crm_user') || 'null')); } catch {}
    } catch (e: any) { setMsg(e.message); }
  }

  useEffect(() => { load(); }, []);
  const roleTitle = user?.role === 'OWNER' ? 'Owner Dashboard' : user?.role === 'MANAGER' ? 'Manager Dashboard' : user?.role === 'PA_ADMIN_ASSISTANT' ? 'PA / Reminder Dashboard' : 'Employee Dashboard';
  const canManageSettings = user?.role === 'OWNER' || user?.role === 'MANAGER';

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-950">{roleTitle}</h1>
          <p className="text-slate-500">Live CRM summary for leads, follow-ups, communication and duplicate warnings.</p>
        </div>
        <button onClick={load} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">Refresh</button>
      </div>

      {msg && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</div>}
      {summary?.warnings?.length ? <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">{summary.warnings.join(', ')} · Review duplicate contacts from Leads/Imports.</div> : null}

      <div className="grid grid-cols-6 gap-4">
        <KpiCard label={user?.role === 'EMPLOYEE' ? 'My Leads' : 'Total Leads'} value={String(summary?.totalLeads ?? '-')} sub="Live database count" />
        <KpiCard label="Active Deals" value={String(summary?.activeDeals ?? '-')} sub="Open pipeline" />
        <KpiCard label="Follow-ups Today" value={String(summary?.followupsToday ?? '-')} sub="Daily dashboard" />
        <KpiCard label="Conversion Rate" value={`${summary?.conversionRate ?? '-'}%`} sub="MVP calculated metric" />
        <KpiCard label="Revenue Pipeline" value={`₹${Number(summary?.revenuePipeline || 0).toLocaleString()}`} sub="Expected value" />
        <KpiCard label="Duplicate Contacts" value={String(summary?.duplicateContacts ?? '-')} sub="Needs review" />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-6">
        <section className="card col-span-2 p-6">
          <div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">Pipeline Snapshot</h2><Link href="/deals" className="text-sm font-semibold text-brandGoldDark">View Deals →</Link></div>
          <div className="grid grid-cols-7 gap-2">
            {stageLabels.map((stage) => {
              const count = leads.filter((l) => l.status === stage).length;
              return <div key={stage} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="text-xs text-slate-500">{stage.replaceAll('_',' ')}</div><div className="mt-2 text-2xl font-bold">{count}</div><div className="mt-3 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-brandGold" style={{ width: `${Math.min(100, count * 12 + 10)}%` }} /></div></div>;
            })}
          </div>
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Today’s Follow-ups</h2><span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">{followups.length}</span></div>
          {followups.slice(0, 6).map((item) => <div key={item.id} className="border-b border-slate-100 py-3 text-sm"><div className="font-semibold text-slate-900">{new Date(item.dueAt).toLocaleTimeString()} · {item.lead?.organization || item.title}</div><div className="text-slate-500">{item.assignedTo?.name || '-'} · {item.notes || 'Call / WhatsApp / Email action pending'}</div></div>)}
          {!followups.length && <p className="text-sm text-slate-500">No follow-ups due today.</p>}
        </section>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-6">
        <section className="card col-span-2 p-6">
          <h2 className="mb-4 text-xl font-bold">Recent Leads & Clients</h2>
          <table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-400"><tr><th className="py-3">Organization</th><th>Contact</th><th>Phone</th><th>Status</th><th>Next Follow-up</th><th>Actions</th></tr></thead><tbody>
            {leads.slice(0, 8).map((lead) => <tr key={lead.id} className="border-t border-slate-100"><td className="py-4 font-semibold">{lead.organization}{lead.duplicateReason && <div className="text-xs text-amber-600">Duplicate contact found</div>}</td><td>{lead.contactName || '-'}</td><td>{lead.phone || '-'}</td><td><StatusBadge status={lead.status} /></td><td>{lead.nextFollowupAt ? new Date(lead.nextFollowupAt).toLocaleString() : '-'}</td><td className="space-x-2"><a href={lead.phone ? `tel:${lead.phone}` : '#'}>☎</a><Link href="/communications">✉</Link><Link href={`/leads/${lead.id}`}>⋯</Link></td></tr>)}
            {!leads.length && <tr><td colSpan={6} className="py-8 text-center text-slate-500">No leads yet.</td></tr>}
          </tbody></table>
        </section>
        <section className="space-y-6">
          <div className="card p-6"><h2 className="mb-4 text-xl font-bold">Quick Actions</h2><div className="space-y-3 text-sm"><Link className="block rounded-xl border p-3" href="/leads">Add/manual lead</Link><Link className="block rounded-xl border p-3" href="/imports">Import Excel list</Link><Link className="block rounded-xl border p-3" href="/communications">Call / WhatsApp / Email</Link><Link className="block rounded-xl border p-3" href="/tasks">Create task/reminder</Link>{canManageSettings && <Link className="block rounded-xl border border-amber-200 bg-amber-50 p-3 font-bold text-amber-800" href="/settings">Allow/disallow employee direct chat</Link>}</div></div>
          <div className="card p-6"><h2 className="mb-4 text-xl font-bold">Duplicate Warning</h2><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{summary?.duplicateContacts ? `${summary.duplicateContacts} duplicate contact warning(s) found.` : 'No duplicate warnings currently.'}</div></div>
        </section>
      </div>
    </AppShell>
  );
}
