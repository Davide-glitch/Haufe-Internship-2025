# 🎯 QUICK START - AI CODE REVIEW

## Press F5 NOW! 🚀

1. **Press F5** in VS Code
2. New window opens (Extension Development Host)
3. Open `demo/buggy_python.py`
4. **Press Ctrl+Shift+R**
5. Watch the magic! ✨

## Commands Available

| Command                                 | Shortcut     | What it does                |
| --------------------------------------- | ------------ | --------------------------- |
| AI Code Review: Review Current File     | Ctrl+Shift+R | Analyzes open file          |
| AI Code Review: Review Git Changes      | -            | Reviews only staged changes |
| AI Code Review: Apply Fix               | -            | Applies AI-suggested fix    |
| AI Code Review: Install Pre-commit Hook | -            | Blocks bad commits          |

## Status Bar

Look for: **$(check) AI Review** in bottom bar

- Click it to review current file
- Shows review in progress
- Updates with results

## What You'll See

```
╔══════════════════════════════════╗
║    AI CODE REVIEW RESULTS        ║
╠══════════════════════════════════╣
║ Total Issues: 8                  ║
║ 🔴 Critical: 3                   ║
║ 🟡 Warning: 5                    ║
║ ⚡ Time: 3.2s                    ║
║ 💰 Cost: $0.00 FREE              ║
║ 🤖 Provider: ollama              ║
╚══════════════════════════════════╝
```

## Test Files

- `demo/buggy_python.py` - 8+ issues
- `demo/buggy_javascript.js` - 5+ issues
- `demo/buggy_typescript.ts` - 6+ issues

## Scoring Checklist

- [x] Uses Local LLM (5000 pts) ← **BIGGEST POINTS**
- [x] Functioning Implementation (1000 pts)
- [x] Beautiful UI (2000 pts)
- [x] Incremental Review (1000 pts)
- [x] Auto-fix (1000 pts)
- [x] Pre-commit Hooks (800 pts)
- [x] Cost Tracking (800 pts)
- [x] Performance (600 pts)

**Total: 13,300+ points** 🏆

## If Extension Won't Load

```powershell
# Recompile
npm run compile

# Then press F5 again
```

## If Ollama Won't Connect

```powershell
# Make sure PATH is set
$env:PATH += ";$env:LOCALAPPDATA\Programs\Ollama"

# Test connection
ollama list
```

## Demo for Judges (2 minutes)

**0:00-0:15** - Opening

> "AI code review assistant using Ollama locally. Zero API costs, 100% privacy."

**0:15-1:30** - Live Demo

- Open buggy_python.py
- Press Ctrl+Shift+R
- Point out: 8 issues, local LLM, $0.00 cost
- Click "Apply Fix" on hardcoded password

**1:30-1:50** - Features

- Show Git incremental review
- Show pre-commit hook
- Show cost tracking

**1:50-2:00** - Closing

> "Every criterion met. 13,300+ points. Production-ready today."

---

**GO WIN THIS! 🚀**
