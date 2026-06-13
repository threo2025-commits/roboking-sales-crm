'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

type UserRow = { id: string; name: string; loginId: string; email?: string; emailAddress?: string; role: string; status: string; mustChangePassword: boolean; lastLoginAt?: string; userSessions?: any[]; emailAccount?: any };

export default function TeamPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', loginId: '', email: '', password: 'ChangeMe@123', role: 'EMPLOYEE', managerId: '' });
  const [msg, setMsg] = useState('');
  const [formMsg, setFormMsg] = useState('');
  const [creating, setCreating] = useState(false);
  const [emailSetup, setEmailSetup] = useState({ userId: '', emailAddress: '', password: '', smtpHost: 'smtp.hostinger.com', smtpPort: 465, imapHost: 'imap.hostinger.com', imapPort: 993 });

  async function load() {
    try {
      setUsers(await api<UserRow[]>('/users'));
      setResetRequests(await api<any[]>('/users/password-reset-requests'));
    } catch (e: any) { setMsg(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setFormMsg('');
    const name = form.name.trim();
    const loginId = form.loginId.trim();
    const email = form.email.trim();
    if (!name || !loginId || !email) {
      setFormMsg('Name, Login ID, and sales email are required.');
      return;
    }
    if (form.password.length < 8) {
      setFormMsg('Temporary password must contain at least 8 characters.');
      return;
    }

    setCreating(true);
    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          name,
          loginId,
          email,
          emailAddress: email,
          managerId: form.managerId || undefined
        })
      });
      setFormMsg(`Login ID "${loginId}" created successfully. The user must change the temporary password after login.`);
      setForm({ name: '', loginId: '', email: '', password: 'ChangeMe@123', role: 'EMPLOYEE', managerId: '' });
      await load();
    } catch (error: any) {
      setFormMsg(error.message || 'Unable to create this Login ID.');
    } finally {
      setCreating(false);
    }
  }

  async function forceLogout(id: string) {
    try {
      await api(`/users/${id}/force-logout`, { method: 'POST' });
      setMsg('User force logged out.');
      await load();
    } catch (error: any) {
      setMsg(error.message || 'Unable to force logout this user.');
    }
  }

  async function toggleStatus(id: string, status: string) {
    try {
      await api(`/users/${id}/${status === 'ACTIVE' ? 'disable' : 'enable'}`, { method: 'POST' });
      setMsg(status === 'ACTIVE' ? 'User disabled and active session closed.' : 'User enabled.');
      await load();
    } catch (error: any) {
      setMsg(error.message || 'Unable to update this user.');
    }
  }


  async function connectEmail(e: FormEvent) {
    e.preventDefault(); setMsg('');
    try {
      await api('/users/connect-email-account', { method: 'POST', body: JSON.stringify({ ...emailSetup, smtpPort: Number(emailSetup.smtpPort), imapPort: Number(emailSetup.imapPort) }) });
      setMsg('Hostinger SMTP/IMAP account connected for employee.');
      setEmailSetup({ userId: '', emailAddress: '', password: '', smtpHost: 'smtp.hostinger.com', smtpPort: 465, imapHost: 'imap.hostinger.com', imapPort: 993 });
      load();
    } catch (e: any) { setMsg(e.message); }
  }

  async function resetPassword(id: string, resetRequestId?: string) {
    const newPassword = prompt('Enter new password for user');
    if (!newPassword) return;
    if (newPassword.length < 8) {
      setMsg('New password must contain at least 8 characters.');
      return;
    }
    try {
      await api('/users/reset-password', { method: 'POST', body: JSON.stringify({ userId: id, newPassword, resetRequestId }) });
      setMsg('Password reset done. User must login with the new password.');
      await load();
    } catch (error: any) {
      setMsg(error.message || 'Unable to reset this password.');
    }
  }

  return (
    <AppShell>
      <PageHeader title="Team Management" subtitle="Owner/Manager creates IDs, resets passwords, configures email accounts, and manages one-login-per-ID sessions." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
        <form onSubmit={createUser} className="card p-4 sm:p-6">
          <h2 className="text-xl font-bold">Create User</h2>
          <p className="mt-1 text-sm text-slate-500">All fields except manager are required.</p>
          <input required autoComplete="name" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-4 w-full rounded-xl border px-4 py-3 text-sm" />
          <input required autoComplete="off" placeholder="Login ID" value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" />
          <input required type="email" autoComplete="email" placeholder="Sales email (name@roboking.in)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" />
          <input required minLength={8} type="password" autoComplete="new-password" placeholder="Temporary password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm">
            <option value="OWNER">Owner</option><option value="MANAGER">Manager</option><option value="PA_ADMIN_ASSISTANT">PA / Admin Assistant</option><option value="EMPLOYEE">Employee</option>
          </select>
          <select value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm">
            <option value="">Manager (optional)</option>
            {users.filter((user) => ['OWNER', 'MANAGER'].includes(user.role)).map((user) => <option key={user.id} value={user.id}>{user.name} - {user.role}</option>)}
          </select>
          <button disabled={creating} className="mt-3 w-full rounded-xl bg-brandGold py-3 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60">
            {creating ? 'Creating Login ID...' : 'Create Login ID'}
          </button>
          {formMsg && (
            <div role="status" className={`mt-3 rounded-xl px-4 py-3 text-sm ${formMsg.includes('successfully') ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
              {formMsg}
            </div>
          )}
        </form>

        <section className="card p-4 sm:p-6 lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold">Password Reset Requests</h2>
          {resetRequests.map((r) => (
            <div key={r.id} className="mb-3 flex flex-col items-start justify-between gap-3 rounded-xl border p-4 text-sm sm:flex-row sm:items-center">
              <div><b>{r.user.name}</b> ({r.user.loginId}) requested reset <div className="text-slate-500">{r.reason || 'No reason'}</div></div>
              <button onClick={() => resetPassword(r.user.id, r.id)} className="min-h-11 w-full rounded-xl bg-slate-950 px-4 py-2 font-bold text-white sm:w-auto">Reset Password</button>
            </div>
          ))}
          {!resetRequests.length && <p className="text-sm text-slate-500">No pending reset requests.</p>}
        </section>
      </div>


      <section className="card mt-5 p-4 sm:mt-6 sm:p-6">
        <h2 className="text-xl font-bold">Connect Employee Hostinger Email</h2>
        <p className="mt-1 text-sm text-slate-500">Owner/Manager enters SMTP/IMAP credentials. CRM will send from the employee sub-email and sync client replies.</p>
        <form onSubmit={connectEmail} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select value={emailSetup.userId} onChange={(e) => setEmailSetup({ ...emailSetup, userId: e.target.value })} className="rounded-xl border px-4 py-3 text-sm" required>
            <option value="">Select employee/user</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} - {u.loginId} - {u.role}</option>)}
          </select>
          <input value={emailSetup.emailAddress} onChange={(e) => setEmailSetup({ ...emailSetup, emailAddress: e.target.value })} className="rounded-xl border px-4 py-3 text-sm" placeholder="employee@roboking.in" required />
          <input type="password" value={emailSetup.password} onChange={(e) => setEmailSetup({ ...emailSetup, password: e.target.value })} className="rounded-xl border px-4 py-3 text-sm" placeholder="Hostinger mailbox password" required />
          <input value={emailSetup.smtpHost} onChange={(e) => setEmailSetup({ ...emailSetup, smtpHost: e.target.value })} className="rounded-xl border px-4 py-3 text-sm" placeholder="SMTP host" />
          <input type="number" value={emailSetup.smtpPort} onChange={(e) => setEmailSetup({ ...emailSetup, smtpPort: Number(e.target.value) })} className="rounded-xl border px-4 py-3 text-sm" placeholder="SMTP port" />
          <input value={emailSetup.imapHost} onChange={(e) => setEmailSetup({ ...emailSetup, imapHost: e.target.value })} className="rounded-xl border px-4 py-3 text-sm" placeholder="IMAP host" />
          <input type="number" value={emailSetup.imapPort} onChange={(e) => setEmailSetup({ ...emailSetup, imapPort: Number(e.target.value) })} className="rounded-xl border px-4 py-3 text-sm" placeholder="IMAP port" />
          <button className="rounded-xl bg-brandGold px-6 py-3 font-bold text-slate-950">Save SMTP/IMAP</button>
        </form>
      </section>

      <section className="card mt-5 overflow-x-auto p-4 sm:mt-6 sm:p-6">
        <h2 className="mb-4 text-xl font-bold">Users & Active Sessions</h2>
        {msg && <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm">{msg}</div>}
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-400"><tr><th className="py-3">Name</th><th>Login ID</th><th>Role</th><th>Email</th><th>Session</th><th>Email Sync</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="py-4 font-semibold">{u.name}</td><td>{u.loginId}</td><td>{u.role.replaceAll('_', ' ')}</td><td>{u.emailAddress || u.email || '-'}</td>
                <td>{u.userSessions?.length ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Active</span> : <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">Offline</span>}</td>
                <td>{u.emailAccount ? 'Connected' : 'Not connected'}</td>
                <td className="space-x-2"><button onClick={() => resetPassword(u.id)} className="rounded-lg border px-3 py-1">Reset</button><button onClick={() => forceLogout(u.id)} className="rounded-lg border px-3 py-1">Force logout</button><button onClick={() => toggleStatus(u.id, u.status)} className="rounded-lg border px-3 py-1">{u.status === 'ACTIVE' ? 'Disable' : 'Enable'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
