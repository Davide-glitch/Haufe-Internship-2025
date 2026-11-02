@echo off
REM Stop and clean up local services started by start_all.bat
setlocal EnableExtensions EnableDelayedExpansion

echo.
echo ===========================================
echo   AI CODE REVIEW - STOP ALL SERVICES
echo ===========================================
echo.

REM Helper: kill a console window by its title
:kill_title
set "_KTITLE=%~1"
if "%_KTITLE%"=="" goto :eof
echo [*] Closing window: %_KTITLE%
taskkill /FI "WINDOWTITLE eq %_KTITLE%" /T /F >NUL 2>&1
timeout /t 1 /nobreak >NUL
goto :eof

REM Helper: kill process(es) listening on a port
:kill_port
set "_KPORT=%~1"
if "%_KPORT%"=="" goto :eof
echo [*] Checking and freeing port %_KPORT%...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":%_KPORT%[ ].*LISTENING"') do (
  echo     - Stopping PID %%P
  taskkill /PID %%P /T /F >NUL 2>&1
)
timeout /t 1 /nobreak >NUL
goto :eof

REM 1) Close Web UI window and free Vite port (5173)
call :kill_title "AI Review Web"
call :kill_port 5173

REM 2) Close Backend API window and free API port (7070)
call :kill_title "AI Review API"
call :kill_port 7070

REM 3) Free Ollama port (11434) if launched via cmd
call :kill_title "Ollama"

echo.
echo ===========================================
echo   ALL SERVICES STOPPED.
echo ===========================================
echo.
pause

