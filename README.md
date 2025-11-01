# Haufe Internship 2025 – AI Code Review (Local)

Simple, local, and private code‑review tool powered by Ollama. One‑click start on Windows, clean web UI.

## Requirements coverage

- ✅ One‑click start on Windows (`start_all.bat`)
- ✅ Fully local LLM via Ollama (no cloud by default)
- ✅ Review any GitHub repo (full or incremental “Changed only” with Files Changed summary)
- ✅ Language detection per file
- ✅ Code‑focused review with:
  - exact line numbers and corrected code snippets
  - severity (CRITICAL/HIGH/MEDIUM/LOW), effort (S/M/L), and docs notes
- ✅ Guidelines support (paste/upload) + auto‑detect common config files
- ✅ Metrics (duration, batches, input/output chars, estimated tokens)
- ✅ Basic comments per repo (file/lines); quick “Comment” from findings
- ✅ JSON cache for repo state (speeds incremental reviews)
- ✅ Validation scripts (`quick_test.py`, `test_enhancements.py`)
- ✅ Optional VS Code extension (Quick Prompt, review commands)

Missing / partial

- ❌ Exact token usage (Ollama doesn’t return token counts; estimates only)
- ❌ Threaded comments anchored to findings (backend supports findingId; UI prefill only)
- ❌ Merge multiple uploaded guideline files automatically
- ❌ Authentication/roles (local single‑user only)
- ❌ Dockerization
- ❌ Mobile‑optimized UI
- ❌ Cloud fallback enabled by default (you can opt‑in via env vars)

## How to run (Windows)

1) Install Ollama
- https://ollama.com  → install
- In a terminal: `ollama pull qwen2.5-coder:7b`

2) Start everything
- Double‑click `start_all.bat` (opens Ollama, Backend http://localhost:7070, Web http://localhost:5173)

3) Use it
- Left panel: paste code, upload/paste Guidelines, review; after repo review use “Findings (last review)” to prefill comments
- Right panel: enter repo (owner/repo or full URL), toggle Changed only, choose model, click “Review Repo”; see metrics and add comments

## Quick tests

- `quick_test.py` – health + code review endpoint
- `test_enhancements.py` – language detection, strict prompts, change tracking

# Haufe Internship 2025 – AI Code Review (Local, Private)# 🤖 AI Code Review Assistant

Turn any GitHub repo into a high‑signal code review using a fully local LLM (Ollama). One‑click start on Windows, with a modern web UI and optional VS Code commands.**Intelligent code review powered by local and cloud LLMs** - Built for privacy, speed, and accuracy.

- Local and private: runs entirely on your machine via Ollama## ✨ Features

- Zero cost: no cloud calls by default (OpenAI fallback optional)

- Repo review: full or incremental (changed files only), with language detection- 🏠 **Local-first LLM** - Runs on Ollama (100% private, zero cost)

- Code‑focused prompts: mandatory line numbers, exact corrected snippets, severity, effort, docs- ☁️ **Cloud fallback** - DeepSeek, OpenAI, Gemini APIs

- Guidelines: paste or upload rules (PEP8/ESLint/MD) and auto‑detect common config files- 🎯 **Multi-dimensional analysis** - Heuristics + language-specific + AI

- Metrics: duration, batches, character and estimated token counts- 🔄 **Incremental review** - Analyze only changed code (Git diff)

- Comments: simple per‑repo thread with file/line context- 🛠️ **Auto-fix** - One-click code corrections

- 🚫 **Pre-commit hooks** - Block bad commits automatically

- 💰 **Cost tracking** - Monitor API usage and spending

## Quick start (Windows)- 🎨 **Beautiful UI** - Modern webview with metrics dashboard

1. Install Ollama (if you don’t have it yet)## 🚀 Quick Start

- Download from https://ollama.com and install

- Open a terminal and run once: `ollama pull qwen2.5-coder:7b`### 1. Install Ollama (Recommended)

2. Start everything (Ollama + Backend + Web)```bash

- Double‑click `start_all.bat` from the repo root# Download from https://ollama.ai

- This opens three windows: Ollama service, Backend API (port 7070), Web UI (port 5173)# Pull a code model:

- A browser tab should open automatically at http://localhost:5173ollama pull deepseek-coder:6.7b

````

3) Use it

- Left panel:### 2. Build & Run

  - Paste code and click "Review" for single‑file checks

  - Upload or paste Project Guidelines```bash

  - After running a repo review (right panel), "Findings (last review)" appears with a Comment button to prefill the comment formnpm install

- Right panel:npm run compile

  - Enter repo (owner/repo or full Git URL), toggle Changed only, choose model, and click "Review Repo"# Press F5 in VS Code to launch

  - See metrics under the repo controls```

  - Add comments (file/lines can be prefilled from the left findings list)

### 3. Review Code



## What’s included- Press `Ctrl+Shift+R` (Cmd+Shift+R on Mac)

- Or right-click → "AI Code Review: Review Current File"

- backend/ – Node/Express TypeScript API for local LLM via Ollama

  - `/health`, `/models`, `/api/review`, `/api/reviewRepo`## 🎯 Commands

  - Comments API: `GET /api/comments?repo=...`, `POST /api/comments`

  - Caching DB (JSON) in `backend/data` (repoIndex.json, comments.json)| Command                     | Shortcut       | Description                        |

- web/ – React + Vite web UI (dark, modern)| --------------------------- | -------------- | ---------------------------------- |

  - Left: code input, guidelines (upload + textarea), findings navigator| **Review Current File**     | `Ctrl+Shift+R` | Analyze open file                  |

  - Right: AI output, repo review controls, metrics, comments thread| **Review Git Changes**      | -              | Analyze staged changes only        |

- scripts/ – Resilient runners for backend/web| **Install Pre-commit Hook** | -              | Block commits with critical issues |

- start_all.bat – One‑click launcher (Ollama + Backend + Web)

- quick_test.py – Sanity check for health and endpoints## 🔧 Configuration

- test_enhancements.py – Validates language detection, prompt strictness, and incremental change display

### Environment Variables



## Repo review featuresThe extension supports multiple LLM providers:



- Language annotations per file (e.g., File: path (Language: TypeScript))```bash

- Incremental mode (changedOnly): only new/modified files; change summary included# Optional: Cloud API keys for fallback

- Batching within size limits (configurable)DEEPSEEK_API_KEY="sk-..."

- Strict review output with:OPENAI_API_KEY="sk-..."

  - Severity (CRITICAL/HIGH/MEDIUM/LOW)GEMINI_API_KEY="..."

  - File:Line```

  - Current Code + Fixed Code (exact snippets)

  - Explanation + Effort + Docs### Custom Rules



Create `code-review.config.json` in workspace root:

## Models

```json

- Default: `qwen2.5-coder:7b` (recommended for speed/quality balance){

- Use the web UI model dropdown; ensure the model is pulled in Ollama  "patterns": [

- You can add more models (e.g., `llama3.1:8b`, `deepseek-coder-v2:16b`)    {

      "name": "No console.log",

      "regex": "console\\.log",

## Developer notes      "severity": "warning",

      "message": "Remove debug logging",

- Ports: Backend 7070, Web 5173 (Vite may pick a nearby port if 5173 used)      "guideline": "Team policy",

- Windows‑first: Batch scripts included. macOS/Linux can run backend and web via npm scripts.      "tags": ["style"]

- Optional OpenAI fallback: set `ALLOW_CLOUD=true` and `OPENAI_API_KEY` in backend env to enable.    }

  ]

}

## Folder structure```



```## 📊 Supported Languages

.

├─ backend/                # Express API (TypeScript)- **Python** - Security, PEP8, SQL injection, eval

│  ├─ src/server.ts- **JavaScript** - ESLint rules, console.log, var

│  ├─ data/                # JSON cache (repoIndex.json, comments.json)- **TypeScript** - Type safety, any usage

│  └─ package.json- **More coming soon!**

├─ web/                    # React + Vite UI

│  ├─ src/App.tsx## 🎨 Demo

│  └─ package.json

├─ scripts/                # Resilient runner scriptsTry the demo files:

├─ start_all.bat           # One‑click start (Windows)

├─ quick_test.py           # Quick health + endpoint test```bash

├─ test_enhancements.py    # Validation for features# Open demo/buggy_python.py

└─ README.md# Issues detected: hardcoded passwords, SQL injection, eval, etc.

````

# Open demo/buggy_javascript.js

# Issues detected: var usage, console.log, eval, ==

## Useful scripts```

- quick_test.py – verifies backend health and code review## 🏗️ Architecture

- test_enhancements.py – runs 3 tests (code prompts, language detection, change tracking)

- extras/QUICK_REFERENCE.md – tips and hints```

Extension → ReviewManager → LLM Router

                              ├─ Ollama (local)

## Mermaid overview ├─ DeepSeek API

                              ├─ OpenAI GPT-4

````mermaid └─ Google Gemini

flowchart LR

  A[Ollama (local models)] <-- REST --> B[Backend API (Express TS)]Analysis Pipeline:

  B <-- fetch --> C[Web UI (React + Vite)]1. Language-specific patterns

  B <- read/write -> D[(JSON Cache)]2. Security heuristics

  B <-- git clone --> E[GitHub Repo]3. Custom rules

```4. AI semantic analysis

````

## Troubleshooting## 📈 Performance

- Port 7070 in use: close prior backend windows or run `Stop-Process -Name node,tsx` in PowerShell, then re‑run start_all.bat| Metric | Value |

- No models found: open an Ollama terminal and run `ollama pull qwen2.5-coder:7b`| -------------------- | ----------- |

- Health shows offline: ensure Ollama service window is running (`ollama serve`)| Heuristic analysis | < 100ms |

| LLM analysis (local) | 2-5s |

| LLM analysis (cloud) | 1-3s |

## License| Cost per review | $0.00-$0.01 |

This project is for the Haufe Internship 2025 showcase. If you intend to use it beyond evaluation, please add a suitable open‑source license and review third‑party model terms.## 🛠️ Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode
npm run watch
```

## 📝 License

MIT License

## 🎓 Credits

Built with:

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Ollama](https://ollama.ai/)
- [DeepSeek Coder](https://github.com/deepseek-ai/DeepSeek-Coder)

---

📖 **See [HACKATHON.md](./HACKATHON.md) for complete documentation and scoring breakdown**

**Made with ❤️ for better code reviews**
