@echo off
setlocal
cd /d %~dp0\..
echo Installing root workspace dependencies...
call npm install
if errorlevel 1 goto fail
echo Generating Prisma client...
cd backend
call npx prisma generate
if errorlevel 1 goto fail
echo Applying database migration...
call npx prisma migrate dev --name init
if errorlevel 1 goto fail
echo Seeding default CRM users...
call npm run seed
if errorlevel 1 goto fail
echo.
echo Setup complete. Start the CRM using scripts\start-local-windows.bat
goto end
:fail
echo.
echo Setup failed. Check PostgreSQL DATABASE_URL in backend\.env and internet/package install errors.
:end
pause
