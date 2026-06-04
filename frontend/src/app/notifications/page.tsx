'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

type Note = { id: string; title: string; body?: string; userId?: string; readAt?: string; createdAt: string };
type User = { id: string; name: string; loginId: string; role: string };

export default function NotificationsPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ userId: '', title: '', body: '' });
  const [msg, setMsg] = useState('');

  async function load() {
    setNotes(await api<Note[]>('/notifications'));
    try { setUsers(await api<User[]>('/users/directory')); } catch {}
  }
  useEffect(() => { load(); }, []);

  async function send(e: FormEvent) {
    e.preventDefault(); setMsg('');
    try {
      await api('/notifications', { method: 'POST', body: JSON.stringify({ ...form, userId: form.userId || undefined }) });
      setMsg('Reminder/notification sent.');
      setForm({ userId: '', title: '', body: '' });
      load();
    } catch (e: any) { setMsg(e.message); }
  }

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: 'PATCH' });
    load();
  }

  return <AppShell>
    <PageHeader title="Notifications & PA Reminders" subtitle="Owner, Manager, and PA can send reminders to employees. Employees see assigned/global alerts." />
    <div className="grid grid-cols-3 gap-6">
      <form onSubmit={send} className="card p-6">
        <h2 className="text-xl font-bold">Send Reminder</h2>
        <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="mt-4 w-full rounded-xl border px-4 py-3 text-sm">
          <option value="">All users / global notification</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.loginId} · {u.role.replaceAll('_', ' ')}</option>)}
        </select>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="Reminder title" className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" />
        <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Message / instruction" className="mt-3 min-h-32 w-full rounded-xl border px-4 py-3 text-sm" />
        <button className="mt-3 w-full rounded-xl bg-brandGold py-3 font-bold text-slate-950">Send Reminder</button>
        {msg && <p className="mt-3 text-sm text-slate-600">{msg}</p>}
      </form>
      <section className="card col-span-2 p-6">
        <h2 className="mb-4 text-xl font-bold">Recent Notifications</h2>
        <div className="space-y-3">
          {notes.map((n) => <div key={n.id} className="flex items-start justify-between rounded-xl border p-4">
            <div>
              <div className="font-bold">{n.title}</div>
              <div className="mt-1 text-sm text-slate-600">{n.body || 'No message'}</div>
              <div className="mt-2 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()} · {n.readAt ? 'Read' : 'Unread'}</div>
            </div>
            {!n.readAt && <button onClick={() => markRead(n.id)} className="rounded-lg border px-3 py-2 text-sm">Mark read</button>}
          </div>)}
        </div>
      </section>
    </div>
  </AppShell>;
}
