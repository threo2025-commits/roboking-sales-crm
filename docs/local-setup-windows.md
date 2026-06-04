# Local Windows Setup — RoboKing Sales CRM

## 1. Install software

Install:
- Node.js LTS
- PostgreSQL 16+
- VS Code
- Git

## 2. Create database

Create a PostgreSQL database named:

```text
roboking_crm
```

## 3. Environment files

Copy:

```text
backend/.env.example -> backend/.env
frontend/.env.example -> frontend/.env.local
```

Update `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/roboking_crm"
JWT_SECRET="change_this_to_a_long_random_secret"
ADMIN_BCC_EMAIL="your_admin_email@roboking.in"
```

AWS S3 and Hostinger email credentials can stay blank for first UI testing.

## 4. Run setup

Double-click or run:

```bat
scripts\setup-local-windows.bat
```

## 5. Start CRM

Run:

```bat
scripts\start-local-windows.bat
```

Frontend: `http://localhost:3000`
Backend: `http://localhost:5000/api/health`

## 6. Default logins

```text
Owner: owner / ChangeMe@123
Manager: manager / ChangeMe@123
PA: pa / ChangeMe@123
Employee: employee / ChangeMe@123
```

## 7. First things to test

1. Login as Owner.
2. Create a new Employee ID.
3. Force logout an active user.
4. Add a manual lead.
5. Upload Excel and preview duplicates.
6. Commit import.
7. Delete imported data as Owner/Manager.
8. Add call log with recording file.
9. Open WhatsApp prefilled message.
10. Connect Hostinger SMTP/IMAP and test email.
