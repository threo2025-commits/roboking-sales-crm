'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { KpiCard } from '@/components/KpiCard';
import { StatusBadge } from '@/components/StatusBadge';
import { api } from '@/lib/api';

const stageLabels = ['NEW_LEAD', 'CONTACTED', 'STARTED', 'IN_PROGRESS', 'QUOTATION_SENT', 'NEGOTIATION', 'CONVERTED'];

type Summary = {
  totalLeads: number;
  activeDeals: number;
  followupsToday: number;
  conversionRate: number;
  revenuePipeline: number;
  duplicateContacts: number;
  warnings?: string[];
};

type StoredUser = { name: string; role: string; loginId: string } | null;

const roleContent: Record<string, { title: string; subtitle: string; focus: string[]; leadLabel: string; pipelineSub: string }> = {
  OWNER: {
    title: 'Owner Dashboard',
    subtitle: 'Complete business overview across sales activity, team movement, revenue pipeline, duplicates, and client communication.',
    focus: ['Business overview', 'Team performance', 'Revenue pipeline', 'Duplicate control'],
    leadLabel: 'Total Leads',
    pipelineSub: 'Expected revenue across the active pipeline'
  },
  MANAGER: {
    title: 'Manager Dashboard',
    subtitle: 'Track team leads, follow-ups, employee activity, pipeline movement, and client communication from one workspace.',
    focus: ['Team follow-ups', 'Employee activity', 'Lead reassignment', 'Deal movement'],
    leadLabel: 'Team Leads',
    pipelineSub: 'Open team pipeline value'
  },
  PA_ADMIN_ASSISTANT: {
    title: 'PA / Admin Assistant Dashboard',
    subtitle: 'Coordinate reminders, pending tasks, follow-up schedules, notifications, and employee support activity.',
    focus: ['Reminder coordination', 'Pending follow-ups', 'Assigned tasks', 'Notifications'],
    leadLabel: 'Visible Leads',
    pipelineSub: 'Visible pipeline for coordination'
  },
  EMPLOYEE: {
    title: 'Employee Dashboard',
    subtitle: 'Stay focused on assigned leads, today follow-ups, call logs, WhatsApp/email actions, and pending tasks.',
    focus: ['My leads', 'Today follow-ups', 'Call and WhatsApp actions', 'Pending tasks'],
    leadLabel: 'My Leads',
    pipelineSub: 'My active sales pipeline'
  }
};

function formatStage(stage: string) {
  return stage.replaceAll('_', ' ');
}

function formatMoney(value: number) {
  return `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [user, setUser] = useState<StoredUser>(null);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      setMsg('');
      setSummary(await api<Summary>('/dashboard/summary'));
      setLeads(await api<any[]>('/leads'));
      setFollowups(await api<any[]>('/followups/daily'));
      try {
        setUser(JSON.parse(localStorage.getItem('rk_crm_user') || 'null'));
      } catch {}
    } catch {
      setMsg('Something went wrong while loading the dashboard. Please refresh.');
    }
  }

  useEffect(() => {
    load();
  }, []);

  const content = roleContent[user?.role || 'EMPLOYEE'] || roleContent.EMPLOYEE;
  const canManageSettings = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const stageCounts = useMemo(() => {
    return stageLabels.map((stage) => ({
      stage,
      count: leads.filter((lead) => lead.status === stage).length
    }));
  }, [leads]);

  const communicationStats = useMemo(() => {
    const withPhone = leads.filter((lead) => lead.phone || lead.whatsapp).length;
    const withEmail = leads.filter((lead) => lead.email).length;
    const hotLeads = leads.filter((lead) => lead.priority === 'HIGH' || lead.priority === 'URGENT').length;
    return { withPhone, withEmail, hotLeads };
  }, [leads]);

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <div className="text-sm font-bold uppercase tracking-wide text-brandGoldDark">RoboKing Sales Platform</div>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{content.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{content.subtitle}</p>
        </div>
        <button onClick={load} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 shadow-sm">
          Refresh
        </button>
      </div>

      {msg && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</div>}
      {summary?.warnings?.length ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          Duplicate contact warnings need review from Leads or Imports.
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        {content.focus.map((item) => (
          <div key={item} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            {item}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label={content.leadLabel} value={String(summary?.totalLeads ?? '-')} sub="Live CRM count" />
        <KpiCard label="Active Deals" value={String(summary?.activeDeals ?? '-')} sub="Open opportunities" />
        <KpiCard label="Follow-ups Today" value={String(summary?.followupsToday ?? '-')} sub="Daily action queue" />
        <KpiCard label="Conversion Rate" value={`${summary?.conversionRate ?? '-'}%`} sub="Current CRM metric" />
        <KpiCard label="Revenue Pipeline" value={formatMoney(summary?.revenuePipeline || 0)} sub={content.pipelineSub} />
        <KpiCard label="Duplicate Contacts" value={String(summary?.duplicateContacts ?? '-')} sub="Owner/Manager override only" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="card p-6 xl:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Pipeline Snapshot</h2>
              <p className="mt-1 text-sm text-slate-500">Lead movement by current sales stage.</p>
            </div>
            <Link href="/deals" className="text-sm font-semibold text-brandGoldDark">
              View deals
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {stageCounts.map(({ stage, count }) => (
              <div key={stage} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="min-h-8 text-xs font-semibold text-slate-500">{formatStage(stage)}</div>
                <div className="mt-2 text-2xl font-bold text-slate-950">{count}</div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-brandGold" style={{ width: `${Math.min(100, count * 12 + 10)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Today Follow-ups</h2>
              <p className="mt-1 text-sm text-slate-500">Calls, reminders, and next actions due today.</p>
            </div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">{followups.length}</span>
          </div>
          <div className="space-y-3">
            {followups.slice(0, 6).map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-100 p-3 text-sm">
                <div className="font-semibold text-slate-900">
                  {new Date(item.dueAt).toLocaleTimeString()} - {item.lead?.organization || item.title}
                </div>
                <div className="mt-1 text-slate-500">{item.assignedTo?.name || '-'} - {item.notes || 'Action pending'}</div>
              </div>
            ))}
            {!followups.length && <p className="text-sm text-slate-500">No follow-ups due today.</p>}
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="card p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Recent Leads & Clients</h2>
              <p className="mt-1 text-sm text-slate-500">Latest visible sales records for your role.</p>
            </div>
            <Link href="/leads" className="text-sm font-semibold text-brandGoldDark">
              Open leads
            </Link>
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
                {leads.slice(0, 8).map((lead) => (
                  <tr key={lead.id} className={`border-t ${lead.deletedAt ? 'border-red-200 bg-red-50 text-red-900' : 'border-slate-100'}`}>
                    <td className="py-4 font-semibold text-slate-950">
                      {lead.organization}
                      {lead.deletedAt && <div className="text-xs font-bold uppercase text-red-700">Deleted lead</div>}
                      {lead.duplicateReason && <div className="text-xs text-amber-600">Duplicate contact found</div>}
                    </td>
                    <td>{lead.contactName || '-'}</td>
                    <td>{lead.phone || '-'}</td>
                    <td>
                      {lead.deletedAt ? <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">DELETED</span> : <StatusBadge status={lead.status} />}
                    </td>
                    <td>{lead.nextFollowupAt ? new Date(lead.nextFollowupAt).toLocaleString() : '-'}</td>
                    <td className="space-x-3 font-semibold text-brandGoldDark">
                      {!lead.deletedAt && <a href={lead.phone ? `tel:${lead.phone}` : '#'}>Call</a>}
                      {!lead.deletedAt && <Link href="/communications">Message</Link>}
                      <Link href={`/leads/${lead.id}`}>View</Link>
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

        <section className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 text-xl font-bold text-slate-950">Quick Actions</h2>
            <div className="space-y-3 text-sm">
              <Link className="block rounded-xl border border-slate-200 p-3 font-semibold hover:border-brandGold" href="/leads">
                Add manual lead
              </Link>
              <Link className="block rounded-xl border border-slate-200 p-3 font-semibold hover:border-brandGold" href="/imports">
                Import Excel leads
              </Link>
              <Link className="block rounded-xl border border-slate-200 p-3 font-semibold hover:border-brandGold" href="/communications">
                Call, WhatsApp, or email
              </Link>
              <Link className="block rounded-xl border border-slate-200 p-3 font-semibold hover:border-brandGold" href="/tasks">
                Create task or reminder
              </Link>
              {canManageSettings && (
                <Link className="block rounded-xl border border-amber-200 bg-amber-50 p-3 font-bold text-amber-800" href="/settings">
                  Manage restricted settings
                </Link>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 text-xl font-bold text-slate-950">Communication Readiness</h2>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xl font-bold text-slate-950">{communicationStats.withPhone}</div>
                <div className="mt-1 text-xs text-slate-500">Phone</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xl font-bold text-slate-950">{communicationStats.withEmail}</div>
                <div className="mt-1 text-xs text-slate-500">Email</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xl font-bold text-slate-950">{communicationStats.hotLeads}</div>
                <div className="mt-1 text-xs text-slate-500">Priority</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 text-xl font-bold text-slate-950">Duplicate Control</h2>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {summary?.duplicateContacts ? `${summary.duplicateContacts} duplicate contact warning(s) found.` : 'No duplicate warnings currently.'}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
