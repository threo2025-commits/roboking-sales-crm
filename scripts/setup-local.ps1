# RoboKing Sales CRM local setup helper for Windows PowerShell
# Run from project root after extracting ZIP.

Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location backend
npm install
Copy-Item .env.example .env -ErrorAction SilentlyContinue
Write-Host "Edit backend/.env and set DATABASE_URL before migration." -ForegroundColor Yellow

Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location ../frontend
npm install
Copy-Item .env.example .env.local -ErrorAction SilentlyContinue

Write-Host "Done. Next commands:" -ForegroundColor Green
Write-Host "cd backend; npx prisma generate; npx prisma migrate dev --name init; npm run seed; npm run start:dev"
Write-Host "Open another terminal: cd frontend; npm run dev"
