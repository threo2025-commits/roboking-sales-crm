export function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card min-w-0 p-4 sm:p-5">
      <div className="break-words text-sm text-slate-500">{label}</div>
      <div className="mt-2 break-words text-2xl font-bold text-slate-900 sm:mt-3 sm:text-3xl">{value}</div>
      <div className="mt-2 break-words text-xs font-medium text-emerald-600">{sub}</div>
    </div>
  );
}
