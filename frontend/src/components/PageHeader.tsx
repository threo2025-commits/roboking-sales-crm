import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex min-w-0 flex-col items-start justify-between gap-4 sm:mb-6 sm:flex-row">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold text-slate-950 sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-slate-500 sm:text-base">{subtitle}</p>}
      </div>
      {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
    </div>
  );
}
