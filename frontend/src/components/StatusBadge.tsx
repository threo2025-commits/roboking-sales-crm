const colors: Record<string, string> = {
  NEW_LEAD: 'bg-blue-50 text-blue-700',
  CONTACTED: 'bg-cyan-50 text-cyan-700',
  STARTED: 'bg-purple-50 text-purple-700',
  IN_PROGRESS: 'bg-amber-50 text-amber-700',
  QUOTATION_SENT: 'bg-teal-50 text-teal-700',
  NEGOTIATION: 'bg-orange-50 text-orange-700',
  CONVERTED: 'bg-emerald-50 text-emerald-700',
  LOST: 'bg-red-50 text-red-700'
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.replaceAll('_', ' ');
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${colors[status] || 'bg-slate-100 text-slate-700'}`}>{label}</span>;
}
