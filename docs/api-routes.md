# API Routes

Base URL local: `http://localhost:5000/api`
Production URL target: `https://api-mint.roboking.in/api`

## Auth
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/request-password-reset`
- `POST /auth/change-password`

## Users / Team
- `GET /users`
- `POST /users`
- `GET /users/password-reset-requests`
- `POST /users/reset-password`
- `POST /users/:id/force-logout`
- `POST /users/connect-email-account`

## Leads
- `GET /leads`
- `GET /leads/:id`
- `POST /leads`
- `PATCH /leads/:id`
- `POST /leads/:id/convert-to-client`
- `GET /leads/duplicates`

## Clients
- `GET /clients`
- `GET /clients/:id`
- `POST /clients`

## Deals
- `GET /deals`
- `POST /deals`
- `POST /deals/stage`

## Follow-ups
- `GET /followups/daily`
- `GET /followups/pending`
- `POST /followups`

## Tasks
- `GET /tasks`
- `POST /tasks`
- `PATCH /tasks/:id/done`

## Imports
- `GET /imports/history`
- `POST /imports/preview`
- `POST /imports/commit`

## Calls / Recordings
- `POST /calls/log`
- `GET /files/:id/download-url`
- `GET /files/:id/local-download`

## WhatsApp
- `GET /whatsapp/templates`
- `POST /whatsapp/templates`
- `PATCH /whatsapp/templates/:id`
- `POST /whatsapp/open-url`

## Email
- `GET /email/templates`
- `POST /email/templates`
- `PATCH /email/templates/:id`
- `GET /email/messages`
- `POST /email/send`
- `POST /email/sync-inbox`

## Chat
- `GET /chat/conversations`
- `GET /chat/conversations/:id/messages`
- `POST /chat/groups`
- `POST /chat/direct`
- `POST /chat/messages`

## Reports
- `GET /reports/available`
- `GET /reports/overview`

## Settings / Audit / Notifications
- `GET /settings`
- `POST /settings`
- `GET /audit-logs`
- `GET /notifications`
- `PATCH /notifications/:id/read`

## Added / confirmed after deep review
- `GET /api/leads/:id` — Lead detail with timeline, calls, emails and WhatsApp logs.
- `POST /api/leads/:id/convert-to-client` — Convert/link lead to client and create converted deal.
- `GET /api/files/:id/download-url` — Permission-checked signed/local download URL.
- `GET /api/files/:id/local-download` — Local dev download stream, protected by auth cookie/token.
- `GET /api/email/templates` — List active company email templates.
- `POST /api/email/templates` — Owner/Manager create master email template.
- `PATCH /api/email/templates/:id` — Owner/Manager update master email template.
- `GET /api/whatsapp/templates` — List active WhatsApp templates.
- `POST /api/whatsapp/templates` — Owner/Manager create WhatsApp template.
- `PATCH /api/whatsapp/templates/:id` — Owner/Manager update WhatsApp template.
- `POST /api/users/connect-email-account` — Owner/Manager connects employee Hostinger SMTP/IMAP account.

## Continued Pass Routes

```text
GET    /api/auth/me
DELETE /api/imports/:id
```

`GET /api/auth/me` validates the current JWT/session and returns the active user.

`DELETE /api/imports/:id` is Owner/Manager only. It deletes the import record and leads created from that import while unlinking dependent activities, calls, emails, files, tasks, deals and follow-ups so database constraints do not break.
