@echo off
title VENKE Finance Dashboard Launcher
echo ===================================================
echo  VENKE Finance Dashboard - One-Click Launcher
echo ===================================================
echo.

:: Check if port 5000 is listening
netstat -ano | findstr :5000 | findstr LISTENING > nul
if %errorlevel% equ 0 (
    echo [INFO] Application server is already active on port 5000.
    echo [INFO] Launching dashboard in default browser...
    start http://localhost:5000
    exit
)

echo [INFO] Starting backend application server...
:: Run npm start inside server directory in minimized terminal window
start /min cmd /c "cd /d %~dp0server && npm start"

echo [INFO] Waiting for server to initialize...
:loop
curl -s http://localhost:5000/api/health > nul
if %errorlevel% neq 0 (
    timeout /t 1 /nobreak > nul
    goto loop
)

echo [INFO] Server started successfully!
echo [INFO] Launching VENKE Finance Dashboard...
start http://localhost:5000
exit
