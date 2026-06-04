'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { api } from '@/lib/api';

export default function ReportsPage() {
  const [data,setData]=useState<any>(null);
  const reports = ['Team performance','Lead source report','Follow-up pending report','Conversion report','Revenue pipeline','Employee activity report','Excel import report','Lost lead report'];
  useEffect(()=>{ api('/reports/overview').then(setData).catch(()=>{}); },[]);
  return <AppShell><PageHeader title="Reports" subtitle="Owner/Manager analytics for team performance, lead sources, conversions and imports." />
    <div className="grid grid-cols-4 gap-4"><KpiCard label="Total Leads" value={data?.leads ?? '-'} sub="All leads"/><KpiCard label="Active Deals" value={data?.deals ?? '-'} sub="All deals"/><KpiCard label="Pending Follow-ups" value={data?.pendingFollowups ?? '-'} sub="Action required"/><KpiCard label="Lost Leads" value={data?.lostLeads ?? '-'} sub="Review reasons"/></div>
    <div className="mt-6 grid grid-cols-4 gap-6">{reports.map(name=><div key={name} className="card p-6"><h2 className="font-bold">{name}</h2><p className="mt-2 text-sm text-slate-500">Live report data will be expanded from this module.</p></div>)}</div>
    <section className="card mt-6 p-6"><h2 className="mb-4 text-xl font-bold">Lead Sources</h2>{data?.leadSource?.map((r:any)=><div key={r.source||'Unknown'} className="mb-2 flex justify-between rounded-xl border p-3 text-sm"><span>{r.source||'Unknown'}</span><b>{r._count.id}</b></div>)}</section>
  </AppShell>;
}
