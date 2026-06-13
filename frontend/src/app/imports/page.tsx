'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { FileDropzone } from '@/components/FileDropzone';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

type PreviewRow = { rowNumber: number; status: string; data: Record<string, any>; duplicate?: any; error?: string };
const crmFields = [
  ['', 'Do not import'],
  ['organization', 'Organization'],
  ['contactName', 'Contact Person'],
  ['phone', 'Phone'],
  ['whatsapp', 'WhatsApp'],
  ['email', 'Email'],
  ['requirement', 'Product Interest / Requirement'],
  ['expectedValue', 'Budget / Expected Value'],
  ['source', 'Lead Source'],
  ['city', 'City'],
  ['state', 'State / Region']
];

export default function ImportsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [rawPreview, setRawPreview] = useState<Record<string, any>[]>([]);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [allowOverride, setAllowOverride] = useState(false);
  const [role, setRole] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function loadHistory() { try { setHistory(await api<any[]>('/imports/history')); } catch {} }
  useEffect(() => { loadHistory(); try { setRole(JSON.parse(localStorage.getItem('rk_crm_user') || '{}').role || ''); } catch {} }, []);

  async function preview(useMapping = false) {
    if (!file) return;
    setError('');
    setSummary(null);
    setLoading(true);
    const fd = new FormData();
    fd.append('file', file);
    if (useMapping) fd.append('mapping', JSON.stringify(mapping));
    try {
      const res = await api<{ rows: PreviewRow[]; columns: string[]; mapping: Record<string, string>; rawPreview: Record<string, any>[] }>('/imports/preview', { method: 'POST', body: fd });
      setRows(res.rows || []);
      setColumns(res.columns || []);
      setRawPreview(res.rawPreview || []);
      if (!useMapping) setMapping(res.mapping || {});
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
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
      setRows([]); setColumns([]); setMapping({}); setRawPreview([]); setFile(null); loadHistory();
    } catch (e: any) { setError(e.message); }
  }

  const duplicates = rows.filter((row) => row.status === 'DUPLICATE').length;
  const invalid = rows.filter((row) => row.status === 'FAILED').length;

  return <AppShell>
    <PageHeader title="Excel Imports" subtitle="Map spreadsheet columns, preview valid and duplicate rows, then import only the records allowed for your role." />
    <section className="card p-4 sm:p-6">
      <h2 className="text-xl font-bold">Upload Lead Sheet</h2>
      <p className="mt-1 text-sm text-slate-500">XLSX, XLS, or CSV up to 10MB.</p>
      <div className="mt-5"><FileDropzone label="Drag Excel file here or click to upload" hint="The CRM will auto-detect likely lead fields" accept=".xlsx,.xls,.csv" maxBytes={10 * 1024 * 1024} files={file ? [file] : []} onFiles={(files) => { setFile(files[0] || null); setRows([]); setColumns([]); setMapping({}); }} /></div>
      <button disabled={!file || loading} onClick={() => preview(false)} className="mt-4 w-full rounded-xl bg-brandGold px-6 py-3 font-bold text-slate-950 disabled:opacity-40 sm:w-auto">{loading ? 'Reading file...' : 'Analyse & Preview'}</button>
      {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {summary && <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3 lg:grid-cols-5"><div><b>Total</b><p>{summary.totalRows}</p></div><div><b>Imported</b><p>{summary.importedRows}</p></div><div><b>Duplicates</b><p>{summary.duplicateRows}</p></div><div><b>Invalid</b><p>{summary.invalidRows}</p></div><div><b>Skipped</b><p>{summary.skippedRows}</p></div></div>}
    </section>

    {!!columns.length && <section className="card mt-5 p-4 sm:mt-6 sm:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-xl font-bold">Column Mapping</h2><p className="mt-1 text-sm text-slate-500">Check the automatic choices and adjust any incorrect field.</p></div><button disabled={loading} onClick={() => preview(true)} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">{loading ? 'Updating...' : 'Apply Mapping'}</button></div>
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{columns.map((column) => <label key={column} className="rounded-xl border p-3"><span className="block truncate text-sm font-bold">{column}</span><span className="my-2 block text-center text-slate-400">to</span><select value={mapping[column] || ''} onChange={(event) => setMapping({ ...mapping, [column]: event.target.value })} className="w-full rounded-xl border px-3 py-2.5 text-sm">{crmFields.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}</div>
    </section>}

    {!!rawPreview.length && <section className="card mt-5 overflow-x-auto p-4 sm:mt-6 sm:p-6">
      <h2 className="mb-4 text-xl font-bold">Original Sheet Preview</h2>
      <table className="min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-slate-400"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-3">{column}</th>)}</tr></thead><tbody>{rawPreview.map((row, index) => <tr key={index} className="border-t">{columns.map((column) => <td key={column} className="max-w-56 truncate px-3 py-3">{String(row[column] ?? '')}</td>)}</tr>)}</tbody></table>
    </section>}

    {!!rows.length && <section className="card mt-5 p-4 sm:mt-6 sm:p-6">
      <div className="grid grid-cols-3 gap-3 text-center text-sm"><div className="rounded-xl bg-emerald-50 p-3"><b className="text-xl">{rows.length - duplicates - invalid}</b><p>Valid</p></div><div className="rounded-xl bg-amber-50 p-3"><b className="text-xl">{duplicates}</b><p>Duplicate</p></div><div className="rounded-xl bg-red-50 p-3"><b className="text-xl">{invalid}</b><p>Invalid</p></div></div>
      {duplicates > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Duplicate contact found in {duplicates} row(s).</div>}
      <div className="mt-4 flex flex-col items-start justify-between gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center"><label className="text-sm">{['OWNER', 'MANAGER'].includes(role) ? <><input type="checkbox" checked={allowOverride} onChange={(event) => setAllowOverride(event.target.checked)} className="mr-2" />Override duplicate rows</> : 'Duplicate and invalid rows will be skipped. Employees cannot override duplicates.'}</label><button onClick={commit} className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white sm:w-auto">Import Valid Rows</button></div>
    </section>}

    <section className="card mt-5 overflow-x-auto p-4 sm:mt-6 sm:p-6">
      <h2 className="mb-4 text-xl font-bold">Mapped Row Preview</h2>
      <table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-slate-400"><tr><th className="py-3">Row</th><th>Organization</th><th>Phone</th><th>Email</th><th>Interest</th><th>Budget</th><th>Status</th></tr></thead><tbody>{rows.slice(0, 50).map((row) => <tr key={row.rowNumber} className="border-t"><td className="py-3">{row.rowNumber}</td><td>{row.data.organization || '-'}</td><td>{row.data.phone || '-'}</td><td>{row.data.email || '-'}</td><td>{row.data.requirement || '-'}</td><td>{row.data.expectedValue || '-'}</td><td><span className={`rounded-full px-3 py-1 text-xs font-bold ${row.status === 'DUPLICATE' ? 'bg-amber-100 text-amber-800' : row.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>{row.status}</span>{row.error && <div className="mt-1 text-xs text-red-600">{row.error}</div>}</td></tr>)}{!rows.length && <tr><td colSpan={7} className="py-8 text-center text-slate-500">Upload and analyse a file to preview rows.</td></tr>}</tbody></table>
    </section>

    <section className="card mt-5 p-4 sm:mt-6 sm:p-6"><h2 className="mb-4 text-xl font-bold">Import History</h2>{history.map((item) => <div key={item.id} className="mb-3 flex flex-col items-start justify-between gap-3 rounded-xl border p-4 text-sm sm:flex-row sm:items-center"><div><b>{item.fileName}</b><div className="text-slate-500">Uploaded by {item.uploadedBy?.name || '-'} - Total {item.totalRows} - Imported {item.importedRows} - Duplicates {item.duplicateRows}</div></div>{['OWNER', 'MANAGER'].includes(role) && <button onClick={() => deleteImport(item.id)} className="w-full rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 sm:w-auto">Delete imported data</button>}</div>)}{!history.length && <p className="text-sm text-slate-500">No imports yet.</p>}</section>
  </AppShell>;
}
