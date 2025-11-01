@echo off
REM ONE BATCH FILE TO RULE THEM ALL
setlocal

echo.
echo ==========================================
echo    AI CODE REVIEW - SIMPLE STARTER
echo ==========================================
echo.

REM Add Ollama to PATH
set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Ollama"

REM Check if Ollama is running
tasklist /FI "IMAGENAME eq ollama.exe" 2>NUL | find /I "ollama.exe" >NUL
if %ERRORLEVEL% EQU 0 (
    echo [OK] Ollama already running
) else (
    echo [STARTING] Ollama...
    start /B "" "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" serve >NUL 2>&1
    timeout /t 3 /nobreak >NUL
    echo [OK] Ollama started
)

REM Check model exists
ollama list 2>NUL | find /I "qwen2.5-coder" >NUL
if %ERRORLEVEL% NEQ 0 (
    echo [DOWNLOADING] Model (first time only, 4.7 GB^)...
    ollama pull qwen2.5-coder:7b
)

REM Compile if needed
if not exist "out\extension.js" (
    echo [COMPILING] TypeScript...
    call npm run compile >NUL 2>&1
)

echo.
REM Launch VS Code Extension Development Host directly (no F5 needed)
echo [LAUNCH] Opening VS Code Extension Development Host...

set "PROJ=%CD%"
set "CODE_EXE=%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe"

if exist "%CODE_EXE%" (
    start "" "%CODE_EXE%" --new-window --extensionDevelopmentPath "%PROJ%" "%PROJ%" "%PROJ%\demo\buggy_python.py"
) else (
    echo [INFO] VS Code not found at default path. Trying 'code' CLI...
    start "" code --new-window --extensionDevelopmentPath "%PROJ%" "%PROJ%" "%PROJ%\demo\buggy_python.py"
)

echo.
echo [READY] Dev Host opened. The extension will auto-review the opened file.
echo [NOTE] Leave this window open to keep Ollama running. Close to stop.
echo.
pause
