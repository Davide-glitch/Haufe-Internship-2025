@echo off
setlocal
cd /d "%~dp0..\backend"

echo [API] Working dir: %CD%
if not exist node_modules (
  echo [API] Installing dependencies...
  call npm install --no-fund --loglevel=error
)

:loop
  echo [API] Starting dev server (CTRL+C to stop, closing window will stop)...
  npm run dev
  set EC=%ERRORLEVEL%
  echo [API] Server exited with code %EC%. Restarting in 2 seconds... (Close this window to stop)
  timeout /t 2 /nobreak >NUL
  goto loop
