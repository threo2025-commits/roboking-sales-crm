export function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-bold text-slate-900">{value}</div>
      <div className="mt-2 text-xs font-medium text-emerald-600">{sub}</div>
    </div>
  );
}
