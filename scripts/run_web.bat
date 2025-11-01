@echo off
setlocal
cd /d "%~dp0..\web"

echo [WEB] Working dir: %CD%
if not exist node_modules (
  echo [WEB] Installing dependencies...
  call npm install --no-fund --loglevel=error
)

:loop
  echo [WEB] Starting Vite dev server (CTRL+C to stop, closing window will stop)...
  npm run dev
  set EC=%ERRORLEVEL%
  echo [WEB] Server exited with code %EC%. Restarting in 2 seconds... (Close this window to stop)
  timeout /t 2 /nobreak >NUL
  goto loop
