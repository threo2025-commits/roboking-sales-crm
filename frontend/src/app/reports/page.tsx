'use client';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { KpiCard } from '@/components/KpiCard';
import { api, downloadApiFile } from '@/lib/api';

function money(value: number | null | undefined) {
  return value === null || value === undefined ? 'Insufficient data' : `Rs ${Number(value).toLocaleString('en-IN')}`;
}

function MetricBar({ label, value, max, detail }: { label: string; value: number; max: number; detail?: string }) {
  return <div>
    <div className="mb-1 flex items-center justify-between gap-3 text-sm"><span className="truncate font-semibold">{label}</span><span className="shrink-0 text-slate-500">{detail || value}</span></div>
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brandGold" style={{ width: `${max ? Math.max(3, value / max * 100) : 0}%` }} /></div>
  </div>;
}

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [role, setRole] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    api('/reports/overview').then(setData).catch((e: any) => setMsg(e.message));
    try { setRole(JSON.parse(localStorage.getItem('rk_crm_user') || '{}').role || ''); } catch {}
  }, []);

  const maxSource = useMemo(() => Math.max(0, ...(data?.leadSource || []).map((item: any) => item.total)), [data]);
  const maxEmployee = useMemo(() => Math.max(0, ...(data?.employeePerformance || []).map((item: any) => item.activities)), [data]);
  const maxTrend = useMemo(() => Math.max(0, ...(data?.monthlyTrend || []).map((item: any) => item.activity)), [data]);
  const canExport = role === 'OWNER' || role === 'MANAGER';

  async function download() {
    try {
      setMsg('');
      await downloadApiFile(`/reports/monthly-export?month=${month}`, `roboking-crm-${month}.csv`);
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return <AppShell>
    <PageHeader title="Reports & Analytics" subtitle="Live sales, follow-up, employee, communication, and revenue performance." />
    {msg && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</div>}

    {canExport && <section className="card mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6">
      <div><h2 className="font-bold">Monthly CRM Export</h2><p className="mt-1 text-sm text-slate-500">Leads, deals, follow-ups, activity, revenue, lost leads, and communications.</p></div>
      <div className="flex flex-col gap-2 sm:flex-row"><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-xl border px-4 py-3 text-sm" /><button onClick={download} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Download CSV</button></div>
    </section>}

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Lead Conversion" value={`${data?.conversionRate ?? 0}%`} sub={`${data?.leads ?? 0} total leads`} />
      <KpiCard label="Revenue Pipeline" value={money(data?.revenuePipeline)} sub={`Weighted ${money(data?.weightedPipeline)}`} />
      <KpiCard label="Follow-ups Pending" value={String(data?.pendingFollowups ?? 0)} sub={`${data?.completedFollowups ?? 0} completed`} />
      <KpiCard label="Lost Leads" value={String(data?.lostLeads ?? 0)} sub="Reasons shown below" />
    </div>

    <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
      <section className="card p-4 sm:p-6"><h2 className="text-xl font-bold">Lead Source Performance</h2><div className="mt-5 space-y-4">{data?.leadSource?.map((item: any) => <MetricBar key={item.source} label={item.source} value={item.total} max={maxSource} detail={`${item.converted}/${item.total} converted (${item.conversionRate}%)`} />)}{!data?.leadSource?.length && <p className="text-sm text-slate-500">No source data yet.</p>}</div></section>
      <section className="card p-4 sm:p-6"><h2 className="text-xl font-bold">Employee Performance</h2><div className="mt-5 space-y-4">{data?.employeePerformance?.map((item: any) => <MetricBar key={item.userId} label={item.name} value={item.activities} max={maxEmployee} detail={`${item.convertedLeads} converted - ${item.calls + item.emails + item.whatsapp} contacts`} />)}{!data?.employeePerformance?.length && <p className="text-sm text-slate-500">No employee activity yet.</p>}</div></section>
      <section className="card p-4 sm:p-6"><h2 className="text-xl font-bold">Monthly Activity Trend</h2><div className="mt-5 space-y-4">{data?.monthlyTrend?.map((item: any) => <MetricBar key={item.month} label={item.month} value={item.activity} max={maxTrend} detail={`${item.calls} calls - ${item.emails} emails - ${item.whatsapp} WhatsApp`} />)}{!data?.monthlyTrend?.length && <p className="text-sm text-slate-500">No monthly activity yet.</p>}</div></section>
      <section className="card p-4 sm:p-6"><h2 className="text-xl font-bold">Communication Summary</h2><div className="mt-5 grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-slate-50 p-4"><b className="text-2xl">{data?.communicationSummary?.calls ?? 0}</b><p className="text-xs text-slate-500">Calls</p></div><div className="rounded-xl bg-slate-50 p-4"><b className="text-2xl">{data?.communicationSummary?.emails ?? 0}</b><p className="text-xs text-slate-500">Emails</p></div><div className="rounded-xl bg-slate-50 p-4"><b className="text-2xl">{data?.communicationSummary?.whatsapp ?? 0}</b><p className="text-xs text-slate-500">WhatsApp</p></div></div></section>
      <section className="card p-4 sm:p-6"><h2 className="text-xl font-bold">Lost Lead Reasons</h2><div className="mt-4 space-y-2">{data?.lostReasons?.map((item: any) => <div key={item.reason} className="flex justify-between gap-3 rounded-xl border p-3 text-sm"><span>{item.reason}</span><b>{item.count}</b></div>)}{!data?.lostReasons?.length && <p className="text-sm text-slate-500">No lost lead reasons recorded.</p>}</div></section>
      <section className="card p-4 sm:p-6"><h2 className="text-xl font-bold">Business Metrics</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{[['LTV', money(data?.advancedMetrics?.ltv)], ['CAC', money(data?.advancedMetrics?.cac)], ['CAGR', data?.advancedMetrics?.cagr ?? 'Insufficient data'], ['MRR', money(data?.advancedMetrics?.mrr)], ['ARR', money(data?.advancedMetrics?.arr)]].map(([label, value]) => <div key={label} className="rounded-xl border p-3"><div className="text-xs font-bold text-slate-500">{label}</div><div className="mt-1 break-words text-sm font-bold">{value}</div></div>)}</div><p className="mt-4 text-xs text-slate-500">{data?.advancedMetrics?.unavailableReason}</p></section>
    </div>
  </AppShell>;
}
