@echo off
REM Stop and clean up local services started by start_all.bat
setlocal EnableExtensions EnableDelayedExpansion

echo.
echo ===========================================
echo   AI CODE REVIEW - STOP EVERYTHING
echo ===========================================
echo.

REM Helper: kill a console window by its title (set via `start "TITLE" ...`)
:kill_title
set "_KTITLE=%~1"
if "%_KTITLE%"=="" goto :eof
echo [*] Closing window: %_KTITLE%
taskkill /FI "WINDOWTITLE eq %_KTITLE%" /T /F >NUL 2>&1
REM Give it a moment
timeout /t 1 /nobreak >NUL
goto :eof

REM Helper: kill process(es) listening on a port
:kill_port
set "_KPORT=%~1"
if "%_KPORT%"=="" goto :eof
echo [*] Killing processes on port %_KPORT%
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%_KPORT%[ ].*LISTENING"') do (
  echo     - PID %%P
  taskkill /PID %%P /T /F >NUL 2>&1
)
timeout /t 1 /nobreak >NUL
goto :eof

REM 1) Close Web UI window and kill Vite port (5173)
call :kill_title "AI Review Web"
call :kill_port 5173

REM 2) Close Backend API window and kill API port (7070)
call :kill_title "AI Review API"
call :kill_port 7070

REM 3) Close Ollama window and kill Ollama port (11434)
call :kill_title "Ollama"
call :kill_port 11434

echo.
echo ===========================================
echo   ALL STOPPED (best-effort).
echo   - If any windows remain, you can close them manually.
echo ===========================================

echo.
pause
