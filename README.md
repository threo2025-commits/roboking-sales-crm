# RoboKing Sales Platform CRM

Private CRM for RoboKing sales operations at `mint.roboking.in`.

## Roles
- Owner
- Manager
- PA/Admin Assistant
- Employee

## Default seed login IDs
- Owner: `owner` / `ChangeMe@123`
- Manager: `manager` / `ChangeMe@123`
- PA: `pa` / `ChangeMe@123`
- Employee: `employee` / `ChangeMe@123`

## Main features in this reviewed build
- Custom ID/password login created by Owner/Manager
- One active session per login ID
- Password reset request to Owner/Manager
- Manual lead creation
- Duplicate phone/email blocking with Owner/Manager override
- Excel import preview + commit + import history
- Client management
- Deal board
- Daily follow-up dashboard
- Task coordination
- Call log with mandatory recording upload
- WhatsApp prefilled link using employee's own WhatsApp
- Hostinger SMTP email sending from employee sub-email
- Hostinger IMAP inbox sync scaffold
- Auto-BCC admin/founder email setting
- Email and WhatsApp company templates with Owner/Manager template UI
- Internal chat/groups with membership enforcement
- Reports, settings, notifications, audit logs
- AWS S3-ready file storage with local fallback for development and signed/local download URLs


## Latest deep-review fixes
- Dashboard now uses live API data instead of only static sample numbers.
- Added lead detail page with activity timeline, call recordings, email timeline and convert-to-client action.
- Added Owner/Manager template-management page for email and WhatsApp templates.
- Added Team page SMTP/IMAP credential setup UI for Hostinger employee email accounts.
- Improved duplicate detection across both leads and existing client contacts.
- Improved IMAP inbox sync so inbound replies can be linked to assigned/created leads by sender email.
- Added chat membership enforcement when sending messages.
- Added file access checks before returning local/S3 download URLs.
- Communications page now loads leads/templates and includes tel: click-to-call, WhatsApp prefill logging, email attachments and mandatory call recording upload.

## Local setup

### Backend
```powershell
cd backend
copy .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run start:dev
```

### Frontend
```powershell
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Frontend: `http://localhost:3001`
Backend: `http://localhost:5000/api`

## Database
Create PostgreSQL database:
```sql
CREATE DATABASE roboking_crm;
```
Then update `backend/.env` DATABASE_URL.

## File storage
For local testing, leave `AWS_S3_BUCKET` empty. Files are stored in `backend/uploads-temp`.
For production, set:
- AWS_REGION
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_S3_BUCKET

## Email
Owner/Manager enters each employee's Hostinger SMTP/IMAP credentials in CRM. Hostinger defaults:
- SMTP: smtp.hostinger.com:465
- IMAP: imap.hostinger.com:993

## Production target
- CRM frontend: `https://mint.roboking.in` on Vercel
- Backend API: `https://api-mint.roboking.in/api` on AWS
- PostgreSQL on AWS RDS or managed PostgreSQL
- S3 for recordings, email attachments and imported files

## Continued Review Pass

The latest ZIP includes additional fixes from the continued review:

- `/api/auth/me` session verification
- Profile/change-password page
- Role-scoped reports
- Import-source tracking
- Owner/Manager import-data deletion
- Dashboard calculated revenue/conversion metrics
- Windows local setup helper scripts

See `docs/continued-review-report.md` and `docs/local-setup-windows.md`.

## Latest Continue Build Additions

- PA/Manager/Owner can send reminders from `/notifications`.
- Follow-ups can be marked completed/missed/cancelled and rescheduled.
- Owner/Manager can disable/enable users from Team Management.
- Helper setup scripts added in `/scripts`.
- Manual smoke-test checklist added in `/scripts/smoke-test.md`.
