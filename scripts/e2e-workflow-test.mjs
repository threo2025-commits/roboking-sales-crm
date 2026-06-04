import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const API = process.env.E2E_API_URL || 'http://localhost:5105/api';
const suffix = Date.now().toString(36);
const prisma = new PrismaClient();
const results = [];
let backend;
let originalSettings = [];

function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  const marker = ok ? 'PASS' : 'FAIL';
  console.log(`${marker} ${name}${detail ? ` - ${detail}` : ''}`);
}

async function request(path, { token, method = 'GET', body, form, expected } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, { method, headers, body: payload });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (expected && !expected.includes(res.status)) {
    throw new Error(`${method} ${path} expected ${expected.join('/')} got ${res.status}: ${text}`);
  }
  if (!expected && !res.ok) {
    throw new Error(`${method} ${path} failed ${res.status}: ${text}`);
  }
  return { status: res.status, data, text };
}

async function login(loginId, password = 'ChangeMe@123', expected = [200, 201]) {
  const res = await request('/auth/login', { method: 'POST', body: { loginId, password }, expected });
  return res.data;
}

async function logout(token) {
  await request('/auth/logout', { token, method: 'POST', expected: [200, 401] });
}

function callLogForm(fields = {}, file = {}) {
  const fd = new FormData();
  const data = { phone: '9999999999', status: 'CONNECTED', summary: 'E2E call summary', ...fields };
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null && value !== '') fd.append(key, String(value));
  }
  fd.append(
    'recording',
    new Blob([file.bytes || Buffer.from([1, 2, 3, 4])], { type: file.mime || 'audio/mpeg' }),
    file.name || `call-${Date.now()}.mp3`
  );
  return fd;
}

async function waitForBackend() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${API}/health`);
      if (res.ok) return;
    } catch {}
    await sleep(500);
  }
  throw new Error(`Backend did not become healthy at ${API}`);
}

async function startBackend() {
  backend = spawn('node', ['dist/src/main.js'], {
    cwd: new URL('../backend/', import.meta.url),
    env: {
      ...process.env,
      PORT: '5105',
      API_PUBLIC_URL: API,
      FRONTEND_URL: 'http://localhost:3001',
      MAX_UPLOAD_BYTES: '1048576',
      MAX_CALL_RECORDING_BYTES: '16'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  backend.stdout.on('data', (d) => process.stdout.write(`[backend] ${d}`));
  backend.stderr.on('data', (d) => process.stderr.write(`[backend] ${d}`));
  backend.on('exit', (code) => {
    if (code !== null && code !== 0) console.error(`Backend exited with code ${code}`);
  });
  await waitForBackend();
}

async function resetSessions() {
  await prisma.userSession.updateMany({
    where: { isActive: true },
    data: { isActive: false, endedAt: new Date(), endReason: 'FORCE_LOGOUT' }
  });
}

async function main() {
  await resetSessions();
  originalSettings = await prisma.setting.findMany();
  await startBackend();

  let owner = await login('owner');
  record('Owner login', owner.user.role === 'OWNER');
  const secondOwner = await login('owner', 'ChangeMe@123', [409]);
  record('One-active-session blocks duplicate login', secondOwner?.message?.includes('already active') || secondOwner?.statusCode === 409);
  await request(`/users/${owner.user.id}/force-logout`, { token: owner.accessToken, method: 'POST' });
  const ownerAfterForce = await login('owner');
  record('Owner/Manager force logout allows fresh login', !!ownerAfterForce.accessToken);
  owner = ownerAfterForce;

  const manager = await login('manager');
  const pa = await login('pa');
  const employeeSeed = await login('employee');
  record('Manager login', manager.user.role === 'MANAGER');
  record('PA login', pa.user.role === 'PA_ADMIN_ASSISTANT');
  record('Employee login', employeeSeed.user.role === 'EMPLOYEE');

  await request('/users', { token: owner.accessToken });
  await request('/users', { token: manager.accessToken });
  const paUsers = await request('/users', { token: pa.accessToken, expected: [403] });
  const employeeUsers = await request('/users', { token: employeeSeed.accessToken, expected: [403] });
  record('Role-wise user management API access', paUsers.status === 403 && employeeUsers.status === 403);

  const employeeA = await request('/users', {
    token: owner.accessToken,
    method: 'POST',
    body: { name: `E2E Employee A ${suffix}`, loginId: `e2e-emp-a-${suffix}`, password: 'TestPass@123', role: 'EMPLOYEE', email: `e2e-a-${suffix}@example.com` }
  });
  const employeeB = await request('/users', {
    token: owner.accessToken,
    method: 'POST',
    body: { name: `E2E Employee B ${suffix}`, loginId: `e2e-emp-b-${suffix}`, password: 'TestPass@123', role: 'EMPLOYEE', email: `e2e-b-${suffix}@example.com` }
  });
  record('Owner can create users', !!employeeA.data.id && !!employeeB.data.id);

  await request('/users/reset-password', { token: owner.accessToken, method: 'POST', body: { userId: employeeA.data.id, newPassword: 'NewPass@123' } });
  await request(`/users/${employeeA.data.id}/disable`, { token: owner.accessToken, method: 'POST' });
  await request(`/users/${employeeA.data.id}/enable`, { token: owner.accessToken, method: 'POST' });
  const paReset = await request('/users/reset-password', { token: pa.accessToken, method: 'POST', body: { userId: employeeA.data.id, newPassword: 'NopePass@123' }, expected: [403] });
  record('Owner reset/disable/enable and PA blocked', paReset.status === 403);

  const empA = await login(employeeA.data.loginId, 'NewPass@123');
  const empB = await login(employeeB.data.loginId, 'TestPass@123');

  const leadA = await request('/leads', {
    token: empA.accessToken,
    method: 'POST',
    body: { organization: `E2E Lead A ${suffix}`, contactName: 'Lead A', phone: `90000${suffix.slice(-5)}`, email: `lead-a-${suffix}@example.com`, source: 'E2E' }
  });
  const ownerLeads = await request('/leads', { token: owner.accessToken });
  record('Employee can create lead and Owner can see it', ownerLeads.data.some((l) => l.id === leadA.data.id));

  await request(`/leads/${leadA.data.id}`, { token: owner.accessToken, method: 'PATCH', body: { assignedToId: employeeB.data.id } });
  const reassignedLead = await request(`/leads/${leadA.data.id}`, { token: owner.accessToken });
  record('Owner/Manager can reassign lead', reassignedLead.data.assignedToId === employeeB.data.id);

  const leadB = await request('/leads', {
    token: empB.accessToken,
    method: 'POST',
    body: { organization: `E2E Lead B ${suffix}`, contactName: 'Lead B', phone: `91111${suffix.slice(-5)}`, email: `lead-b-${suffix}@example.com`, source: 'E2E' }
  });
  const empAList = await request('/leads', { token: empA.accessToken });
  record('Employee cannot see another employee lead', !empAList.data.some((l) => l.id === leadB.data.id));

  const empDeleteAttempt = await request(`/leads/${leadA.data.id}`, { token: empA.accessToken, method: 'DELETE', expected: [403] });
  await request(`/leads/${leadA.data.id}`, { token: owner.accessToken, method: 'DELETE' });
  const deletedOwnerView = await request('/leads', { token: owner.accessToken });
  const deletedEmpView = await request('/leads', { token: empB.accessToken });
  const deletedLeadForOwner = deletedOwnerView.data.find((l) => l.id === leadA.data.id);
  record('Owner/Manager can delete lead and deleted lead is hidden from employees', empDeleteAttempt.status === 403 && !!deletedLeadForOwner?.deletedAt && !deletedEmpView.data.some((l) => l.id === leadA.data.id));

  const dupEmployee = await request('/leads', {
    token: empA.accessToken,
    method: 'POST',
    body: { organization: `E2E Duplicate ${suffix}`, phone: leadB.data.phone, email: `dup-${suffix}@example.com` },
    expected: [400]
  });
  const dupOwner = await request('/leads', {
    token: owner.accessToken,
    method: 'POST',
    body: { organization: `E2E Owner Override ${suffix}`, phone: leadB.data.phone, email: `owner-dup-${suffix}@example.com`, allowDuplicateOverride: true }
  });
  record('Duplicate manual lead blocks employee and allows Owner override', dupEmployee.text.includes('Duplicate contact found') && !!dupOwner.data.duplicateReason);

  const ws = XLSX.utils.json_to_sheet([
    { organization: `E2E Import Valid ${suffix}`, phone: `92222${suffix.slice(-5)}`, email: `import-valid-${suffix}@example.com` },
    { organization: `E2E Import Duplicate ${suffix}`, phone: leadB.data.phone, email: `import-dup-${suffix}@example.com` },
    { organization: '', phone: `93333${suffix.slice(-5)}`, email: `invalid-${suffix}@example.com` }
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');
  const workbook = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const previewForm = new FormData();
  previewForm.append('file', new Blob([workbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `e2e-${suffix}.xlsx`);
  const preview = await request('/imports/preview', { token: empA.accessToken, method: 'POST', form: previewForm });
  const commit = await request('/imports/commit', { token: empA.accessToken, method: 'POST', body: { fileName: `e2e-${suffix}.xlsx`, rows: preview.data.rows, allowDuplicateOverride: false } });
  const importRecord = await prisma.excelImport.findUnique({ where: { id: commit.data.importId }, include: { rows: true } });
  record('Excel import skips duplicate/invalid and imports valid rows',
    commit.data.totalRows === 3 && commit.data.importedRows === 1 && commit.data.duplicateRows === 1 && commit.data.invalidRows === 1 && commit.data.skippedRows === 2);
  record('Excel import history stores duplicate reason',
    importRecord?.rows.some((r) => r.status === 'DUPLICATE' && r.error === 'Duplicate contact found'));

  const followup = await request('/followups', {
    token: owner.accessToken,
    method: 'POST',
    body: { leadId: leadB.data.id, assignedToId: employeeB.data.id, title: `E2E Followup ${suffix}`, dueAt: new Date().toISOString(), notes: 'E2E reminder' }
  });
  for (const status of ['COMPLETED', 'MISSED', 'CANCELLED', 'PENDING']) {
    await request(`/followups/${followup.data.id}/status`, { token: owner.accessToken, method: 'PATCH', body: { status } });
  }
  const rescheduled = await request(`/followups/${followup.data.id}/reschedule`, { token: owner.accessToken, method: 'PATCH', body: { dueAt: new Date(Date.now() + 86400000).toISOString() } });
  const paReminder = await request('/notifications', { token: pa.accessToken, method: 'POST', body: { userId: employeeB.data.id, title: `E2E Reminder ${suffix}`, body: 'Please follow up.' } });
  const paSettings = await request('/settings', { token: pa.accessToken, expected: [403] });
  record('Follow-up status/reschedule and PA reminder flow', rescheduled.data.status === 'PENDING' && !!paReminder.data.id && paSettings.status === 403);

  const clientA = await request('/clients', {
    token: empA.accessToken,
    method: 'POST',
    body: { organization: `E2E Client A ${suffix}`, contactName: 'Client A', phone: `94444${suffix.slice(-5)}`, email: `client-a-${suffix}@example.com` }
  });
  const clientB = await request('/clients', {
    token: empB.accessToken,
    method: 'POST',
    body: { organization: `E2E Client B ${suffix}`, contactName: 'Client B', phone: `95555${suffix.slice(-5)}`, email: `client-b-${suffix}@example.com` }
  });
  const dealB = await request('/deals', {
    token: owner.accessToken,
    method: 'POST',
    body: { title: `E2E Deal B ${suffix}`, clientId: clientB.data.id, assignedToId: employeeB.data.id, expectedValue: 75000 }
  });

  const call = await request('/calls/log', {
    token: empB.accessToken,
    method: 'POST',
    form: callLogForm({ leadId: leadB.data.id, phone: leadB.data.phone, durationSeconds: '120', budgetDiscussed: '50000', productInterest: 'Robotics lab' }, { name: `lead-call-${suffix}.mp3` })
  });
  const leadWithCall = await request(`/leads/${leadB.data.id}`, { token: owner.accessToken });
  const recordingId = leadWithCall.data.callLogs?.[0]?.recordingFile?.id;
  const downloadUrl = await request(`/files/${recordingId}/download-url`, { token: owner.accessToken });
  record('Create call log linked to lead', !!call.data.id && call.data.leadId === leadB.data.id && !!recordingId && downloadUrl.data.url.includes('/files/'));

  const clientCall = await request('/calls/log', {
    token: empB.accessToken,
    method: 'POST',
    form: callLogForm({ clientId: clientB.data.id, phone: `95555${suffix.slice(-5)}` }, { name: `client-call-${suffix}.mp3` })
  });
  const clientWithCall = await request(`/clients/${clientB.data.id}`, { token: owner.accessToken });
  record('Create call log linked to client', clientCall.data.clientId === clientB.data.id && clientWithCall.data.callLogs.some((c) => c.id === clientCall.data.id));

  const dealCall = await request('/calls/log', {
    token: empB.accessToken,
    method: 'POST',
    form: callLogForm({ dealId: dealB.data.id, phone: `95555${suffix.slice(-5)}` }, { name: `deal-call-${suffix}.mp3` })
  });
  const dealsAfterCall = await request('/deals', { token: owner.accessToken });
  record('Create call log linked to deal', dealCall.data.dealId === dealB.data.id && dealsAfterCall.data.some((d) => d.id === dealB.data.id && d.callLogs.some((c) => c.id === dealCall.data.id)));

  const noLinkCall = await request('/calls/log', {
    token: empB.accessToken,
    method: 'POST',
    form: callLogForm({}, { name: `no-link-${suffix}.mp3` }),
    expected: [400]
  });
  record('Create call log with no linked entity fails', noLinkCall.text.includes('at least one lead, client, or deal'));

  const forbiddenClientCall = await request('/calls/log', {
    token: empA.accessToken,
    method: 'POST',
    form: callLogForm({ clientId: clientB.data.id }, { name: `forbidden-client-${suffix}.mp3` }),
    expected: [403]
  });
  const forbiddenDealCall = await request('/calls/log', {
    token: empA.accessToken,
    method: 'POST',
    form: callLogForm({ dealId: dealB.data.id }, { name: `forbidden-deal-${suffix}.mp3` }),
    expected: [403]
  });
  record('Employee cannot link call log to another employee client/deal', forbiddenClientCall.status === 403 && forbiddenDealCall.status === 403);

  const ownerClientCall = await request('/calls/log', {
    token: owner.accessToken,
    method: 'POST',
    form: callLogForm({ clientId: clientA.data.id }, { name: `owner-client-${suffix}.mp3` })
  });
  const ownerDealCall = await request('/calls/log', {
    token: owner.accessToken,
    method: 'POST',
    form: callLogForm({ dealId: dealB.data.id }, { name: `owner-deal-${suffix}.mp3` })
  });
  record('Owner/Manager can link call log to any client/deal', ownerClientCall.data.clientId === clientA.data.id && ownerDealCall.data.dealId === dealB.data.id);

  const txtForm = callLogForm({ leadId: leadB.data.id }, { bytes: Buffer.from('bad'), mime: 'text/plain', name: `bad-${suffix}.txt` });
  const badCall = await request('/calls/log', { token: empB.accessToken, method: 'POST', form: txtForm, expected: [400] });
  const largeForm = callLogForm({ leadId: leadB.data.id }, { bytes: Buffer.alloc(32), mime: 'audio/mpeg', name: `large-${suffix}.mp3` });
  const largeCall = await request('/calls/log', { token: empB.accessToken, method: 'POST', form: largeForm, expected: [400] });
  record('Call recording type and size validation still blocks invalid files', badCall.text.toLowerCase().includes('unsupported') && largeCall.text.toLowerCase().includes('too large'));

  const waTemplate = await request('/whatsapp/templates', { token: owner.accessToken, method: 'POST', body: { name: `E2E WA ${suffix}`, message: 'Hello {{contact_person}} from RoboKing' } });
  const waUrl = await request('/whatsapp/open-url', { token: empB.accessToken, method: 'POST', body: { phone: '+91 98765 43210', message: 'Hello Test from RoboKing', leadId: leadB.data.id } });
  const waLoggedLead = await request(`/leads/${leadB.data.id}`, { token: owner.accessToken });
  record('WhatsApp template/link/log flow', !!waTemplate.data.id && waUrl.data.url === 'https://wa.me/919876543210?text=Hello%20Test%20from%20RoboKing' && waLoggedLead.data.whatsappLogs.length > 0);

  const emailForm = new FormData();
  emailForm.append('toEmail', `client-${suffix}@example.com`);
  emailForm.append('subject', `E2E Email ${suffix}`);
  emailForm.append('bodyHtml', '<p>Hello from E2E</p>');
  emailForm.append('attachments', new Blob([Buffer.from('proposal')], { type: 'text/plain' }), `proposal-${suffix}.txt`);
  const noEmailSend = await request('/email/send', {
    token: empB.accessToken,
    method: 'POST',
    form: emailForm,
    expected: [400]
  });
  const noCredentialSync = await request('/email/sync-inbox', { token: empB.accessToken, method: 'POST' });
  const emailConfigOk = /Employee email is not configured|SMTP\/IMAP account is not connected/.test(noEmailSend.text) && noCredentialSync.data.skipped === true;
  record('Email missing config and IMAP missing credentials are handled', emailConfigOk, emailConfigOk ? '' : `send=${noEmailSend.text}; sync=${JSON.stringify(noCredentialSync.data)}`);

  const bccSetting = await request('/settings', { token: owner.accessToken, method: 'POST', body: { key: 'ADMIN_BCC_EMAIL', value: `admin-${suffix}@roboking.in` } });
  await request('/users/connect-email-account', {
    token: owner.accessToken,
    method: 'POST',
    body: { userId: employeeB.data.id, emailAddress: `sender-${suffix}@roboking.in`, password: 'smtp-password', smtpHost: 'smtp.hostinger.com', smtpPort: 465, imapHost: 'imap.hostinger.com', imapPort: 993 }
  });
  const userAfterEmail = await prisma.user.findUnique({ where: { id: employeeB.data.id }, include: { emailAccount: true } });
  record('Owner/Manager can configure email account and BCC setting', bccSetting.data.value.includes('roboking.in') && !!userAfterEmail?.emailAccount);

  await request('/settings', { token: owner.accessToken, method: 'POST', body: { key: 'ALLOW_EMPLOYEE_DIRECT_CHAT', value: 'false' } });
  const directBlocked = await request('/chat/direct', { token: empA.accessToken, method: 'POST', body: { memberId: employeeB.data.id }, expected: [403] });
  await request('/settings', { token: owner.accessToken, method: 'POST', body: { key: 'ALLOW_EMPLOYEE_DIRECT_CHAT', value: 'true' } });
  const directAllowed = await request('/chat/direct', { token: empA.accessToken, method: 'POST', body: { memberId: employeeB.data.id } });
  const deal = await request('/deals', { token: owner.accessToken, method: 'POST', body: { title: `E2E Deal ${suffix}`, leadId: leadB.data.id, assignedToId: employeeB.data.id, expectedValue: 75000 } });
  const group = await request('/chat/groups', { token: owner.accessToken, method: 'POST', body: { title: `E2E Group ${suffix}`, memberIds: [employeeB.data.id], linkedLeadId: leadB.data.id, linkedDealId: deal.data.id } });
  const paConversations = await request('/chat/conversations', { token: pa.accessToken });
  const ownerConversations = await request('/chat/conversations', { token: owner.accessToken });
  const paGroupCreate = await request('/chat/groups', { token: pa.accessToken, method: 'POST', body: { title: 'Nope', memberIds: [employeeB.data.id] }, expected: [403] });
  record('Chat direct setting, group creation, and history access rules',
    directBlocked.status === 403 && !!directAllowed.data.id && !!group.data.id && paGroupCreate.status === 403 && !paConversations.data.some((c) => c.id === group.data.id) && ownerConversations.data.some((c) => c.id === group.data.id));
  record('Chat can link to lead/deal through API', group.data.linkedLeadId === leadB.data.id && group.data.linkedDealId === deal.data.id);

  const availableReports = await request('/reports/available', { token: owner.accessToken });
  const overviewReports = await request('/reports/overview', { token: owner.accessToken });
  const expectedReports = ['Team performance', 'Lead source', 'Follow-up pending', 'Conversion', 'Revenue pipeline', 'Employee activity', 'Excel import', 'Lost lead'];
  record('Reports available list and overview load', expectedReports.every((r) => availableReports.data.includes(r)) && typeof overviewReports.data.leads === 'number');

  const employeeSettings = await request('/settings', { token: empB.accessToken, expected: [403] });
  const managerChatSetting = await request('/settings', { token: manager.accessToken, method: 'POST', body: { key: 'ALLOW_EMPLOYEE_DIRECT_CHAT', value: 'false' } });
  record('Settings Owner/Manager allowed and PA/Employee blocked', employeeSettings.status === 403 && managerChatSetting.data.value === 'false');

  await Promise.allSettled([logout(owner.accessToken), logout(manager.accessToken), logout(pa.accessToken), logout(employeeSeed.accessToken), logout(empA.accessToken), logout(empB.accessToken)]);
}

try {
  await main();
} catch (error) {
  record('Workflow runner crashed', false, error.stack || error.message);
} finally {
  if (backend) backend.kill();
  if (originalSettings.length) {
    for (const setting of originalSettings) {
      await prisma.setting.upsert({ where: { key: setting.key }, update: { value: setting.value }, create: { key: setting.key, value: setting.value } });
    }
  }
  await prisma.$disconnect();
  const failed = results.filter((r) => !r.ok);
  console.log('\n=== E2E SUMMARY ===');
  console.log(`Passed: ${results.length - failed.length}`);
  console.log(`Failed: ${failed.length}`);
  for (const failure of failed) console.log(`FAIL: ${failure.name} ${failure.detail || ''}`);
  if (failed.length) process.exitCode = 1;
}
