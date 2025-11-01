# 🧠 Installing More Local Models (Ollama)

Ollama supports many open-source models. Here are the best ones for code review and general coding tasks.

## ⚡ Quick Install

Open a terminal (PowerShell/cmd) and run:

```powershell
# Stronger code models
ollama pull qwen2.5-coder:14b
ollama pull deepseek-coder-v2:16b
ollama pull codellama:13b

# Faster general models
ollama pull llama3.1:8b-instruct
ollama pull mistral:7b-instruct
```

## 📊 Recommended Models by Size/Quality

### Best for Code Review (ordered by quality)

1. **qwen2.5-coder:14b** (~8 GB)

   - Best code reasoning
   - Fast on modern CPU/GPU
   - `ollama pull qwen2.5-coder:14b`

2. **deepseek-coder-v2:16b** (~9 GB)

   - Strong multi-language support
   - `ollama pull deepseek-coder-v2:16b`

3. **codellama:13b** (~7 GB)

   - Meta's official code model
   - `ollama pull codellama:13b`

4. **qwen2.5-coder:7b** (~4.7 GB) — default, already installed
   - Good balance speed/quality

### Best for General Chat/Questions

1. **llama3.1:8b-instruct** (~4.7 GB)

   - Great for explanations
   - `ollama pull llama3.1:8b-instruct`

2. **mistral:7b-instruct** (~4.1 GB)
   - Fast and helpful
   - `ollama pull mistral:7b-instruct`

## 🔥 Power User (if you have 32+ GB RAM or strong GPU)

```powershell
# Top-tier coding models (large)
ollama pull qwen2.5-coder:32b
ollama pull deepseek-coder-v2:236b  # Requires ~128 GB RAM!
ollama pull codellama:34b
```

## ✅ After Pulling

1. The model appears in your **Quick Prompt** dropdown automatically
2. Select it and click **Review**
3. Models stay on disk; no re-download needed

## 🗑️ Remove Unused Models

```powershell
ollama list            # See all installed models
ollama rm MODEL_NAME   # Delete one
```

Example:

```powershell
ollama rm qwen2.5-coder:7b
```

## 💡 Pro Tips

- **Bigger ≠ always better for speed**: 14b models often hit the sweet spot
- **Use specific models for tasks**:
  - Code review → qwen2.5-coder:14b or deepseek-coder-v2:16b
  - Quick questions → llama3.1:8b-instruct
- **Check your system**: `ollama ps` shows currently loaded model and memory usage

## 🌐 Browse All Models

Visit: https://ollama.com/library

Search by:

- "code" for coding models
- "instruct" for chat models
- Sort by downloads/popularity
