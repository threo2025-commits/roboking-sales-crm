'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

export default function AuditPage(){
  const [logs,setLogs]=useState<any[]>([]); const [msg,setMsg]=useState('');
  useEffect(()=>{ api<any[]>('/audit-logs').then(setLogs).catch((e:any)=>setMsg(e.message)); },[]);
  return <AppShell><PageHeader title="Audit Logs" subtitle="Owner/Manager can see important actions: login, user creation, imports, templates, settings and task changes." />
    {msg&&<div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</div>}
    <section className="card p-6"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-400"><tr><th className="py-3">Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>{logs.map(l=><tr key={l.id} className="border-t border-slate-100"><td className="py-3">{new Date(l.createdAt).toLocaleString()}</td><td>{l.actor?.name||'-'}</td><td className="font-bold">{l.action}</td><td>{l.entity}</td><td><code className="text-xs">{JSON.stringify(l.metadata||{})}</code></td></tr>)}</tbody></table>{!logs.length&&<p className="py-8 text-center text-sm text-slate-500">No audit logs yet.</p>}</section>
  </AppShell>;
}
