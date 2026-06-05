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

function dashboardPathForRole(_role: string) {
  return '/dashboard';
}

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function login(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);
    try {
      const res = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ loginId: loginId.trim(), password })
      });
      localStorage.setItem('rk_crm_token', res.accessToken);
      localStorage.setItem('rk_crm_user', JSON.stringify(res.user));
      window.location.href = dashboardPathForRole(res.user.role);
    } catch (err) {
      setError(friendlyLoginError(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-brandNavy px-3 py-3 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex flex-col justify-between bg-slate-950 p-5 text-white sm:p-8 lg:p-10">
          <div>
            <div className="flex items-center gap-4">
              <Image src="/logo/roboking-logo.png" alt="RoboKing" width={72} height={72} className="h-14 w-14 rounded-xl sm:h-[72px] sm:w-[72px]" priority />
              <div>
                <div className="text-3xl font-bold">
                  Robo<span className="text-brandGold">King</span>
                </div>
                <div className="text-sm text-slate-300">Sales Platform</div>
              </div>
            </div>

            <div className="mt-8 max-w-xl lg:mt-16">
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">RoboKing Sales Platform</h1>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                Manage leads, follow-ups, client communication, and sales activity in one secure workspace.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {['Lead tracking', 'Follow-up planning', 'Client communication', 'Sales reporting'].map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-50 p-3 sm:p-6 lg:p-10">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">Sales team login</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Use your assigned RoboKing login ID and password.</p>
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
              {message && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

              <button disabled={isLoading} className="w-full rounded-xl bg-brandGold py-3 font-bold text-slate-950 transition hover:bg-brandGoldDark disabled:cursor-not-allowed disabled:opacity-70">
                {isLoading ? 'Signing in...' : 'Login'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
