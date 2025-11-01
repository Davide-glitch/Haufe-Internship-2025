# 🤖 AI Code Review Assistant

**Intelligent code review powered by local and cloud LLMs** - Built for privacy, speed, and accuracy.

## ✨ Features

- 🏠 **Local-first LLM** - Runs on Ollama (100% private, zero cost)
- ☁️ **Cloud fallback** - DeepSeek, OpenAI, Gemini APIs
- 🎯 **Multi-dimensional analysis** - Heuristics + language-specific + AI
- 🔄 **Incremental review** - Analyze only changed code (Git diff)
- 🛠️ **Auto-fix** - One-click code corrections
- 🚫 **Pre-commit hooks** - Block bad commits automatically
- 💰 **Cost tracking** - Monitor API usage and spending
- 🎨 **Beautiful UI** - Modern webview with metrics dashboard

## 🚀 Quick Start

### 1. Install Ollama (Recommended)

```bash
# Download from https://ollama.ai
# Pull a code model:
ollama pull deepseek-coder:6.7b
```

### 2. Build & Run

```bash
npm install
npm run compile
# Press F5 in VS Code to launch
```

### 3. Review Code

- Press `Ctrl+Shift+R` (Cmd+Shift+R on Mac)
- Or right-click → "AI Code Review: Review Current File"

## 🎯 Commands

| Command                     | Shortcut       | Description                        |
| --------------------------- | -------------- | ---------------------------------- |
| **Review Current File**     | `Ctrl+Shift+R` | Analyze open file                  |
| **Review Git Changes**      | -              | Analyze staged changes only        |
| **Install Pre-commit Hook** | -              | Block commits with critical issues |

## 🔧 Configuration

### Environment Variables

The extension supports multiple LLM providers:

```bash
# Optional: Cloud API keys for fallback
DEEPSEEK_API_KEY="sk-..."
OPENAI_API_KEY="sk-..."
GEMINI_API_KEY="..."
```

### Custom Rules

Create `code-review.config.json` in workspace root:

```json
{
  "patterns": [
    {
      "name": "No console.log",
      "regex": "console\\.log",
      "severity": "warning",
      "message": "Remove debug logging",
      "guideline": "Team policy",
      "tags": ["style"]
    }
  ]
}
```

## 📊 Supported Languages

- **Python** - Security, PEP8, SQL injection, eval
- **JavaScript** - ESLint rules, console.log, var
- **TypeScript** - Type safety, any usage
- **More coming soon!**

## 🎨 Demo

Try the demo files:

```bash
# Open demo/buggy_python.py
# Issues detected: hardcoded passwords, SQL injection, eval, etc.

# Open demo/buggy_javascript.js
# Issues detected: var usage, console.log, eval, ==
```

## 🏗️ Architecture

```
Extension → ReviewManager → LLM Router
                              ├─ Ollama (local)
                              ├─ DeepSeek API
                              ├─ OpenAI GPT-4
                              └─ Google Gemini

Analysis Pipeline:
1. Language-specific patterns
2. Security heuristics
3. Custom rules
4. AI semantic analysis
```

## 📈 Performance

| Metric               | Value       |
| -------------------- | ----------- |
| Heuristic analysis   | < 100ms     |
| LLM analysis (local) | 2-5s        |
| LLM analysis (cloud) | 1-3s        |
| Cost per review      | $0.00-$0.01 |

## 🛠️ Development

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
