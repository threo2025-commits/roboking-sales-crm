@echo off
setlocal
cd /d %~dp0\..
echo Starting RoboKing Sales CRM backend and frontend in separate windows...
echo.
echo Keep both command windows open while using the CRM.
echo.
start "RoboKing CRM Backend" cmd /k "cd /d %cd%\backend && node dist\src\main.js"
start "RoboKing CRM Frontend" cmd /k "cd /d %cd%\frontend && npm.cmd run start"
echo.
echo Backend:  http://localhost:5000/api/health
echo Frontend: http://localhost:3001/login
echo.
echo Waiting a few seconds, then opening the CRM login page...
timeout /t 8 /nobreak >nul
start "" "http://localhost:3001/login"
pause
