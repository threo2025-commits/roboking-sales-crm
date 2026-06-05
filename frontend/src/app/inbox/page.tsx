'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

export default function InboxPage(){
  const [messages,setMessages]=useState<any[]>([]); const [msg,setMsg]=useState('');
  async function load(){ try{ setMessages(await api<any[]>('/email/messages')); }catch(e:any){ setMsg(e.message); } }
  async function sync(){ try{ const res:any=await api('/email/sync-inbox',{method:'POST'}); setMsg(`Inbox sync complete. Synced ${res.synced || 0} emails.`); load(); }catch(e:any){ setMsg(e.message); } }
  async function download(fileId:string){ try{ const res:any=await api(`/files/${fileId}/download-url`); window.open(res.url,'_blank'); }catch(e:any){ setMsg(e.message); } }
  useEffect(()=>{load();},[]);
  return <AppShell><PageHeader title="Email Inbox & Timeline" subtitle="Hostinger SMTP/IMAP sent and received emails linked with employee/client activity." />
    <div className="mb-4 flex flex-col gap-3 sm:flex-row"><button onClick={sync} className="min-h-11 rounded-xl bg-brandGold px-5 py-3 text-sm font-bold text-slate-950">Sync My Inbox</button><button onClick={load} className="min-h-11 rounded-xl border px-5 py-3 text-sm font-bold">Refresh</button></div>
    {msg&&<div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm">{msg}</div>}
    <section className="card min-w-0 p-4 sm:p-6"><h2 className="mb-4 text-xl font-bold">Email Messages</h2>{messages.map(m=><div key={m.id} className="mb-3 min-w-0 rounded-xl border p-4 text-sm"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><b className="break-words">{m.subject}</b><span className={`shrink-0 ${m.direction==='INBOUND'?'text-emerald-600':'text-blue-600'}`}>{m.direction}</span></div><div className="mt-1 break-words text-slate-500">From {m.fromEmail} to {m.toEmail} - {new Date(m.createdAt).toLocaleString()}</div>{m.lead && <div className="mt-1 text-xs font-bold text-brandGoldDark">Linked lead: {m.lead.organization}</div>}<div className="mt-2 max-w-full overflow-x-auto break-words" dangerouslySetInnerHTML={{__html:m.bodyHtml||m.bodyText||''}} />{m.attachments?.length>0&&<div className="mt-3 flex flex-wrap gap-2">{m.attachments.map((a:any)=><button key={a.id} onClick={()=>download(a.file.id)} className="max-w-full break-words rounded-lg border px-3 py-2 text-xs font-bold">Download {a.file.originalName}</button>)}</div>}</div>)}{!messages.length&&<p className="text-sm text-slate-500">No email messages yet.</p>}</section>
  </AppShell>;
}
