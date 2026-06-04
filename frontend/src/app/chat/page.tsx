'use client';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

export default function ChatPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [directMemberId, setDirectMemberId] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      setConversations(await api<any[]>('/chat/conversations'));
      setUsers(await api<any[]>('/users/directory'));
      try { setCurrentUser(JSON.parse(localStorage.getItem('rk_crm_user') || 'null')); } catch {}
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function open(conversation: any) {
    setActive(conversation);
    setMessages(await api<any[]>(`/chat/conversations/${conversation.id}/messages`));
  }

  async function createGroup() {
    setMsg('');
    try {
      await api('/chat/groups', { method: 'POST', body: JSON.stringify({ title, memberIds }) });
      setTitle('');
      setMemberIds([]);
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function createDirect() {
    setMsg('');
    try {
      await api('/chat/direct', { method: 'POST', body: JSON.stringify({ memberId: directMemberId }) });
      setDirectMemberId('');
      load();
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  async function send() {
    if (!active || !body) return;
    await api('/chat/messages', { method: 'POST', body: JSON.stringify({ conversationId: active.id, body }) });
    setBody('');
    open(active);
  }

  useEffect(() => { load(); }, []);
  const canCreateGroups = currentUser?.role === 'OWNER' || currentUser?.role === 'MANAGER';

  return (
    <AppShell>
      <PageHeader title="Internal Chat" subtitle="Admin-created groups, direct chat when allowed, and chat history visible to Owner/Manager." />
      {msg && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</div>}
      <div className="grid grid-cols-4 gap-6">
        <section className="card p-6">
          <h2 className="font-bold">Start Direct Chat</h2>
          <select value={directMemberId} onChange={(e) => setDirectMemberId(e.target.value)} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm">
            <option value="">Select user</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} - {u.role}</option>)}
          </select>
          <button onClick={createDirect} className="mt-3 w-full rounded-xl border px-4 py-3 text-sm font-bold">Start Direct Chat</button>

          {canCreateGroups && <>
            <h2 className="mt-6 font-bold">Create Group</h2>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Group title" className="mt-3 w-full rounded-xl border px-4 py-3 text-sm" />
            <select multiple value={memberIds} onChange={(e) => setMemberIds(Array.from(e.target.selectedOptions).map((o) => o.value))} className="mt-3 h-40 w-full rounded-xl border px-4 py-3 text-sm">
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} - {u.role}</option>)}
            </select>
            <button onClick={createGroup} className="mt-3 w-full rounded-xl bg-brandGold py-3 font-bold text-slate-950">Create Group</button>
          </>}

          <h2 className="mt-6 font-bold">Conversations</h2>
          {conversations.map((c) => (
            <button key={c.id} onClick={() => open(c)} className="mt-2 block w-full rounded-xl border p-3 text-left text-sm">
              <b>{c.title || 'Direct Chat'}</b>
              <div className="text-slate-500">{c.members?.length || 0} members</div>
            </button>
          ))}
        </section>

        <section className="card col-span-3 p-6">
          <h2 className="mb-4 text-xl font-bold">{active?.title || 'Select conversation'}</h2>
          <div className="h-[420px] overflow-auto rounded-xl bg-slate-50 p-4">
            {messages.map((m) => (
              <div key={m.id} className="mb-3 rounded-xl bg-white p-3 text-sm shadow-sm">
                <b>{m.sender?.name}</b>
                <p>{m.body}</p>
                <div className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <input value={body} onChange={(e) => setBody(e.target.value)} className="flex-1 rounded-xl border px-4 py-3 text-sm" placeholder="Write message..." />
            <button onClick={send} className="rounded-xl bg-slate-950 px-6 font-bold text-white">Send</button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
