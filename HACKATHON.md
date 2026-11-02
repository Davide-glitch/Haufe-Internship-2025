# AI Code Review Assistant — Technical Documentation & Project Overview

An intelligent, local-first code review assistant built for developers and teams. Combines multi-language static heuristics, rule-based analyzers, and deep semantic LLM analysis with zero-data-leakage local execution (via Ollama) and optional cloud fallbacks (OpenAI, DeepSeek, Gemini).

---

## 📋 Executive Summary

Modern engineering teams need high-signal code reviews without exposing proprietary code to third-party cloud services. This project delivers a complete review suite featuring:

- **100% Local & Private by Default**: Powered by Ollama (`qwen2.5-coder:7b`, `deepseek-coder`, `llama3`). No code leaves your machine.
- **Dual Developer Interfaces**:
  1. **Full-Featured Web Application**: Interactive review console, multi-file guideline importer, metrics dashboard, and repository comment threads.
  2. **VS Code Extension & Standalone CLI**: Native editor commands (`Ctrl+Shift+R`), automated editor review, and Git pre-commit hook enforcement (`ai-review --staged`).
- **Full & Incremental GitHub Repository Review**: Clone and analyze entire repositories or only changed files (`changedOnly`), using SHA-256 hash caching to minimize latency.
- **Multi-Dimensional Analysis Pipeline**: Static regex heuristics + language-specific patterns + custom workspace rules + AI line-by-line semantic examination.
- **Actionable Output**: Precise line numbers, current vs. fixed code diffs, severity classifications (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), effort estimates, and documentation suggestions.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          User Interfaces                               │
│  ┌───────────────────────┐  ┌────────────────────────────────────────┐ │
│  │   Web UI (Vite+React) │  │ VS Code Extension & CLI (ai-review)    │ │
│  │  http://localhost:5173│  │ Native Webview, Commands & Hooks       │ │
│  └───────────┬───────────┘  └───────────────────┬────────────────────┘ │
└──────────────┼──────────────────────────────────┼──────────────────────┘
               │                                  │
               ▼                                  ▼
┌──────────────────────────────────┐ ┌──────────────────────────────────┐
│  Backend API Server (Express TS) │ │   Extension Review Engine        │
│  Port 7070                       │ │   (ReviewManager & Analyzers)    │
│  • /health, /models              │ │   • Static Heuristics            │
│  • /api/review (single file)     │ │   • Language Analyzers           │
│  • /api/reviewRepo (Git clone)   │ │   • code-review.config.json      │
│  • /api/comments (thread store)  │ │   • Git Diff Analyzer            │
└──────────────┬───────────────────┘ └────────────────────┬─────────────┘
               │                                          │
               ▼                                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   LLM Routing & Inference Layer                        │
│                                                                        │
│  1. Local Ollama (Priority 1)   ──> http://127.0.0.1:11434 (Private)   │
│  2. DeepSeek API (Fallback)     ──> https://api.deepseek.com           │
│  3. OpenAI API (Fallback)       ──> https://api.openai.com/v1          │
│  4. Google Gemini (Fallback)    ──> generativelanguage.googleapis.com  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Core Analysis Pipeline

Every review passes through four synchronized inspection layers:

```
Source Code / Git Diff
         │
         ▼
[ Layer 1: Heuristic Engine ] ────► Fast regex detection (secrets, eval, logs, line length)
         │
         ▼
[ Layer 2: Language Analyzers ] ──► Specialized rules (Python PEP8/SQLi, JS/TS ESLint, Java)
         │
         ▼
[ Layer 3: Custom Rules ] ────────► Team policies from code-review.config.json
         │
         ▼
[ Layer 4: Semantic LLM ] ────────► Line-by-line AI deep analysis with exact fix diffs
         │
         ▼
Consolidated Findings & Metrics (Severity, Lines, Patches, Effort, Docs)
```

1. **Heuristics Engine**: Instant regex-based detection of dangerous functions (e.g., `eval()`, hardcoded secrets, SQL concatenation, stray `console.log`).
2. **Language-Specific Analyzers**:
   - **Python**: Insecure `eval()`, SQL string interpolation, bare `except:`, hardcoded credentials, PEP 8 standards.
   - **JavaScript / TypeScript**: `var` declarations, loose equality (`==`), unhandled promises, `any` abuse, debugging statements.
   - **Java / C / C++ / Go / Rust**: Auto-detected via file extension and shebang scripts.
3. **Custom Workspace Guidelines**: Loadable via `code-review.config.json` in the workspace root or uploaded directly via the Web UI.
4. **Semantic AI Analysis**: Generates exact before/after code blocks, effort sizing (`S`, `M`, `L`), documentation updates, and architectural suggestions.

---

## ⚡ Technical Features & Implementation

### 1. Incremental Repository Review
- **Repository Caching**: Tracks every reviewed file's SHA-256 hash in `backend/data/repoIndex.json`.
- **Change Detection**: When `changedOnly` is enabled, compares current file hashes against the cache and only analyzes modified or new files.
- **Change Summary**: Generates a breakdown of added, modified, and deleted files.

### 2. Guideline Awareness & Multi-File Merging
- Automatically detects `.aicodereview.json`, `.editorconfig`, `.eslintrc`, `.flake8`, or `pyproject.toml` inside cloned repositories.
- The Web UI allows uploading multiple guideline documents simultaneously, automatically formatting and appending them to the review context.

### 3. Git Pre-Commit Hook & CLI Tool
- Standalone CLI command `ai-review --staged` runs headless in any terminal.
- Automated hook installation (`aiCodeReview.installPreCommitHook`) blocks commits containing `CRITICAL` severity issues before code enters git history.

### 4. Metrics & Performance Tracking
- Tracks execution duration (`ms`), batch counts, total input/output characters, and estimated token counts.
- For cloud models (OpenAI, DeepSeek, Gemini), tracks real token usage and dollar expenditure.

---

## 🛠️ Verification & Testing

The repository includes end-to-end verification scripts and demo targets:

```bash
# 1. Quick sanity check (health + code review endpoint)
python quick_test.py

# 2. Comprehensive enhancements test (language detection, prompt strictness, incremental tracking)
python test_enhancements.py
```

### Demo Test Files
- `demo/buggy_python.py`: SQL injection vulnerabilities, hardcoded passwords, unsafe `eval()`, missing exception types.
- `demo/buggy_javascript.js`: `var` declarations, loose equality, active debugging logs, unsafe execution.
- `demo/buggy_typescript.ts`: Type safety bypasses, missing return types, non-null assertions.

---

## 📦 Environment & Port Summary

| Component | Default Port / Location | Description |
| :--- | :--- | :--- |
| **Backend API** | `http://localhost:7070` | Node.js / Express TypeScript server |
| **Web UI** | `http://localhost:5173` | React + Vite frontend |
| **Ollama Service** | `http://localhost:11434` | Local LLM inference engine |
| **Cache Database** | `backend/data/repoIndex.json` | Repository state and hash index |
| **Comments Storage**| `backend/data/comments.json` | Repository review threads |

