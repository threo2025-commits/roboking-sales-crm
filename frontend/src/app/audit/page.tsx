'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  useEffect(() => { api<any[]>('/audit-logs').then(setLogs).catch((e: any) => setMsg(e.message)); }, []);

  return <AppShell>
    <PageHeader title="Activity & Audit Logs" subtitle="Detailed Owner/Manager view of user actions, entity changes, network origin, and before/after values." />
    {msg && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</div>}
    <section className="space-y-3">
      {logs.map((log) => <article key={log.id} className="card p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div><div className="text-xs font-bold uppercase text-brandGoldDark">{log.entity} {log.entityName ? `- ${log.entityName}` : ''}</div><h2 className="mt-1 font-bold">{log.action.replaceAll('_', ' ')}</h2><p className="mt-1 text-sm text-slate-500">{log.actor?.name || 'System'} - {(log.actorRole || log.actor?.role || '').replaceAll('_', ' ')} - {new Date(log.createdAt).toLocaleString()}</p></div>
          <div className="text-left text-xs text-slate-500 sm:text-right"><div>IP: {log.ipAddress || '-'}</div><div className="mt-1 max-w-xl break-all">Agent: {log.userAgent || '-'}</div></div>
        </div>
        {(log.beforeState || log.afterState) && <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"><div className="rounded-xl bg-red-50 p-3 text-xs"><b>Before</b><pre className="mt-2 overflow-auto whitespace-pre-wrap">{JSON.stringify(log.beforeState || {}, null, 2)}</pre></div><div className="rounded-xl bg-emerald-50 p-3 text-xs"><b>After</b><pre className="mt-2 overflow-auto whitespace-pre-wrap">{JSON.stringify(log.afterState || {}, null, 2)}</pre></div></div>}
        {log.notes && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">{log.notes}</p>}
      </article>)}
      {!logs.length && <section className="card p-8 text-center text-sm text-slate-500">No audit logs yet.</section>}
    </section>
  </AppShell>;
}
