'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '@/lib/api';

const allNav = [
  ['Dashboard', '/dashboard'],
  ['Leads', '/leads'],
  ['Clients', '/clients'],
  ['Deals', '/deals'],
  ['Follow-ups', '/followups'],
  ['Notifications', '/notifications'],
  ['Communications', '/communications'],
  ['Email Inbox', '/inbox'],
  ['Internal Chat', '/chat'],
  ['Calendar', '/calendar'],
  ['Tasks', '/tasks'],
  ['Imports', '/imports'],
  ['Templates', '/templates'],
  ['Team', '/team'],
  ['Reports', '/reports'],
  ['Audit Logs', '/audit'],
  ['Settings', '/settings'],
  ['Profile', '/profile']
];

const restrictedForEmployee = new Set(['Team', 'Audit Logs', 'Settings', 'Templates']);
const restrictedForPa = new Set(['Team', 'Audit Logs', 'Settings', 'Templates']);

type StoredUser = { name: string; role: string; loginId: string } | null;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<StoredUser>(null);

  useEffect(() => {
    const token = localStorage.getItem('rk_crm_token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    try {
      setUser(JSON.parse(localStorage.getItem('rk_crm_user') || 'null'));
    } catch {}
    api<{ user: NonNullable<StoredUser> }>('/auth/me')
      .then((res) => {
        setUser(res.user);
        localStorage.setItem('rk_crm_user', JSON.stringify(res.user));
      })
      .catch(() => {
        localStorage.removeItem('rk_crm_token');
        localStorage.removeItem('rk_crm_user');
        window.location.href = '/login';
      });
  }, []);

  const nav = useMemo(() => {
    if (!user) return allNav;
    if (user.role === 'EMPLOYEE') return allNav.filter(([label]) => !restrictedForEmployee.has(label));
    if (user.role === 'PA_ADMIN_ASSISTANT') return allNav.filter(([label]) => !restrictedForPa.has(label));
    return allNav;
  }, [user]);

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('rk_crm_token');
    localStorage.removeItem('rk_crm_user');
    window.location.href = '/login';
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 flex w-72 flex-col bg-brandNavy text-white">
        <div className="flex shrink-0 items-center gap-3 px-6 py-6">
          <Image src="/logo/roboking-logo.png" alt="RoboKing" width={52} height={52} className="rounded-xl" />
          <div>
            <div className="text-xl font-bold">
              <span>Robo</span>
              <span className="text-brandGold">King</span>
            </div>
            <div className="text-xs text-slate-300">Sales Platform CRM</div>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 pb-4">
          {nav.map(([label, href]) => {
            const active = pathname === href;
            return (
              <Link
                key={label}
                href={href}
                className={`block rounded-xl px-4 py-3 text-sm transition ${
                  active ? 'bg-brandGold font-semibold text-slate-950' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="rounded-xl bg-white/10 p-4">
            <div className="font-semibold text-brandGold">Stay on top of your leads</div>
            <p className="mt-1 text-xs text-slate-300">Consistency today, success tomorrow.</p>
            <Link href="/followups" className="mt-3 inline-block rounded-lg bg-brandGold px-3 py-2 text-xs font-bold text-slate-950">
              View Today&apos;s Tasks
            </Link>
          </div>
        </div>
      </aside>

      <main className="ml-72">
        <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-200 bg-brandNavy px-8 text-white">
          <input
            className="w-[420px] rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-slate-300"
            placeholder="Search leads, clients, deals..."
          />
          <div className="flex items-center gap-3">
            <Link href="/leads" className="rounded-xl bg-brandGold px-4 py-2 text-sm font-bold text-slate-950">
              + Add Lead
            </Link>
            <Link href="/imports" className="rounded-xl border border-white/20 px-4 py-2 text-sm">
              Import Excel
            </Link>
            <Link href="/communications" className="rounded-xl border border-white/20 px-4 py-2 text-sm">
              Communicate
            </Link>
            <button onClick={logout} className="rounded-xl border border-white/20 px-4 py-2 text-sm">
              Logout
            </button>
            <div className="ml-3 rounded-full bg-white/10 px-4 py-2 text-sm">
              {user?.name || 'RoboKing CRM'} - {user?.role?.replaceAll('_', ' ') || ''}
            </div>
          </div>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
