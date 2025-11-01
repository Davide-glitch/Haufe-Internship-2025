# Quick Reference: Enhanced Features

## 🎯 What's New

### 1. **Language Detection** 🔍

Every file is now automatically labeled with its programming language.

**Example Output:**

```
File: src/auth/login.py (Language: Python)
File: src/api/routes.ts (Language: TypeScript)
File: src/utils/helper.go (Language: Go)
```

**Supported:**

- Python, JavaScript, TypeScript, Java, Go, Rust, C/C++, C#, Ruby, PHP
- Swift, Kotlin, Shell, Perl, R, Lua, HTML, CSS, JSON, YAML, Markdown, SQL
- Auto-detects via extension + shebang fallback

---

### 2. **Code-Focused Analysis** 💻

Models now MUST provide line-by-line analysis with specific fixes.

**Before:**

```
The code could be improved. Consider better error handling.
```

**After:**

````
**Finding 1:**
- Severity: CRITICAL
- Line(s): 12-14
- Issue: Unsafe eval() allows arbitrary code execution

Current Code:
```python
def unsafe_eval(user_input):
    return eval(user_input)
````

Fixed Code:

```python
def safe_eval(user_input):
    # Use ast.literal_eval for safe evaluation of literals only
    import ast
    try:
        return ast.literal_eval(user_input)
    except (ValueError, SyntaxError) as e:
        raise ValueError(f"Invalid input: {e}")
```

Explanation: eval() executes arbitrary Python code, allowing attackers
to run malicious commands. ast.literal_eval() safely evaluates only
Python literals (strings, numbers, lists, dicts, etc.).

````

**Mandatory Elements:**
- ✅ Specific line numbers
- ✅ Current code block
- ✅ Fixed code block
- ✅ Explanation of issue and fix

---

### 3. **Change Tracking** 📊
See exactly what changed in incremental reviews.

**Example Output:**
```markdown
## Files Changed (Incremental Review)

**New files (3):**
- src/middleware/auth.ts (TypeScript)
- src/models/session.py (Python)
- docs/api.md (Markdown)

**Modified files (7):**
- src/api/routes.ts (TypeScript)
- src/database/schema.sql (SQL)
- README.md (Markdown)

**Removed files (2):**
- legacy/old_api.php
- deprecated/utils.rb
````

**How It Works:**

1. First review: Hashes all files → saves to cache
2. Next review: Re-hashes files → compares to cache
3. Shows: New, Modified, Removed files
4. If `changedOnly=true`: Only reviews changed files

---

## 🚀 How to Use

### Web UI (http://localhost:5173)

1. **Paste Code** → Type code in left panel
2. **Select Model** → Choose from dropdown (qwen, deepseek, llama)
3. **Set Temperature** → 0 = strict, 1 = creative (default 0.1)
4. **Review** → Click "Review Code"
5. **Result** → See detailed analysis with line numbers + fixes

### Repo Review

1. **Enter Repo** → `owner/repo` or full GitHub URL
2. **Enable Changed Only** → Toggle checkbox (saves to localStorage)
3. **Review Repo** → Click "Review Repo"
4. **Result** → See:
   - Language annotations per file
   - Change tracking (if incremental)
   - Detailed code analysis with fixes

### VS Code Extension

1. **Quick Prompt** → `Ctrl+Alt+A` or Command Palette > "Open Prompt"
2. **Select Model** → Dropdown at top
3. **Paste Code** → Textarea
4. **Review** → Click "Review"
5. **Result** → See analysis with line numbers

---

## 📋 Testing

Run the test script to verify all features:

```bash
python test_enhancements.py
```

**Tests:**

1. ✅ Language detection in repo reviews
2. ✅ Code-focused prompts with line numbers
3. ✅ Change tracking display

---

## 🔧 Configuration

### Backend (`backend/src/server.ts`)

- `detectLang()`: Language detection helper
- System prompts: Code-focused analysis rules
- `/api/reviewRepo`: Change tracking logic

### Cache (`backend/data/repoIndex.json`)

```json
{
  "https://github.com/user/repo.git": {
    "files": {
      "src/main.py": {
        "hash": "sha256...",
        "size": 4521,
        "lang": "Python"
      }
    },
    "lastReviewed": 1730419200000
  }
}
```

### Web UI (`web/src/App.tsx`)

- "Changed only" checkbox
- Model selector
- Temperature slider (0 left → 1 right)

---

## 💡 Tips

### Get Better Reviews

1. **Use temperature 0-0.2** for strict, objective analysis
2. **Use temperature 0.8-1.0** for creative explanations
3. **Enable "Changed only"** for large repos (saves time)
4. **Check language annotations** to verify correct detection

### Models

- `qwen2.5-coder:7b` - Fast, code-focused (recommended)
- `deepseek-coder-v2:16b` - Slower, more detailed
- `llama3.1:8b` - General purpose

### Incremental Reviews

1. First review: Full repo analysis + cache creation
2. Modify files: Edit, commit, push
3. Second review: Only changed files reviewed
4. Result: See "Files Changed" section with new/modified/removed

---

## 🐛 Troubleshooting

### "No language detected"

- File extension not recognized → Add to `langMap` in `detectLang()`
- Binary file or unsupported type → Will show "Unknown"

### "No change tracking section"

- First review or no cache → Expected (nothing to compare)
- No files changed → Shows "No changes detected"
- `changedOnly=false` → Change tracking still shown but all files reviewed

### "Generic summaries instead of code analysis"

- Check model: Some models better than others
- Lower temperature: Try 0.0-0.1 for stricter output
- Model may be overloaded: Try again or use smaller files

---

## 📚 Documentation

- **Full Guide**: `ENHANCEMENTS.md`
- **User Guide**: `SIMPLE_GUIDE.md`
- **Models**: `MODELS.md`

---

## ✅ Summary

| Feature              | Status    | Location                      |
| -------------------- | --------- | ----------------------------- |
| Language Detection   | ✅ Active | `backend/src/server.ts`       |
| Code-Focused Prompts | ✅ Active | System prompts in backend     |
| Change Tracking      | ✅ Active | `/api/reviewRepo` endpoint    |
| File Hash Caching    | ✅ Active | `backend/data/repoIndex.json` |

**All features work automatically with no configuration needed!**
