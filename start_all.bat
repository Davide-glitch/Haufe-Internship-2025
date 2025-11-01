@echo off
REM Master runner: Ollama + Backend + Web + VS Code Dev Host
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo ===========================================
echo   AI CODE REVIEW - START EVERYTHING
echo ===========================================
echo.

REM Add Ollama to PATH
set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Ollama"

REM 1) Ensure Ollama is running
echo [1/6] Checking Ollama...
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I "ollama.exe" >NUL
if %ERRORLEVEL% EQU 0 (
  echo     [OK] Ollama already running
) else (
  echo     [START] Launching Ollama service window...
  start "Ollama" cmd /k ""%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve"
  timeout /t 2 /nobreak >NUL
)

REM 2) Ensure model exists
echo [2/6] Checking model qwen2.5-coder:7b...
ollama list 2>NUL | find /I "qwen2.5-coder:7b" >NUL
if %ERRORLEVEL% NEQ 0 (
  echo(     [PULL] Downloading model ^(~4.7 GB^)...
  ollama pull qwen2.5-coder:7b
  if %ERRORLEVEL% NEQ 0 (
    echo(     [ERR] Failed to pull model. Exiting.
    exit /b 1
  )
) else (
  echo(     [OK] Model present
)

REM 3) Start Backend API (http://localhost:7070)
echo [3/6] Starting Backend API...
if not exist "backend\node_modules" (
  pushd backend
  call npm install --no-fund --loglevel=error
  popd
)
REM Use resilient runner window that stays open and auto-restarts on crash
start "AI Review API" cmd /k ""%ROOT%scripts\run_backend.bat""

REM 4) Start Web UI (http://localhost:5173 by default)
echo [4/6] Starting Web UI...
if not exist "web\node_modules" (
  pushd web
  call npm install --no-fund --loglevel=error
  popd
)
REM Use resilient runner window that stays open and auto-restarts on crash
start "AI Review Web" cmd /k ""%ROOT%scripts\run_web.bat""

REM 5) Compile Extension if needed
if not exist "out\extension.js" (
  echo [5/6] Compiling VS Code Extension...
  call npm run compile || (
    echo     [ERR] Compile failed. Exiting.
    exit /b 1
  )
) else (
  echo [5/6] Extension already compiled
)

REM 6) Skip opening VS Code Extension Development Host (by request)
echo [6/6] Skipping VS Code Dev Host

REM Open browser to Web UI (best-effort)
start "Browser" "http://localhost:5173"

echo.
echo ===========================================
echo   ALL STARTED.
echo   - Ollama service
echo   - Backend: http://localhost:7070
echo   - Web UI:  http://localhost:5173 (or next free port)
echo   - VS Code Dev Host (auto-review enabled)

echo   Close the separate windows to stop each service.
echo ===========================================

echo.
pause
