'use client';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ title: '', description: '', priority: 'MEDIUM', dueAt: '' });
  const [msg, setMsg] = useState('');
  async function load(){ try{ setTasks(await api<any[]>('/tasks')); }catch(e:any){ setMsg(e.message); } }
  useEffect(()=>{ load(); },[]);
  async function create(e: FormEvent){ e.preventDefault(); await api('/tasks',{method:'POST',body:JSON.stringify({...form,dueAt:form.dueAt||undefined})}); setForm({title:'',description:'',priority:'MEDIUM',dueAt:''}); load(); }
  async function done(id:string){ await api(`/tasks/${id}/done`,{method:'PATCH'}); load(); }
  return <AppShell><PageHeader title="Tasks" subtitle="PA, Manager and Owner can coordinate employee work and reminders." />
    <div className="grid grid-cols-3 gap-6"><form onSubmit={create} className="card p-6"><h2 className="text-xl font-bold">Create Task</h2><input required placeholder="Task title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="mt-4 w-full rounded-xl border px-4 py-3 text-sm"/><textarea placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-3 h-24 w-full rounded-xl border px-4 py-3 text-sm"/><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm"><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select><input type="datetime-local" value={form.dueAt} onChange={e=>setForm({...form,dueAt:e.target.value})} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm"/><button className="mt-3 w-full rounded-xl bg-brandGold py-3 font-bold text-slate-950">Create Task</button></form>
    <section className="card col-span-2 p-6"><h2 className="mb-4 text-xl font-bold">Task List</h2>{msg && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</div>}{tasks.map(t=><div key={t.id} className="mb-3 flex items-center justify-between rounded-xl border p-4 text-sm"><div><b>{t.title}</b><div className="text-slate-500">{t.assignedTo?.name || '-'} · {t.priority} · {t.dueAt ? new Date(t.dueAt).toLocaleString() : 'No due date'}</div><p className="mt-1 text-slate-600">{t.description}</p></div><button onClick={()=>done(t.id)} className="rounded-xl border px-4 py-2 font-bold">Done</button></div>)}{!tasks.length && <p className="text-sm text-slate-500">No tasks yet.</p>}</section></div>
  </AppShell>;
}
