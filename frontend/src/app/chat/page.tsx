'use client';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { PageHeader } from '@/components/PageHeader';
import { api } from '@/lib/api';

function conversationName(conversation: any, currentUser: any) {
  if (conversation.isGroup) return conversation.title || 'Untitled group';
  return conversation.members?.find((member: any) => member.userId !== currentUser?.id)?.user?.name || 'Direct conversation';
}

export default function ChatPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('TEAM');
  const [linkedLeadId, setLinkedLeadId] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [directMemberId, setDirectMemberId] = useState('');
  const [body, setBody] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [addMemberIds, setAddMemberIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const [conversationRows, directory, leadRows] = await Promise.all([
        api<any[]>('/chat/conversations'),
        api<any[]>('/users/directory'),
        api<any[]>('/leads')
      ]);
      setConversations(conversationRows);
      setUsers(directory);
      setLeads(leadRows);
      try { setCurrentUser(JSON.parse(localStorage.getItem('rk_crm_user') || 'null')); } catch {}
      return conversationRows;
    } catch (error: any) {
      setMsg(error.message);
    }
  }

  async function open(conversation: any) {
    setMsg('');
    setActive(conversation);
    setShowManage(false);
    setAddMemberIds([]);
    setMessageSearch('');
    try {
      const rows = await api<any[]>(`/chat/conversations/${conversation.id}/messages`);
      setMessages(rows);
      await api(`/chat/conversations/${conversation.id}/read`, { method: 'POST', body: '{}' });
      setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, unreadCount: 0 } : item));
    } catch (error: any) {
      setMsg(error.message);
    }
  }

  async function createGroup() {
    setMsg('');
    try {
      const linkedLead = leads.find((lead) => lead.id === linkedLeadId);
      const created: any = await api('/chat/groups', {
        method: 'POST',
        body: JSON.stringify({
          title,
          category,
          memberIds,
          linkedLeadId: linkedLeadId || undefined,
          linkedDealId: linkedLead?.deals?.[0]?.id
        })
      });
      setTitle('');
      setCategory('TEAM');
      setLinkedLeadId('');
      setMemberIds([]);
      setShowCreate(false);
      const rows = await load();
      await open(rows?.find((item: any) => item.id === created.id) || created);
    } catch (error: any) {
      setMsg(error.message);
    }
  }

  async function createDirect() {
    setMsg('');
    try {
      const created: any = await api('/chat/direct', { method: 'POST', body: JSON.stringify({ memberId: directMemberId }) });
      setDirectMemberId('');
      setShowCreate(false);
      await load();
      await open(created);
    } catch (error: any) {
      setMsg(error.message);
    }
  }

  async function send() {
    if (!active || !body.trim() || sending) return;
    setSending(true);
    setMsg('');
    try {
      await api('/chat/messages', { method: 'POST', body: JSON.stringify({ conversationId: active.id, body: body.trim() }) });
      setBody('');
      await open(active);
      await load();
    } catch (error: any) {
      setMsg(error.message);
    } finally {
      setSending(false);
    }
  }

  async function updateGroup(values: { title?: string; category?: string; ownerId?: string }) {
    if (!active?.isGroup) return;
    setMsg('');
    try {
      await api(`/chat/groups/${active.id}`, { method: 'PATCH', body: JSON.stringify(values) });
      const rows = await load();
      const updated = rows?.find((item: any) => item.id === active.id);
      if (updated) setActive(updated);
    } catch (error: any) {
      setMsg(error.message);
    }
  }

  async function addMembers() {
    if (!active?.isGroup || !addMemberIds.length) return;
    setMsg('');
    try {
      await api(`/chat/groups/${active.id}/members`, { method: 'POST', body: JSON.stringify({ memberIds: addMemberIds }) });
      setAddMemberIds([]);
      const rows = await load();
      const updated = rows?.find((item: any) => item.id === active.id);
      if (updated) setActive(updated);
    } catch (error: any) {
      setMsg(error.message);
    }
  }

  async function removeMember(userId: string) {
    if (!active?.isGroup) return;
    setMsg('');
    try {
      await api(`/chat/groups/${active.id}/members/${userId}`, { method: 'DELETE' });
      const rows = await load();
      const updated = rows?.find((item: any) => item.id === active.id);
      if (updated) setActive(updated);
    } catch (error: any) {
      setMsg(error.message);
    }
  }

  async function deleteGroup() {
    if (!active?.isGroup || !confirm(`Delete group "${conversationName(active, currentUser)}"? This removes its message history.`)) return;
    setMsg('');
    try {
      await api(`/chat/groups/${active.id}`, { method: 'DELETE' });
      setActive(null);
      setMessages([]);
      setShowManage(false);
      await load();
    } catch (error: any) {
      setMsg(error.message);
    }
  }

  useEffect(() => { load(); }, []);

  const canCreateGroups = currentUser?.role === 'OWNER' || currentUser?.role === 'MANAGER';
  const filteredUsers = useMemo(() => {
    const query = memberSearch.trim().toLowerCase();
    return users.filter((user) => user.id !== currentUser?.id && (!query || `${user.name} ${user.loginId} ${user.role}`.toLowerCase().includes(query)));
  }, [users, currentUser, memberSearch]);
  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const name = conversationName(conversation, currentUser);
      const members = conversation.members?.map((member: any) => member.user?.name).join(' ') || '';
      const lastMessage = conversation.messages?.[0]?.body || '';
      const matchesCategory = !categoryFilter || conversation.category === categoryFilter;
      return matchesCategory && (!query || `${name} ${members} ${lastMessage}`.toLowerCase().includes(query));
    });
  }, [conversations, currentUser, search, categoryFilter]);
  const filteredMessages = useMemo(() => {
    const query = messageSearch.trim().toLowerCase();
    return messages.filter((message) => !query || `${message.sender?.name} ${message.body}`.toLowerCase().includes(query));
  }, [messages, messageSearch]);

  return <AppShell>
    <PageHeader title="Team Chat" subtitle="Search conversations, coordinate in groups, and keep opportunity discussions connected to the team." />
    {msg && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{msg}</div>}
    <div className="grid min-h-[calc(100vh-13rem)] grid-cols-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[21rem_minmax(0,1fr)]">
      <aside className={`${active ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col border-r border-slate-200`}>
        <div className="border-b border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-bold text-slate-950">Conversations</h2><p className="text-xs text-slate-500">{conversations.reduce((sum, item) => sum + (item.unreadCount || 0), 0)} unread</p></div>
            <button onClick={() => setShowCreate((value) => !value)} className="h-10 rounded-lg bg-slate-950 px-3 text-sm font-bold text-white">{showCreate ? 'Close' : 'New chat'}</button>
          </div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search groups, people, messages..." className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
            <option value="">All conversations</option>
            <option value="TEAM">General teams</option>
            <option value="SALES">Sales teams</option>
            <option value="CLIENT_HANDLING">Client handling</option>
            <option value="PROJECT">Projects</option>
            <option value="LEAD_DISCUSSION">Lead discussions</option>
          </select>
        </div>

        {showCreate && <div className="max-h-[44vh] overflow-y-auto border-b border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold">Start direct chat</h3>
          <input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search team member" className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm" />
          <select value={directMemberId} onChange={(event) => setDirectMemberId(event.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm">
            <option value="">Select user</option>
            {filteredUsers.map((user) => <option key={user.id} value={user.id}>{user.name} - {user.role.replaceAll('_', ' ')}</option>)}
          </select>
          <button disabled={!directMemberId} onClick={createDirect} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold disabled:opacity-40">Start conversation</button>

          {canCreateGroups && <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-bold">Create team group</h3>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Group name" className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm" />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm">
              <option value="TEAM">General team</option>
              <option value="SALES">Sales team</option>
              <option value="CLIENT_HANDLING">Client handling</option>
              <option value="PROJECT">Project</option>
              <option value="LEAD_DISCUSSION">Lead discussion</option>
            </select>
            <select value={linkedLeadId} onChange={(event) => setLinkedLeadId(event.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2.5 text-sm">
              <option value="">No linked opportunity</option>
              {leads.filter((lead) => !lead.deletedAt).map((lead) => <option key={lead.id} value={lead.id}>{lead.organization}</option>)}
            </select>
            <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border bg-white p-2">
              {filteredUsers.map((user) => <label key={user.id} className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={memberIds.includes(user.id)} onChange={(event) => setMemberIds((current) => event.target.checked ? [...current, user.id] : current.filter((id) => id !== user.id))} />
                <span className="min-w-0 truncate">{user.name}</span><span className="ml-auto text-xs text-slate-400">{user.role.replaceAll('_', ' ')}</span>
              </label>)}
            </div>
            <button disabled={!title.trim() || !memberIds.length} onClick={createGroup} className="mt-2 w-full rounded-lg bg-brandGold px-3 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-40">Create group</button>
          </div>}
        </div>}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => {
            const last = conversation.messages?.[0];
            const name = conversationName(conversation, currentUser);
            return <button key={conversation.id} onClick={() => open(conversation)} className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left transition hover:bg-slate-50 ${active?.id === conversation.id ? 'bg-amber-50' : ''}`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{name.slice(0, 2).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2"><b className="truncate text-sm">{name}</b>{conversation.unreadCount > 0 && <span className="rounded-full bg-brandGold px-2 py-0.5 text-[10px] font-bold text-slate-950">{conversation.unreadCount}</span>}</span>
                {conversation.isGroup && <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{(conversation.category || 'TEAM').replaceAll('_', ' ')}</span>}
                <span className="mt-1 block truncate text-xs text-slate-500">{last ? `${last.sender?.name || 'User'}: ${last.body}` : `${conversation.members?.length || 0} members`}</span>
              </span>
            </button>;
          })}
          {!filteredConversations.length && <p className="p-6 text-center text-sm text-slate-500">No conversations found.</p>}
        </div>
      </aside>

      <section className={`${active ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 flex-col`}>
        {active ? <>
          <header className="flex items-center gap-3 border-b border-slate-200 p-4">
            <button onClick={() => setActive(null)} className="h-10 rounded-lg border px-3 text-sm font-bold lg:hidden">Back</button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-bold">{conversationName(active, currentUser)}</h2>
              <p className="truncate text-xs text-slate-500">{active.isGroup ? `${active.members?.length || 0} members - ${(active.category || 'TEAM').replaceAll('_', ' ')}` : 'Direct conversation'}</p>
              {active.linkedLeadId && <p className="truncate text-xs font-semibold text-amber-700">Opportunity: {leads.find((lead) => lead.id === active.linkedLeadId)?.organization || 'Linked lead'}</p>}
            </div>
            <input value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder="Search messages" className="hidden w-52 rounded-lg border px-3 py-2 text-sm sm:block" />
            {canCreateGroups && active.isGroup && <button onClick={() => setShowManage((value) => !value)} className="h-10 rounded-lg border px-3 text-sm font-bold">{showManage ? 'Close' : 'Manage'}</button>}
          </header>
          {showManage && canCreateGroups && active.isGroup && <section className="border-b border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 xl:grid-cols-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Group name</label>
                <div className="mt-2 flex gap-2">
                  <input defaultValue={active.title || ''} id="chat-group-title" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" />
                  <button onClick={() => updateGroup({ title: (document.getElementById('chat-group-title') as HTMLInputElement)?.value })} className="rounded-lg bg-slate-950 px-3 text-sm font-bold text-white">Save</button>
                </div>
                <label className="mt-3 block text-xs font-bold uppercase text-slate-500">Group type</label>
                <select value={active.category || 'TEAM'} onChange={(event) => updateGroup({ category: event.target.value })} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="TEAM">General team</option>
                  <option value="SALES">Sales team</option>
                  <option value="CLIENT_HANDLING">Client handling</option>
                  <option value="PROJECT">Project</option>
                  <option value="LEAD_DISCUSSION">Lead discussion</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Owner</label>
                <select value={active.ownerId || active.createdById} onChange={(event) => updateGroup({ ownerId: event.target.value })} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm">
                  {active.members?.map((member: any) => <option key={member.userId} value={member.userId}>{member.user?.name}</option>)}
                </select>
                <label className="mt-3 block text-xs font-bold uppercase text-slate-500">Add members</label>
                <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border bg-white p-2">
                  {users.filter((user) => !active.members?.some((member: any) => member.userId === user.id)).map((user) => <label key={user.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                    <input type="checkbox" checked={addMemberIds.includes(user.id)} onChange={(event) => setAddMemberIds((current) => event.target.checked ? [...current, user.id] : current.filter((id) => id !== user.id))} />
                    <span>{user.name}</span>
                  </label>)}
                </div>
                <button disabled={!addMemberIds.length} onClick={addMembers} className="mt-2 w-full rounded-lg bg-brandGold px-3 py-2 text-sm font-bold disabled:opacity-40">Add selected members</button>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-slate-500">Members</label>
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {active.members?.map((member: any) => {
                    const owner = member.userId === (active.ownerId || active.createdById);
                    return <div key={member.userId} className="flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-sm">
                      <span className="min-w-0 truncate">{member.user?.name}{owner ? ' (Owner)' : ''}</span>
                      {!owner && <button onClick={() => removeMember(member.userId)} className="shrink-0 text-xs font-bold text-red-600">Remove</button>}
                    </div>;
                  })}
                </div>
                <button onClick={deleteGroup} className="mt-3 w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Delete group</button>
              </div>
            </div>
          </section>}
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-3 sm:p-5">
            <input value={messageSearch} onChange={(event) => setMessageSearch(event.target.value)} placeholder="Search messages" className="mb-3 w-full rounded-lg border px-3 py-2.5 text-sm sm:hidden" />
            <div className="mx-auto max-w-3xl space-y-3">
              {filteredMessages.map((message) => {
                const own = message.senderId === currentUser?.id;
                return <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
                  <article className={`max-w-[88%] rounded-xl px-4 py-3 text-sm shadow-sm sm:max-w-[72%] ${own ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-900'}`}>
                    <div className={`mb-1 text-xs font-bold ${own ? 'text-brandGold' : 'text-slate-500'}`}>{message.sender?.name || 'Team member'}</div>
                    <p className="whitespace-pre-wrap break-words leading-6">{message.body}</p>
                    <div className={`mt-2 flex flex-wrap items-center justify-end gap-2 text-[10px] ${own ? 'text-slate-300' : 'text-slate-400'}`}>
                      <time>{new Date(message.createdAt).toLocaleString()}</time>
                      {own && <span>{message.seenBy?.length ? `Seen by ${message.seenBy.map((user: any) => user.name).join(', ')}` : 'Delivered'}</span>}
                    </div>
                  </article>
                </div>;
              })}
              {!filteredMessages.length && <p className="py-10 text-center text-sm text-slate-500">No messages found.</p>}
            </div>
          </div>
          <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
            <div className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row">
              <textarea value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} className="min-h-12 min-w-0 flex-1 resize-none rounded-lg border px-4 py-3 text-sm" placeholder="Write a message..." />
              <button disabled={!body.trim() || sending} onClick={send} className="min-h-12 rounded-lg bg-brandGold px-6 py-3 text-sm font-bold text-slate-950 disabled:opacity-40">{sending ? 'Sending...' : 'Send'}</button>
            </div>
          </div>
        </> : <div className="flex flex-1 items-center justify-center p-8 text-center"><div><h2 className="text-xl font-bold">Select a conversation</h2><p className="mt-2 text-sm text-slate-500">Choose a group or team member to open the discussion.</p></div></div>}
      </section>
    </div>
  </AppShell>;
}
