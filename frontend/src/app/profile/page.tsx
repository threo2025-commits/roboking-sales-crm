'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<{ user: any }>('/auth/me').then((res) => setUser(res.user)).catch((e: any) => setMsg(e.message));
  }, []);

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await api('/auth/change-password', { method: 'POST', body: JSON.stringify(form) });
      localStorage.removeItem('rk_crm_token');
      localStorage.removeItem('rk_crm_user');
      setMsg('Password changed. Please login again.');
      setTimeout(() => { window.location.href = '/login'; }, 1200);
    } catch (e: any) { setMsg(e.message); }
  }

  return <AppShell>
    <PageHeader title="Profile & Password" subtitle="Use this page when Manager/Owner gives you a temporary password. Changing password will log out current session." />
    <div className="grid grid-cols-2 gap-6">
      <section className="card p-6">
        <h2 className="text-xl font-bold">My Account</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div><b>Name:</b> {user?.name || '-'}</div>
          <div><b>Login ID:</b> {user?.loginId || '-'}</div>
          <div><b>Role:</b> {user?.role?.replaceAll('_', ' ') || '-'}</div>
          <div><b>Email:</b> {user?.emailAddress || user?.email || '-'}</div>
          {user?.mustChangePassword && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 font-bold text-amber-800">Temporary password active. Please change your password.</div>}
        </div>
      </section>
      <form onSubmit={changePassword} className="card p-6">
        <h2 className="text-xl font-bold">Change Password</h2>
        <input type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} className="mt-4 w-full rounded-xl border px-4 py-3 text-sm" placeholder="Current password" required />
        <input type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" placeholder="New password, minimum 8 characters" required />
        <button className="mt-3 w-full rounded-xl bg-brandGold py-3 font-bold text-slate-950">Change Password</button>
        {msg && <div className="mt-3 rounded-xl bg-slate-100 p-3 text-sm">{msg}</div>}
      </form>
    </div>
  </AppShell>;
}
