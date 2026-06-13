'use client';
import { useEffect, useMemo, useState } from 'react';

const storageKey = 'rk_crm_dashboard_widget_order';
const defaultOrder = ['revenue', 'followups', 'duplicates', 'team', 'conversion', 'calls', 'email', 'lost', 'activity', 'source'];

function money(value: number) {
  return `Rs ${Number(value || 0).toLocaleString('en-IN')}`;
}

export function DashboardWidgetGrid({ analytics, summary }: { analytics: any; summary: any }) {
  const [order, setOrder] = useState(defaultOrder);
  const [dragged, setDragged] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(saved) && defaultOrder.every((id) => saved.includes(id))) setOrder(saved);
    } catch {}
  }, []);

  const widgets = useMemo(() => ({
    revenue: { title: 'Revenue Pipeline', value: money(summary?.revenuePipeline), detail: `Weighted ${money(analytics?.weightedPipeline)}` },
    followups: { title: 'Today Follow-ups', value: String(summary?.followupsToday ?? 0), detail: `${analytics?.pendingFollowups ?? 0} pending overall` },
    duplicates: { title: 'Duplicate Leads', value: String(summary?.duplicateContacts ?? 0), detail: 'Owner/Manager review queue' },
    team: { title: 'Team Performance', value: String(analytics?.employeePerformance?.length ?? 0), detail: `${analytics?.employeePerformance?.reduce((sum: number, item: any) => sum + item.convertedLeads, 0) || 0} conversions` },
    conversion: { title: 'Monthly Conversion', value: `${analytics?.conversionRate ?? 0}%`, detail: `${analytics?.leads ?? 0} leads in report scope` },
    calls: { title: 'Pending Calls', value: String(analytics?.pendingFollowups ?? 0), detail: 'Pending follow-up queue' },
    email: { title: 'Email Activity', value: String(analytics?.communicationSummary?.emails ?? 0), detail: 'Outbound messages' },
    lost: { title: 'Lost Leads', value: String(analytics?.lostLeads ?? 0), detail: `${analytics?.lostReasons?.length ?? 0} recorded reasons` },
    activity: { title: 'Employee Activity', value: String(analytics?.employeePerformance?.reduce((sum: number, item: any) => sum + item.activities, 0) || 0), detail: 'Logged team actions' },
    source: { title: 'Lead Source Performance', value: analytics?.leadSource?.[0]?.source || 'No data', detail: analytics?.leadSource?.[0] ? `${analytics.leadSource[0].conversionRate}% conversion` : 'Source tracking ready' }
  }), [analytics, summary]);

  function move(target: string) {
    if (!dragged || dragged === target) return;
    setOrder((current) => {
      const next = current.filter((id) => id !== dragged);
      next.splice(next.indexOf(target), 0, dragged);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  function nudge(id: string, offset: number) {
    setOrder((current) => {
      const from = current.indexOf(id);
      const to = Math.max(0, Math.min(current.length - 1, from + offset));
      if (from === to) return current;
      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, id);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
    {order.map((id, index) => {
      const widget = widgets[id as keyof typeof widgets];
      return <article
        key={id}
        draggable
        onDragStart={() => setDragged(id)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => move(id)}
        onDragEnd={() => setDragged('')}
        className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brandGold ${dragged === id ? 'opacity-50' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-600">{widget.title}</h3>
          <span className="hidden cursor-grab text-sm text-slate-400 sm:block" title="Drag to reorder">::</span>
          <div className="flex gap-1 sm:hidden">
            <button type="button" disabled={index === 0} onClick={() => nudge(id, -1)} className="h-8 w-8 rounded-lg border text-sm disabled:opacity-30" aria-label={`Move ${widget.title} earlier`}>&uarr;</button>
            <button type="button" disabled={index === order.length - 1} onClick={() => nudge(id, 1)} className="h-8 w-8 rounded-lg border text-sm disabled:opacity-30" aria-label={`Move ${widget.title} later`}>&darr;</button>
          </div>
        </div>
        <div className="mt-3 break-words text-2xl font-bold text-slate-950">{widget.value}</div>
        <p className="mt-1 text-xs leading-5 text-slate-500">{widget.detail}</p>
      </article>;
    })}
  </div>;
}
