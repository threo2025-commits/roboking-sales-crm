'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

export default function SettingsPage(){
  const [settings,setSettings]=useState<Record<string,string>>({});
  const [adminBcc,setAdminBcc]=useState(''); const [msg,setMsg]=useState('');
  const [allowEmployeeDirectChat,setAllowEmployeeDirectChat]=useState(false);
  async function load(){ try{ const s=await api<Record<string,string>>('/settings'); setSettings(s); setAdminBcc(s.ADMIN_BCC_EMAIL||''); setAllowEmployeeDirectChat(s.ALLOW_EMPLOYEE_DIRECT_CHAT === 'true'); }catch(e:any){ setMsg(e.message); } }
  useEffect(()=>{load();},[]);
  async function save(){ await api('/settings',{method:'POST',body:JSON.stringify({key:'ADMIN_BCC_EMAIL',value:adminBcc})}); setMsg('Settings saved.'); load(); }
  async function saveChatSetting(){ await api('/settings',{method:'POST',body:JSON.stringify({key:'ALLOW_EMPLOYEE_DIRECT_CHAT',value:String(allowEmployeeDirectChat)})}); setMsg('Chat setting saved.'); load(); }
  return <AppShell><PageHeader title="Settings" subtitle="Owner/Manager settings for CRM email, BCC and core defaults." />
    <section className="card max-w-3xl p-6"><h2 className="text-xl font-bold">Email BCC Setting</h2><p className="mt-1 text-sm text-slate-500">Every employee email will auto-BCC this admin/founder address.</p><input value={adminBcc} onChange={e=>setAdminBcc(e.target.value)} className="mt-4 w-full rounded-xl border px-4 py-3 text-sm" placeholder="founder@roboking.in"/><button onClick={save} className="mt-3 rounded-xl bg-brandGold px-6 py-3 font-bold text-slate-950">Save</button>{msg&&<div className="mt-4 rounded-xl bg-slate-100 p-3 text-sm">{msg}</div>}</section>
    <section className="card mt-6 max-w-3xl p-6"><h2 className="text-xl font-bold">Employee Direct Chat</h2><p className="mt-1 text-sm text-slate-500">When disabled, employees cannot start direct employee-to-employee chats. Owner/Manager-created groups still work.</p><label className="mt-4 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={allowEmployeeDirectChat} onChange={e=>setAllowEmployeeDirectChat(e.target.checked)}/> Allow employee direct chat</label><button onClick={saveChatSetting} className="mt-3 rounded-xl bg-brandGold px-6 py-3 font-bold text-slate-950">Save Chat Setting</button></section>
    <section className="card mt-6 p-6"><h2 className="mb-3 text-xl font-bold">All Settings</h2><pre className="overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-white">{JSON.stringify(settings,null,2)}</pre></section>
  </AppShell>;
}
