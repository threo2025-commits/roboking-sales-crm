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
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const nav = useMemo(() => {
    if (!user) return allNav;
    if (user.role === 'EMPLOYEE') return allNav.filter(([label]) => !restrictedForEmployee.has(label));
    if (user.role === 'PA_ADMIN_ASSISTANT') return allNav.filter(([label]) => !restrictedForPa.has(label));
    return allNav;
  }, [user]);

  const pageTitle = nav.find(([, href]) => pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`)))?.[0] || 'RoboKing CRM';

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {}
    localStorage.removeItem('rk_crm_token');
    localStorage.removeItem('rk_crm_user');
    window.location.href = '/login';
  }

  const sidebar = (
    <>
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 py-5 lg:px-6 lg:py-6">
        <div className="flex min-w-0 items-center gap-3">
          <Image src="/logo/roboking-logo.png" alt="RoboKing" width={48} height={48} className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <div className="text-xl font-bold">
              <span>Robo</span>
              <span className="text-brandGold">King</span>
            </div>
            <div className="truncate text-xs text-slate-300">Sales Platform CRM</div>
          </div>
        </div>
        <button onClick={() => setMenuOpen(false)} aria-label="Close navigation" className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 text-xl font-bold lg:hidden">
          X
        </button>
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4 lg:px-4">
        {nav.map(([label, href]) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={label}
              href={href}
              className={`block rounded-lg px-4 py-3 text-sm transition ${
                active ? 'bg-brandGold font-semibold text-slate-950' : 'text-slate-200 hover:bg-white/10'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-4">
        <div className="mb-3 min-w-0 rounded-lg bg-white/10 p-3">
          <div className="truncate text-sm font-semibold text-white">{user?.name || 'RoboKing CRM'}</div>
          <div className="mt-1 truncate text-xs text-slate-300">{user?.role?.replaceAll('_', ' ') || ''}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/profile" className="rounded-lg border border-white/15 px-3 py-3 text-center text-sm font-semibold text-white">Profile</Link>
          <button onClick={logout} className="rounded-lg border border-white/15 px-3 py-3 text-sm font-semibold text-white">Logout</button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen min-w-0 bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-brandNavy text-white lg:flex">
        {sidebar}
      </aside>

      {menuOpen && <button aria-label="Close navigation overlay" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(86vw,320px)] flex-col bg-brandNavy text-white shadow-2xl transition-transform duration-200 lg:hidden ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebar}
      </aside>

      <main className="min-w-0 lg:ml-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-brandNavy text-white">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:h-20 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button onClick={() => setMenuOpen(true)} aria-label="Open navigation" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/15 lg:hidden">
                <span className="flex w-5 flex-col gap-1.5" aria-hidden="true">
                  <span className="h-0.5 w-full bg-current" />
                  <span className="h-0.5 w-full bg-current" />
                  <span className="h-0.5 w-full bg-current" />
                </span>
              </button>
              <Image src="/logo/roboking-logo.png" alt="RoboKing" width={38} height={38} className="h-10 w-10 shrink-0 rounded-lg lg:hidden" />
              <div className="min-w-0">
                <div className="truncate text-sm font-bold sm:text-base lg:hidden">{pageTitle}</div>
                <input
                  className="hidden w-full max-w-[420px] rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm outline-none placeholder:text-slate-300 lg:block"
                  placeholder="Search leads, clients, deals..."
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link href="/leads" className="rounded-lg bg-brandGold px-3 py-2.5 text-sm font-bold text-slate-950 sm:px-4">
                <span className="sm:hidden">+ Lead</span><span className="hidden sm:inline">+ Add Lead</span>
              </Link>
              <Link href="/imports" className="hidden rounded-lg border border-white/20 px-3 py-2.5 text-sm sm:inline-block">Import</Link>
              <Link href="/communications" className="hidden rounded-lg border border-white/20 px-3 py-2.5 text-sm md:inline-block">Communicate</Link>
              <button onClick={logout} className="hidden rounded-lg border border-white/20 px-3 py-2.5 text-sm lg:block">Logout</button>
            </div>
          </div>
        </header>
        <div className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
