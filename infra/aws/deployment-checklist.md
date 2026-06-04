# RoboKing CRM Deployment Checklist

Production targets:

- Frontend: `https://mint.roboking.in` on Vercel
- Backend API: `https://api-mint.roboking.in/api` on AWS EC2 behind Nginx
- Database: AWS RDS PostgreSQL, or Docker PostgreSQL for the first internal rollout
- Redis: Docker/AWS when queue/session expansion is added
- Files: private AWS S3 bucket
- Email: Hostinger SMTP/IMAP per employee account

## DNS

Create these records in the RoboKing DNS zone:

- `mint.roboking.in` CNAME to the Vercel assigned hostname.
- `api-mint.roboking.in` A record to the EC2 public IPv4 address, or CNAME to an AWS load balancer if one is used later.

## Vercel Frontend

Set the Vercel project root to `frontend`.

Environment variables:

```env
NEXT_PUBLIC_API_URL=https://api-mint.roboking.in/api
NEXT_PUBLIC_APP_NAME=RoboKing Sales Platform
```

Build command:

```bash
npm install
npm run build
```

Deploy check:

- Open `https://mint.roboking.in/login`.
- Login should call `https://api-mint.roboking.in/api/auth/login`.
- There should be no browser requests to `localhost`.

## AWS EC2 Backend

Install Node.js 20 LTS, npm, git, Nginx, PM2, and Certbot on Ubuntu.

Copy `backend/.env.production.example` to `backend/.env` and fill real production values.

Required backend environment:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/roboking_crm?schema=public"
JWT_SECRET="64_plus_random_characters"
JWT_EXPIRES_IN=12h
FRONTEND_URL=https://mint.roboking.in
API_PUBLIC_URL=https://api-mint.roboking.in/api
ADMIN_BCC_EMAIL=admin@roboking.in
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=roboking-crm-production-files
MAX_UPLOAD_BYTES=52428800
MAX_CALL_RECORDING_BYTES=52428800
HOSTINGER_SMTP_HOST=smtp.hostinger.com
HOSTINGER_SMTP_PORT=465
HOSTINGER_IMAP_HOST=imap.hostinger.com
HOSTINGER_IMAP_PORT=993
```

Backend build and migration:

```bash
cd /home/ubuntu/roboking-sales-crm
npm ci
npm --workspace backend run build
cd backend
npx prisma generate
npx prisma migrate deploy
```

Seed only for first controlled bootstrap:

```bash
cd /home/ubuntu/roboking-sales-crm/backend
ALLOW_PRODUCTION_SEED=true npm run seed
```

After seeding, immediately login as Owner and change every default password. Do not run production seed repeatedly unless you intentionally want to create missing demo bootstrap data.

Start backend with PM2:

```bash
sudo mkdir -p /var/log/roboking-crm
sudo chown -R ubuntu:ubuntu /var/log/roboking-crm
pm2 start ../infra/pm2/ecosystem.config.js
pm2 save
pm2 startup
```

## Nginx And SSL

Copy the API Nginx config:

```bash
sudo cp /home/ubuntu/roboking-sales-crm/infra/nginx/api-mint.roboking.in.conf /etc/nginx/sites-available/api-mint.roboking.in.conf
sudo ln -s /etc/nginx/sites-available/api-mint.roboking.in.conf /etc/nginx/sites-enabled/api-mint.roboking.in.conf
sudo nginx -t
sudo systemctl reload nginx
```

Issue SSL certificate:

```bash
sudo certbot --nginx -d api-mint.roboking.in
```

Health check:

```bash
curl https://api-mint.roboking.in/api/health
```

## S3

Use a private bucket. Do not make uploaded CRM files public.

IAM permissions required for the backend identity:

- `s3:PutObject`
- `s3:GetObject`
- `s3:DeleteObject` only if delete support is later added
- Bucket/object resource limited to the production CRM bucket

Production file uploads require `AWS_S3_BUCKET`. If it is missing, the backend refuses uploads/downloads instead of using local disk.

## Hostinger Email

Owner/Manager must connect each employee email account inside Team Management.

Hostinger defaults:

- SMTP host: `smtp.hostinger.com`
- SMTP port: `465`
- IMAP host: `imap.hostinger.com`
- IMAP port: `993`

Missing SMTP/IMAP credentials fail with a user-facing CRM error and do not crash the backend. `ADMIN_BCC_EMAIL` can be controlled from Settings by Owner/Manager.

## Security Checks

- `JWT_SECRET` must be strong and unique in production.
- Default seed password `ChangeMe@123` must be changed before real use.
- CORS allows only `FRONTEND_URL` in production.
- One-active-session-per-login-ID is enforced through `UserSession`.
- File upload max size and call recording MIME/extension validation are enabled.
- Restricted settings are Owner/Manager only.

## Final Verification

Run locally before pushing:

```powershell
npm.cmd run build
npm.cmd run lint
cd backend
npx.cmd prisma validate
npx.cmd prisma migrate status
cd ..
node scripts\e2e-workflow-test.mjs
```

Run on EC2 after deploy:

```bash
curl https://api-mint.roboking.in/api/health
pm2 status
pm2 logs roboking-crm-backend --lines 100
```
