'use client';

const steps = [
  { id: 'NEW_LEAD', label: 'New Lead', statuses: ['NEW_LEAD'] },
  { id: 'STARTED', label: 'Contacted', statuses: ['CONTACTED', 'STARTED'] },
  { id: 'IN_PROGRESS', label: 'Interested', statuses: ['IN_PROGRESS', 'REQUIREMENT_COLLECTED', 'DEMO_SCHEDULED', 'DEMO_COMPLETED', 'QUOTATION_SENT', 'NEGOTIATION', 'PAYMENT_PENDING'] },
  { id: 'FOLLOW_UP_LATER', label: 'Follow-up', statuses: ['FOLLOW_UP_LATER', 'ON_HOLD'] },
  { id: 'CONVERTED', label: 'Converted', statuses: ['CONVERTED'] }
];

export const simpleLeadStages = [
  ...steps.map(({ id, label }) => ({ id, label })),
  { id: 'LOST', label: 'Failed / Lost' }
];

function activeIndex(status: string) {
  return steps.findIndex((step) => step.statuses.includes(status));
}

export function LeadProgress({ status, compact = false }: { status: string; compact?: boolean }) {
  const lost = ['LOST', 'INVALID_CONTACT'].includes(status);
  const current = activeIndex(status);

  return (
    <div className="max-w-full overflow-x-auto pb-1">
      <div className={`flex min-w-[560px] items-start ${compact ? 'py-1' : 'py-2'}`}>
        {steps.map((step, index) => {
          const completed = !lost && (index < current || status === 'CONVERTED');
          const active = !lost && index === current;
          const circle = completed
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : active
              ? 'border-amber-400 bg-amber-100 text-amber-900'
              : 'border-slate-300 bg-white text-slate-400';
          return (
            <div key={step.id} className="relative flex flex-1 flex-col items-center text-center">
              {index > 0 && <span className={`absolute right-1/2 top-4 h-1 w-full ${completed || active ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
              <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold ${circle}`}>
                {completed ? 'OK' : index + 1}
              </span>
              <span className={`mt-2 text-[11px] font-bold ${active ? 'text-amber-800' : completed ? 'text-emerald-700' : 'text-slate-400'}`}>{step.label}</span>
            </div>
          );
        })}
        {lost && <div className="ml-3 flex min-w-24 flex-col items-center text-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-red-600 bg-red-600 text-xs font-bold text-white">X</span>
          <span className="mt-2 text-[11px] font-bold text-red-700">Failed / Lost</span>
        </div>}
      </div>
    </div>
  );
}
