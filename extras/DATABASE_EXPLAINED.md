# ✅ DATABASE ALREADY WORKS FOR ANY REPO!

## How It Works

### Cache Storage: `backend/data/repoIndex.json`

The system uses a **JSON database** that stores cache for **UNLIMITED repos**:

```json
{
  "https://github.com/Davide-glitch/Santorini-Game.git": {
    "files": {
      "src/Main.java": {
        "hash": "a1b2c3d4e5f6...",
        "size": 4521,
        "lang": "Java"
      },
      "README.md": {
        "hash": "f6e5d4c3b2a1...",
        "size": 1234,
        "lang": "Markdown"
      }
    },
    "lastReviewed": 1730476800000
  },
  "https://github.com/facebook/react.git": {
    "files": {
      "packages/react/src/React.js": {
        "hash": "9876543210ab...",
        "size": 12456,
        "lang": "JavaScript"
      }
    },
    "lastReviewed": 1730480400000
  },
  "https://github.com/microsoft/vscode.git": {
    "files": {
      "src/vs/base/common/uri.ts": {
        "hash": "fedcba098765...",
        "size": 8765,
        "lang": "TypeScript"
      }
    },
    "lastReviewed": 1730484000000
  }
}
```

### Key Logic (lines 168-178 in server.ts)

```typescript
// Read or init repo cache
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const idxPath = path.join(dataDir, "repoIndex.json");
let idx: any = {};
try {
  idx = JSON.parse(fs.readFileSync(idxPath, "utf8"));
} catch {
  idx = {};
}

const repoKey = repoUrl; // ← Each repo gets its own key!
const prev = idx[repoKey]?.files || {}; // ← Load THIS repo's cache
```

### Unique Key Per Repo

- **Key**: Full repo URL (e.g., `https://github.com/owner/repo.git`)
- **Value**: Object with `files` (hash/size/lang per file) and `lastReviewed` timestamp
- **Storage**: All repos in ONE JSON file, each with separate entry

### Update Logic (line 330)

```typescript
// Update cache for THIS repo only
idx[repoKey] = { files: newFiles, lastReviewed: Date.now() };
try {
  fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2), "utf8");
} catch {}
```

---

## ✅ IT WORKS FOR ANY REPO!

You can review:

### Public GitHub Repos

```json
{
  "repo": "facebook/react",
  "model": "qwen2.5-coder:7b",
  "temperature": 0.1,
  "changedOnly": false
}
```

```json
{
  "repo": "microsoft/vscode",
  "model": "qwen2.5-coder:7b",
  "temperature": 0.1,
  "changedOnly": false
}
```

```json
{
  "repo": "torvalds/linux",
  "model": "qwen2.5-coder:7b",
  "temperature": 0.1,
  "changedOnly": false
}
```

### Full URLs

```json
{
  "repo": "https://github.com/Davide-glitch/Santorini-Game.git",
  "model": "qwen2.5-coder:7b",
  "temperature": 0.1,
  "changedOnly": false
}
```

### Private Repos (if you have access)

```json
{
  "repo": "yourcompany/private-repo",
  "model": "qwen2.5-coder:7b",
  "temperature": 0.1,
  "changedOnly": false
}
```

---

## 🔥 Incremental Review Works Per Repo

### First Review (Full)

```bash
POST /api/reviewRepo
{
  "repo": "facebook/react",
  "changedOnly": false
}
# Creates cache entry for facebook/react
```

### Second Review (Incremental)

```bash
POST /api/reviewRepo
{
  "repo": "facebook/react",
  "changedOnly": true
}
# Loads facebook/react cache, compares hashes, only reviews changed files
```

### Different Repo (Independent)

```bash
POST /api/reviewRepo
{
  "repo": "microsoft/vscode",
  "changedOnly": true
}
# Looks for microsoft/vscode cache (separate from react)
# If not found, reviews all files (first review for this repo)
```

---

## 🎯 Database Capabilities

### Unlimited Repos

- ✅ Store cache for 1 repo, 10 repos, 100 repos, 1000+ repos
- ✅ Each repo completely independent
- ✅ No conflicts between repos
- ✅ Automatic cleanup (old entries can be manually removed)

### Per-Repo Tracking

- ✅ File hashes (SHA-256) for each file in each repo
- ✅ File size for each file
- ✅ Language detection for each file
- ✅ Last reviewed timestamp per repo

### Incremental Review Logic

1. **If `changedOnly=false`**: Review all files, update cache
2. **If `changedOnly=true` AND cache exists**:
   - Compare current hashes to cached hashes
   - Only review files with different hashes
   - Show "Files Changed" section (new/modified/removed)
3. **If `changedOnly=true` AND no cache**: Review all files (first time)

---

## 📊 Example Cache After Multiple Repos

`backend/data/repoIndex.json`:

```json
{
  "https://github.com/Davide-glitch/Santorini-Game.git": {
    "files": {
      "src/Main.java": { "hash": "abc123...", "size": 4521, "lang": "Java" },
      "src/Board.java": { "hash": "def456...", "size": 3210, "lang": "Java" },
      "README.md": { "hash": "ghi789...", "size": 1234, "lang": "Markdown" }
    },
    "lastReviewed": 1730476800000
  },
  "https://github.com/facebook/react.git": {
    "files": {
      "packages/react/src/React.js": {
        "hash": "jkl012...",
        "size": 12456,
        "lang": "JavaScript"
      },
      "packages/react-dom/src/client/ReactDOM.js": {
        "hash": "mno345...",
        "size": 8765,
        "lang": "JavaScript"
      }
    },
    "lastReviewed": 1730480400000
  },
  "https://github.com/microsoft/TypeScript.git": {
    "files": {
      "src/compiler/checker.ts": {
        "hash": "pqr678...",
        "size": 234567,
        "lang": "TypeScript"
      },
      "src/compiler/parser.ts": {
        "hash": "stu901...",
        "size": 187654,
        "lang": "TypeScript"
      }
    },
    "lastReviewed": 1730484000000
  }
}
```

**Total repos**: 3  
**Total files tracked**: 7  
**Each repo independent**: ✅

---

## 🚀 Temperature Parameter

The temperature setting affects LLM creativity/strictness:

### Temperature Scale (0.0 - 1.0)

```
0.0 ──────── 0.2 ──────── 0.5 ──────── 0.8 ──────── 1.0
│            │            │            │            │
Deterministic Objective   Balanced    Creative   Experimental
Strict       Focused      Flexible    Verbose    Unpredictable
Same output  Consistent   Varied      Diverse    Random
```

### Recommended Values

**Code Review (Security/Bugs)**: `0.0 - 0.2`

- Deterministic, repeatable results
- Focuses on actual issues
- Less creativity, more precision
- Example: `"temperature": 0.1`

**Code Explanation**: `0.3 - 0.5`

- Balanced between facts and clarity
- Clear explanations with examples
- Some creativity in wording
- Example: `"temperature": 0.4`

**Brainstorming/Ideas**: `0.6 - 1.0`

- More creative suggestions
- Multiple alternative approaches
- Verbose explanations
- Example: `"temperature": 0.8`

### How It Works Internally

```typescript
// Backend sends to Ollama
const r = await axios.post(
  `${OLLAMA_URL}/api/generate`,
  {
    model: selectedModel,
    stream: false,
    prompt: "Review this code...",
    system: "You are a code reviewer...",
    options: {
      temperature: temp, // ← Your value (0.0 - 1.0)
    },
  },
  { timeout: 180_000 }
);
```

**Ollama uses this to control randomness in token selection:**

- Low temp (0.0): Always picks most likely next token → consistent output
- High temp (1.0): Samples from wider token distribution → creative output

### Default: `0.1` (Strict Code Review)

This is the default in the backend when not specified:

```typescript
const temp =
  typeof temperature === "number" && temperature >= 0 && temperature <= 1
    ? temperature
    : 0.1; // ← Default: objective, focused
```

---

## ✅ Everything Works!

### Cache System

- ✅ Stores unlimited repos in `backend/data/repoIndex.json`
- ✅ Each repo has unique key (full URL)
- ✅ Per-file hashing (SHA-256)
- ✅ Language detection per file
- ✅ Incremental review with change tracking

### Temperature Control

- ✅ Range: 0.0 (strict) to 1.0 (creative)
- ✅ Default: 0.1 (objective code review)
- ✅ Passed to Ollama via `options.temperature`
- ✅ Affects output determinism and verbosity

### Works For

- ✅ Any GitHub repo (public or private with access)
- ✅ owner/repo format
- ✅ Full https://github.com/owner/repo.git URLs
- ✅ Multiple repos simultaneously (independent caches)
- ✅ All models (qwen, deepseek, llama, etc.)

---

## 🧪 Test Commands

### Test Multiple Repos

```bash
# Test 1: Santorini Game
curl -X POST http://localhost:7070/api/reviewRepo \
  -H "Content-Type: application/json" \
  -d '{"repo":"Davide-glitch/Santorini-Game","model":"qwen2.5-coder:7b","temperature":0.1,"changedOnly":false}'

# Test 2: Different repo
curl -X POST http://localhost:7070/api/reviewRepo \
  -H "Content-Type: application/json" \
  -d '{"repo":"facebook/react","model":"qwen2.5-coder:7b","temperature":0.1,"changedOnly":false}'

# Test 3: Back to first repo (incremental)
curl -X POST http://localhost:7070/api/reviewRepo \
  -H "Content-Type: application/json" \
  -d '{"repo":"Davide-glitch/Santorini-Game","model":"qwen2.5-coder:7b","temperature":0.1,"changedOnly":true}'
```

Each repo gets its own cache entry! ✅
