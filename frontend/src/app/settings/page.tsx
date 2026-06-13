'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [allowEmployeeDirectChat, setAllowEmployeeDirectChat] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const settings = await api<Record<string, string>>('/settings');
      setAllowEmployeeDirectChat(settings.ALLOW_EMPLOYEE_DIRECT_CHAT === 'true');
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  useEffect(() => { load(); }, []);

  async function saveChatSetting() {
    try {
      await api('/settings', { method: 'POST', body: JSON.stringify({ key: 'ALLOW_EMPLOYEE_DIRECT_CHAT', value: String(allowEmployeeDirectChat) }) });
      setMsg('Chat permission saved.');
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return <AppShell>
    <PageHeader title="Settings" subtitle="Restricted Owner/Manager controls for CRM permissions." />
    <div className="mb-5 flex flex-wrap gap-2">
      <Link href="/control-access" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold">Access Control</Link>
      <Link href="/templates" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold">Message Templates</Link>
      <Link href="/audit" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-bold">Audit Logs</Link>
    </div>
    <section className="card max-w-3xl p-4 sm:p-6">
      <h2 className="text-xl font-bold">Employee Direct Chat</h2>
      <p className="mt-1 text-sm text-slate-500">When disabled, employees cannot start direct employee-to-employee chats. Owner/Manager-created groups remain available.</p>
      <label className="mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm font-semibold">
        <input type="checkbox" checked={allowEmployeeDirectChat} onChange={(e) => setAllowEmployeeDirectChat(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0" />
        Allow employees to start direct chats with other employees
      </label>
      <button onClick={saveChatSetting} className="mt-4 w-full rounded-xl bg-brandGold px-6 py-3 font-bold text-slate-950 sm:w-auto">Save Permission</button>
      {msg && <div className="mt-4 rounded-xl bg-slate-100 p-3 text-sm">{msg}</div>}
    </section>
  </AppShell>;
}
