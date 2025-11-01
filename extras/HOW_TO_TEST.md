# 🚀 HOW TO TEST YOUR EXTENSION

## Simple Steps:

### 1. Double-click `start.bat`

- It starts Ollama if not running
- Downloads model if missing (first time only)
- Compiles TypeScript if needed
- Keeps terminal open (leave it open!)

### 2. In VS Code, press **F5**

- New window opens (Extension Development Host)

### 3. In the new window:

- Open any file (try `demo/buggy_python.py`)
- Press **Ctrl+Shift+R**
- OR right-click → "AI Code Review: Review Current File"

### 4. See the magic! ✨

- Beautiful webview opens
- Shows all issues found
- Provider: ollama
- Cost: $0.00

---

## That's It!

**One batch file. One command. No bullshit.**

---

## If Something Breaks:

1. Close the terminal from start.bat
2. Kill Ollama: `taskkill /F /IM ollama.exe`
3. Run start.bat again

---

## Ollama Status:

- ✅ Installed at: `%LOCALAPPDATA%\Programs\Ollama`
- ✅ Model: qwen2.5-coder:7b (4.7 GB)
- ✅ Running on: http://localhost:11434

---

## The Demo File (buggy_python.py):

**Don't run it directly!** It's intentionally buggy for testing the code reviewer.

- SQL injection vulnerability ✓
- Hardcoded passwords ✓
- Bare except clauses ✓
- eval() usage ✓

Press Ctrl+Shift+R to **review** it, not run it!
