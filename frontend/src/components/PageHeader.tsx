import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">{title}</h1>
        {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
