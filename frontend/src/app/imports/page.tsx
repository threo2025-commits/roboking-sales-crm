'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

type PreviewRow = { rowNumber: number; status: string; data: Record<string, any>; duplicate?: any; error?: string };

export default function ImportsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [allowOverride, setAllowOverride] = useState(false);
  const [role, setRole] = useState('');
  const [summary, setSummary] = useState<any>(null);

  async function loadHistory() { try { setHistory(await api<any[]>('/imports/history')); } catch {} }
  useEffect(() => { loadHistory(); try { setRole(JSON.parse(localStorage.getItem('rk_crm_user') || '{}').role || ''); } catch {} }, []);

  async function preview() {
    if (!file) return;
    setError('');
    setSummary(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await api<{ rows: PreviewRow[] }>('/imports/preview', { method: 'POST', body: fd });
      setRows(res.rows || []);
    } catch (e: any) { setError(e.message); }
  }


  async function deleteImport(id: string) {
    if (!confirm('Delete this import record and all leads created from it? This is allowed only for Owner/Manager.')) return;
    setError('');
    try { await api(`/imports/${id}`, { method: 'DELETE' }); loadHistory(); } catch (e: any) { setError(e.message); }
  }

  async function commit() {
    if (!file || !rows.length) return;
    setError('');
    try {
      const res = await api('/imports/commit', { method: 'POST', body: JSON.stringify({ fileName: file.name, rows, allowDuplicateOverride: allowOverride }) });
      setSummary(res);
      setRows([]); setFile(null); loadHistory();
    } catch (e: any) { setError(e.message); }
  }

  const duplicates = rows.filter((r) => r.status === 'DUPLICATE').length;

  return (
    <AppShell>
      <PageHeader title="Excel Imports" subtitle="Admin, Manager and employees can upload leads. Only Owner/Manager can delete imported data." />
      <section className="card p-6">
        <h2 className="text-xl font-bold">Upload Excel Lead Sheet</h2>
        <p className="mt-1 text-sm text-slate-500">Preview validates rows and highlights exact phone/email duplicates before final import.</p>
        <div className="mt-5 flex gap-3">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} className="rounded-xl border px-4 py-3" />
          <button onClick={preview} className="rounded-xl bg-brandGold px-6 py-3 font-bold text-slate-950">Preview Import</button>
        </div>
        {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {summary && <div className="mt-4 grid grid-cols-5 gap-3 rounded-xl bg-slate-50 p-4 text-sm"><div><b>Total</b><p>{summary.totalRows}</p></div><div><b>Imported</b><p>{summary.importedRows}</p></div><div><b>Duplicates</b><p>{summary.duplicateRows}</p></div><div><b>Invalid</b><p>{summary.invalidRows}</p></div><div><b>Skipped</b><p>{summary.skippedRows}</p></div></div>}
        {duplicates > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Duplicate contact found in {duplicates} row(s). Owner/Manager override is required for exact phone/email duplicates.</div>}
        {rows.length > 0 && <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 p-4"><label className="text-sm">{['OWNER','MANAGER'].includes(role) ? <><input type="checkbox" checked={allowOverride} onChange={(e)=>setAllowOverride(e.target.checked)} className="mr-2"/>Owner/Manager duplicate override</> : 'Employees can import only non-duplicate rows. Duplicate override requires Owner/Manager.'}</label><button onClick={commit} className="rounded-xl bg-slate-950 px-5 py-2 text-sm font-bold text-white">Commit Import</button></div>}
      </section>

      <section className="card mt-6 p-6">
        <h2 className="mb-4 text-xl font-bold">Preview Rows</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400"><tr><th className="py-3">Row</th><th>Organization</th><th>Phone</th><th>Email</th><th>Status</th><th>Warning</th></tr></thead>
          <tbody>
            {rows.slice(0, 50).map((r) => (
              <tr key={r.rowNumber} className="border-t border-slate-100">
                <td className="py-3">{r.rowNumber}</td><td>{r.data.organization || r.data['Company Name'] || '-'}</td><td>{r.data.phone || r.data.Phone || '-'}</td><td>{r.data.email || r.data.Email || '-'}</td>
                <td><span className={`rounded-full px-3 py-1 text-xs font-bold ${r.status === 'DUPLICATE' ? 'bg-amber-100 text-amber-800' : r.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>{r.status}</span></td>
                <td className="text-amber-700">{r.status === 'DUPLICATE' ? 'Duplicate contact found' : r.error || '-'}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="py-8 text-center text-slate-500">Upload a file to preview rows.</td></tr>}
          </tbody>
        </table>
      </section>
      <section className="card mt-6 p-6"><h2 className="mb-4 text-xl font-bold">Import History</h2>{history.map(h=><div key={h.id} className="mb-3 flex items-center justify-between rounded-xl border p-4 text-sm"><div><b>{h.fileName}</b><div className="text-slate-500">Uploaded by {h.uploadedBy?.name || '-'} · Total {h.totalRows} · Imported {h.importedRows} · Duplicates {h.duplicateRows}</div></div>{['OWNER','MANAGER'].includes(role) && <button onClick={() => deleteImport(h.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700">Delete imported data</button>}</div>)}{!history.length&&<p className="text-sm text-slate-500">No imports yet.</p>}</section>
    </AppShell>
  );
}
