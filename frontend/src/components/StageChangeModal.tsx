'use client';
import { useEffect, useState } from 'react';

type Props = {
  open: boolean;
  stage: string;
  leadName?: string;
  onCancel: () => void;
  onConfirm: (values: { note?: string; nextFollowupAt?: string }) => void;
};

export function StageChangeModal({ open, stage, leadName, onCancel, onConfirm }: Props) {
  const [note, setNote] = useState('');
  const [nextFollowupAt, setNextFollowupAt] = useState('');
  useEffect(() => { if (open) { setNote(''); setNextFollowupAt(''); } }, [open, stage]);
  if (!open) return null;

  const followup = stage === 'FOLLOW_UP_LATER';
  const lost = stage === 'LOST';
  const converted = stage === 'CONVERTED';
  const title = followup ? 'Schedule Follow-up Later' : lost ? 'Mark Lead Lost / Failed' : converted ? 'Confirm Lead Conversion' : 'Move Lead';

  return <div className="fixed inset-0 z-[70] flex items-end bg-slate-950/60 sm:items-center sm:justify-center sm:p-6">
    <section className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-slate-500">{leadName}</p></div><button onClick={onCancel} className="h-11 w-11 rounded-xl border text-lg font-bold">X</button></div>
      {followup && <div className="mt-5"><label className="mb-2 block text-sm font-bold">Next follow-up date and time</label><input required type="datetime-local" value={nextFollowupAt} onChange={(event) => setNextFollowupAt(event.target.value)} className="w-full rounded-xl border px-4 py-3 text-sm" /></div>}
      <div className="mt-4"><label className="mb-2 block text-sm font-bold">{lost ? 'Lost reason / objection' : converted ? 'Conversion note' : 'Note'}</label><textarea required={lost} value={note} onChange={(event) => setNote(event.target.value)} className="h-28 w-full rounded-xl border px-4 py-3 text-sm" placeholder={lost ? 'Why was this lead lost?' : converted ? 'Optional client/deal confirmation note' : 'Optional note'} /></div>
      {converted && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">The CRM will create or update the linked client and converted deal using the existing secure conversion flow.</div>}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={onCancel} className="rounded-xl border px-5 py-3 text-sm font-bold">Cancel</button><button disabled={(followup && !nextFollowupAt) || (lost && !note.trim())} onClick={() => onConfirm({ note: note || undefined, nextFollowupAt: nextFollowupAt || undefined })} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">Confirm Move</button></div>
    </section>
  </div>;
}
