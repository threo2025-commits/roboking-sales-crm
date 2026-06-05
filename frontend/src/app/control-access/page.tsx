'use client';
import Image from 'next/image';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, api } from '@/lib/api';

type LoginResponse = {
  accessToken: string;
  user: { role: string };
};

function friendlyLoginError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Invalid login ID or password.';
    if (error.status === 409) return 'This account is already active on another device. Contact Owner/Manager to force logout.';
  }
  return 'Something went wrong. Please try again.';
}

export default function ControlAccessPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function login(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ loginId: loginId.trim(), password })
      });
      localStorage.setItem('rk_crm_token', res.accessToken);
      localStorage.setItem('rk_crm_user', JSON.stringify(res.user));

      if (res.user.role === 'OWNER' || res.user.role === 'MANAGER') {
        window.location.href = '/dashboard';
        return;
      }

      window.location.href = '/dashboard';
    } catch (err) {
      setError(friendlyLoginError(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-3 py-4 text-white sm:px-6 sm:py-8">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white p-5 text-slate-950 shadow-2xl sm:p-8">
        <div className="flex items-center gap-4">
          <Image src="/logo/roboking-logo.png" alt="RoboKing" width={64} height={64} className="h-14 w-14 rounded-xl sm:h-16 sm:w-16" priority />
          <div>
            <div className="text-2xl font-bold">
              Robo<span className="text-brandGold">King</span>
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Control Access</div>
          </div>
        </div>

        <div className="mt-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Authorized Control Access</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">For Owner and Manager only.</p>
        </div>

        <form onSubmit={login} className="mt-8">
          <label className="mb-2 block text-sm font-semibold text-slate-800">Login ID</label>
          <input
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            autoComplete="username"
            className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-brandGold focus:ring-4 focus:ring-brandGold/20"
          />

          <label className="mb-2 block text-sm font-semibold text-slate-800">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-brandGold focus:ring-4 focus:ring-brandGold/20"
          />

          {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <button disabled={isLoading} className="w-full rounded-xl bg-brandGold py-3 font-bold text-slate-950 transition hover:bg-brandGoldDark disabled:cursor-not-allowed disabled:opacity-70">
            {isLoading ? 'Verifying...' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  );
}
