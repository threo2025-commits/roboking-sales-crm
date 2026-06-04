'use client';
import Image from 'next/image';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '@/lib/api';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('owner');
  const [password, setPassword] = useState('ChangeMe@123');
  const [resetLoginId, setResetLoginId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function login(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await api<{ accessToken: string; user: any }>('/auth/login', { method: 'POST', body: JSON.stringify({ loginId, password }) });
      localStorage.setItem('rk_crm_token', res.accessToken);
      localStorage.setItem('rk_crm_user', JSON.stringify(res.user));
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  }

  async function requestReset() {
    setError('');
    setMessage('');
    try {
      await api('/auth/request-password-reset', { method: 'POST', body: JSON.stringify({ loginId: resetLoginId || loginId, reason: 'Forgot password from login page' }) });
      setMessage('Password reset request sent to Owner/Manager.');
    } catch (err: any) {
      setError(err.message || 'Request failed');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brandNavy p-6">
      <div className="grid w-full max-w-5xl grid-cols-2 overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-slate-950 p-10 text-white">
          <div className="flex items-center gap-3">
            <Image src="/logo/roboking-logo.png" alt="RoboKing" width={72} height={72} className="rounded-2xl" />
            <div><h1 className="text-3xl font-bold">Robo<span className="text-brandGold">King</span></h1><p className="text-sm text-slate-300">Sales Platform CRM</p></div>
          </div>
          <h2 className="mt-16 text-4xl font-bold leading-tight">Private CRM login for the RoboKing sales team.</h2>
          <p className="mt-4 text-slate-300">Owner/Manager creates every ID. Only one active session is allowed per user ID.</p>
          <div className="mt-10 rounded-2xl border border-brandGold/30 bg-brandGold/10 p-5 text-sm text-brandGold">
            Default seed login: owner / ChangeMe@123
          </div>
        </div>

        <form onSubmit={login} className="p-10">
          <h2 className="text-2xl font-bold text-slate-950">Login</h2>
          <p className="mt-1 text-sm text-slate-500">Use your assigned CRM login ID and password.</p>
          <label className="mb-2 mt-8 block text-sm font-semibold">Login ID</label>
          <input value={loginId} onChange={(e) => setLoginId(e.target.value)} className="mb-4 w-full rounded-xl border px-4 py-3 outline-none focus:border-brandGold" />
          <label className="mb-2 block text-sm font-semibold">Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-4 w-full rounded-xl border px-4 py-3 outline-none focus:border-brandGold" />
          {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
          <button className="w-full rounded-xl bg-brandGold py-3 font-bold text-slate-950">Login</button>

          <div className="mt-8 rounded-2xl bg-slate-50 p-4">
            <h3 className="font-bold">Forgot password?</h3>
            <p className="mt-1 text-sm text-slate-500">Send a reset request to Owner/Manager. They will set a new password.</p>
            <input value={resetLoginId} onChange={(e) => setResetLoginId(e.target.value)} placeholder="Login ID" className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" />
            <button type="button" onClick={requestReset} className="mt-3 w-full rounded-xl border border-slate-200 py-3 text-sm font-bold">Send reset request</button>
          </div>
        </form>
      </div>
    </main>
  );
}
