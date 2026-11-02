import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import crypto from 'crypto';

const PORT = Number(process.env.PORT || 7070);
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
const ALLOW_CLOUD = (process.env.ALLOW_CLOUD || 'false').toLowerCase() === 'true';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Helper: unified LLM caller (local Ollama with optional OpenAI fallback)
async function generateLLMResponse(
  prompt: string,
  system: string,
  selectedModel: string,
  temperature: number
): Promise<{ text: string; provider: string; model: string; durationMs: number }> {
  const t0 = Date.now();
  try {
    const r = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: selectedModel,
      stream: false,
      prompt,
      system,
      options: { temperature }
    }, { timeout: 180_000 });
    return {
      text: r.data?.response || '',
      provider: 'ollama',
      model: selectedModel,
      durationMs: Date.now() - t0
    };
  } catch (err: any) {
    if (ALLOW_CLOUD && process.env.OPENAI_API_KEY) {
      try {
        const openai = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o-mini',
            messages: [
              ...(system ? [{ role: 'system', content: system }] : []),
              { role: 'user', content: prompt }
            ],
            temperature
          },
          { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, timeout: 120_000 }
        );
        return {
          text: openai.data?.choices?.[0]?.message?.content ?? '',
          provider: 'openai',
          model: 'gpt-4o-mini',
          durationMs: Date.now() - t0
        };
      } catch (cloudErr: any) {
        throw new Error(`Ollama failed (${err.message}) and cloud fallback failed (${cloudErr.message})`);
      }
    }
    throw new Error(`Ollama request failed: ${err.message}${!ALLOW_CLOUD ? ' (cloud fallback is disabled)' : ''}`);
  }
}

app.get('/health', async (_, res) => {
  try {
    const r = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 3000 });
    const models = (r.data?.models ?? []).map((m: any) => m?.name).filter(Boolean);
    return res.json({
      ok: true,
      provider: 'ollama',
      model: OLLAMA_MODEL,
      models,
      cloudFallback: ALLOW_CLOUD && !!process.env.OPENAI_API_KEY
    });
  } catch {
    const hasCloud = ALLOW_CLOUD && !!process.env.OPENAI_API_KEY;
    return res.json({
      ok: hasCloud,
      provider: hasCloud ? 'openai' : 'none',
      model: hasCloud ? 'gpt-4o-mini' : OLLAMA_MODEL,
      models: hasCloud ? ['gpt-4o-mini'] : [],
      cloudFallback: hasCloud,
      ollamaOffline: true
    });
  }
});

// List available local models from Ollama
app.get('/models', async (_req, res) => {
  try {
    const r = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
    const models = (r.data?.models ?? []).map((m: any) => m?.name).filter(Boolean);
    res.json({ models, default: OLLAMA_MODEL });
  } catch (e: any) {
    if (ALLOW_CLOUD && process.env.OPENAI_API_KEY) {
      return res.json({ models: ['gpt-4o-mini'], default: 'gpt-4o-mini', fallback: true });
    }
    res.status(502).json({ error: 'Failed to query Ollama models', detail: e?.message });
  }
});

// --- Lightweight comment storage (per repo) ---
type CommentItem = { id: string; repo: string; file?: string; lines?: string; text: string; createdAt: number; findingId?: string };
const COMMENTS_PATH = path.join(process.cwd(), 'data', 'comments.json');
const readComments = (): Record<string, CommentItem[]> => {
  try { return JSON.parse(fs.readFileSync(COMMENTS_PATH, 'utf8')); } catch { return {}; }
};
const writeComments = (obj: Record<string, CommentItem[]>) => {
  const dir = path.dirname(COMMENTS_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(COMMENTS_PATH, JSON.stringify(obj, null, 2), 'utf8');
};

app.get('/api/comments', (req, res) => {
  const repo = String(req.query.repo || '').trim();
  if (!repo) return res.status(400).json({ error: 'Missing repo' });
  const data = readComments();
  res.json({ repo, comments: data[repo] || [] });
});

app.post('/api/comments', (req, res) => {
  const { repo, file, lines, text, findingId } = req.body || {};
  if (!repo || !text) return res.status(400).json({ error: 'Missing repo or text' });
  const data = readComments();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const item: CommentItem = { id, repo, file, lines, text: String(text), createdAt: Date.now(), findingId: findingId || undefined };
  data[repo] = data[repo] || [];
  data[repo].push(item);
  writeComments(data);
  res.json({ ok: true, comment: item });
});

app.post('/api/review', async (req, res) => {
  const { code, language = 'python', guidelines, model, temperature } = req.body || {};
  if (!code || typeof code !== 'string') return res.status(400).json({ error: 'Missing code' });

  const selectedModel = (typeof model === 'string' && model.trim()) ? model.trim() : OLLAMA_MODEL;
  const temp = (typeof temperature === 'number' && temperature >= 0 && temperature <= 1) ? temperature : 0.1;

  const isPlain = String(language).toLowerCase() === 'plain';

  const system = isPlain
    ? `You are a highly capable, friendly software assistant.
Answer clearly and helpfully. If you are unsure, ask clarifying questions.
Avoid fabricating facts. Prefer concise, correct guidance.`
    : `You are an expert code reviewer specializing in deep, line-by-line analysis.

**CRITICAL REQUIREMENTS:**
1. **Code analysis is MANDATORY** - Analyze the actual code, not just provide summaries
2. **Line-by-line review** - Examine each function, loop, condition, and logic path
3. **Specific line numbers** - Cite exact line numbers for every issue
4. **Corrected code snippets** - Provide EXACT corrected code for each issue (not just descriptions)
5. **Concrete issues only** - Report only actual problems visible in the provided code

**Analysis Focus:**
- Correctness: Logic errors, edge cases, incorrect algorithms
- Security: Injection flaws, hardcoded secrets, insecure crypto, input validation
- Robustness: Error handling, null/undefined checks, resource leaks
- Performance: Inefficient algorithms, memory issues, unnecessary operations
- Readability: Naming, structure, documentation
- Testability: Tight coupling, hidden dependencies

**Output Format:**
- **Title**: One-line summary
- **Summary**: 2-4 bullets highlighting critical findings (not generic statements)
- **Findings**: Numbered list with:
  * Severity: CRITICAL | HIGH | MEDIUM | LOW | INFO
  * Line(s): Exact line number(s)
  * Issue: Precise description
  * Current Code: \`\`\`language\nactual problematic code\n\`\`\`
  * Fixed Code: \`\`\`language\nideal corrected code\n\`\`\`
  * Explanation: Why this is a problem and how fix addresses it
- **Suggested Patch**: Full corrected code section (optional)
- **Effort**: S | M | L (~hours) to apply the fix
- **Docs**: Any documentation updates needed (README, API docs, comments)

**Forbidden:**
- Generic summaries like "code is good but could be better"
- Invented issues not visible in the code
- Omitting line numbers or corrected snippets
- Skipping code analysis for high-level explanations

If no meaningful issues exist, state what the code does clearly and report: "No significant issues found."`;

  let guidelinesText = '';
  if (Array.isArray(guidelines)) {
    guidelinesText = guidelines.filter(Boolean).join('\n\n');
  } else if (typeof guidelines === 'string') {
    guidelinesText = guidelines.trim();
  }

  const prompt = isPlain
    ? String(code).slice(0, 60000)
    : [
        guidelinesText ? `Project guidelines (if any):\n${guidelinesText}` : '',
        `Language: ${language}`,
        'Review the following code:',
        '```',
        String(code).slice(0, 60000),
        '```'
      ].filter(Boolean).join('\n\n');

  try {
    const codeChars = String(code).length;
    const result = await generateLLMResponse(prompt, system, selectedModel, temp);
    const tokenEstimate = Math.ceil((prompt.length + result.text.length) / 4);

    return res.json({
      provider: result.provider,
      model: result.model,
      metrics: { durationMs: result.durationMs, codeChars, tokenEstimate },
      raw: result.text
    });
  } catch (err: any) {
    return res.status(502).json({ error: 'Review failed', detail: err?.message || String(err) });
  }
});

// --- Repo Review: clone and review files ---
app.post('/api/reviewRepo', async (req, res) => {
  let folder = '';
  try {
    const { repo, model, temperature = 0.1, maxBytesPerBatch = 120_000, changedOnly, guidelines } = req.body || {};
    if (!repo || typeof repo !== 'string') return res.status(400).json({ error: 'Missing repo (use owner/repo or full https URL)' });

    let repoUrl = repo.trim();
    if (!repoUrl.startsWith('http')) {
      if (!repoUrl.includes('/')) return res.status(400).json({ error: 'Repo must be in the form owner/repo or a full https URL' });
      repoUrl = `https://github.com/${repoUrl}.git`;
    }

    const tmpRoot = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpRoot)) fs.mkdirSync(tmpRoot, { recursive: true });
    folder = path.join(tmpRoot, String(Date.now()));
    fs.mkdirSync(folder, { recursive: true });

    await new Promise<void>((resolve, reject) => {
      const p = spawn('git', ['clone', '--depth', '1', repoUrl, folder], { stdio: 'ignore' });
      p.on('error', reject);
      p.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`git clone failed (${code})`)));
    });

    // Read or init repo cache
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const idxPath = path.join(dataDir, 'repoIndex.json');
    let idx: any = {};
    try { idx = JSON.parse(fs.readFileSync(idxPath, 'utf8')); } catch { idx = {}; }

    const repoKey = repoUrl;
    const prev = idx[repoKey]?.files || {};

    // Language detection helper
    const detectLang = (fname: string, firstLines: string): string => {
      const ext = path.extname(fname).toLowerCase();
      const langMap: Record<string, string> = {
        '.py': 'Python', '.js': 'JavaScript', '.jsx': 'JavaScript/JSX', '.ts': 'TypeScript', '.tsx': 'TypeScript/TSX',
        '.java': 'Java', '.go': 'Go', '.rb': 'Ruby', '.rs': 'Rust', '.php': 'PHP',
        '.c': 'C', '.cc': 'C++', '.cpp': 'C++', '.cs': 'C#', '.swift': 'Swift', '.kt': 'Kotlin',
        '.sh': 'Shell', '.bash': 'Bash', '.zsh': 'Zsh', '.pl': 'Perl', '.r': 'R', '.lua': 'Lua',
        '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS', '.sass': 'Sass', '.json': 'JSON',
        '.xml': 'XML', '.yaml': 'YAML', '.yml': 'YAML', '.toml': 'TOML', '.md': 'Markdown', '.sql': 'SQL'
      };
      if (langMap[ext]) return langMap[ext];
      // Check shebang
      if (firstLines.startsWith('#!/')) {
        const line = firstLines.split('\n')[0];
        if (line.includes('python')) return 'Python';
        if (line.includes('node')) return 'JavaScript';
        if (line.includes('bash') || line.includes('sh')) return 'Shell';
        if (line.includes('ruby')) return 'Ruby';
        if (line.includes('perl')) return 'Perl';
      }
      return 'Unknown';
    };

    const exts = new Set(['.py','.js','.jsx','.ts','.tsx','.java','.go','.rb','.rs','.php','.c','.cc','.cpp','.cs','.swift','.kt','.sh','.bash','.zsh','.pl','.r','.lua','.html','.css','.scss','.sass','.json','.xml','.yaml','.yml','.toml','.md','.sql']);
    type FileRec = { rel: string; hash: string; size: number; lang: string; };
    const files: FileRec[] = [];
    const walk = (d: string) => {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const ent of entries) {
        const fp = path.join(d, ent.name);
        if (ent.isDirectory()) {
          if (['.git','node_modules','dist','build','.next','.cache','__pycache__','.venv','venv','target'].includes(ent.name)) continue;
          walk(fp);
        } else {
          const ext = path.extname(ent.name).toLowerCase();
          if (!exts.has(ext)) continue;
          try {
            const data = fs.readFileSync(fp, 'utf8');
            const hash = crypto.createHash('sha256').update(data).digest('hex');
            const lang = detectLang(ent.name, data.slice(0, 200));
            files.push({ rel: path.relative(folder, fp).replace(/\\/g, '/'), hash, size: Buffer.byteLength(data, 'utf8'), lang });
          } catch {}
        }
      }
    };
    walk(folder);

    // Determine which files to include (incremental if requested and previous exists)
    const changedSet = new Set<string>();
    for (const f of files) {
      const prevHash = prev[f.rel]?.hash;
      if (!prevHash || prevHash !== f.hash) changedSet.add(f.rel);
    }
    const useChangedOnly = !!changedOnly && Object.keys(prev).length > 0;

    const loadContent = (rel: string) => fs.readFileSync(path.join(folder, rel), 'utf8');
    const selected = (useChangedOnly ? files.filter(f => changedSet.has(f.rel)) : files);

    // Generate change tracking summary for incremental reviews
    let changeSummary = '';
    if (useChangedOnly && Object.keys(prev).length > 0) {
      const currentPaths = new Set(files.map(f => f.rel));
      const cachedPaths = new Set(Object.keys(prev));
      const newFiles = selected.filter(f => !cachedPaths.has(f.rel));
      const modFiles = selected.filter(f => cachedPaths.has(f.rel) && prev[f.rel].hash !== f.hash);
      const remFiles = Array.from(cachedPaths).filter(p => !currentPaths.has(p));
      
      changeSummary = '\n## Files Changed (Incremental Review)\n\n';
      if (newFiles.length) {
        changeSummary += `**New files (${newFiles.length}):**\n${newFiles.map(f => `- ${f.rel} (${f.lang})`).join('\n')}\n\n`;
      }
      if (modFiles.length) {
        changeSummary += `**Modified files (${modFiles.length}):**\n${modFiles.map(f => `- ${f.rel} (${f.lang})`).join('\n')}\n\n`;
      }
      if (remFiles.length) {
        changeSummary += `**Removed files (${remFiles.length}):**\n${remFiles.map(p => `- ${p}`).join('\n')}\n\n`;
      }
      if (!newFiles.length && !modFiles.length && !remFiles.length) {
        changeSummary += '*No changes detected since last review.*\n\n';
      }
    }

    // Guidelines handling
    let userGuidelines = '';
    if (Array.isArray(guidelines)) {
      userGuidelines = guidelines.filter(Boolean).join('\n\n');
    } else if (typeof guidelines === 'string') {
      userGuidelines = guidelines.trim();
    }

    // Attempt to read repo guidelines files
    const guidelineFiles = ['.aicodereview.json', '.aicodereview.md', '.editorconfig', '.eslintrc', '.eslintrc.json', '.flake8', 'pyproject.toml'];
    const foundGuidelines: string[] = [];
    for (const gf of guidelineFiles) {
      const pth = path.join(folder, gf);
      if (fs.existsSync(pth)) {
        try { foundGuidelines.push(`File ${gf}:\n` + fs.readFileSync(pth, 'utf8').slice(0, 5000)); } catch {}
      }
    }

    const batches: string[] = [];
    let current = '';
    let totalChars = 0;
    for (const f of selected) {
      const part = `File: ${f.rel} (Language: ${f.lang})\n\n\`\`\`\n${loadContent(f.rel)}\n\`\`\`\n\n`;
      if ((current.length + part.length) > maxBytesPerBatch && current.length > 0) {
        batches.push(current);
        current = '';
      }
      current += part;
      totalChars += part.length;
    }
    if (current.length) batches.push(current);

    const selectedModel = (typeof model === 'string' && model.trim()) ? model.trim() : OLLAMA_MODEL;
    const temp = (typeof temperature === 'number' && temperature >= 0 && temperature <= 1) ? temperature : 0.1;

    const header = `Repository: ${repo}\nMode: ${useChangedOnly ? 'Changed files only' : 'Full repository'}\nFiles considered: ${selected.length}/${files.length}\nBatches: ${batches.length}\n${changeSummary}${(userGuidelines || foundGuidelines.length) ? '\n## Guidelines (Provided/Detected)\n' + [userGuidelines, ...foundGuidelines].filter(Boolean).join('\n\n') + '\n' : ''}`;

    if (files.length === 0) {
      return res.json({
        provider: 'none',
        model: selectedModel,
        metrics: { durationMs: 0, filesReviewed: 0, batches: 0, inputChars: 0, outputChars: 0, tokenEstimate: 0 },
        review: header + '\n\n*No supported source code files found in this repository.*'
      });
    }

    if (selected.length === 0) {
      return res.json({
        provider: 'none',
        model: selectedModel,
        metrics: { durationMs: 0, filesReviewed: 0, batches: 0, inputChars: 0, outputChars: 0, tokenEstimate: 0 },
        review: header + '\n\n*No files have changed since the last review.*'
      });
    }

    const system = `You are a world-class code reviewer specializing in deep, line-by-line analysis. Review ONLY the provided files. If context is partial, state limitations clearly.

**CRITICAL REQUIREMENTS:**
1. **Code analysis is MANDATORY** - You MUST analyze the actual code, not just provide high-level summaries
2. **Line-by-line review** - Examine each significant code block, function, and logic path
3. **Specific line numbers** - Always cite exact line numbers for every issue found
4. **Concrete issues only** - Only report actual problems you can see in the code
5. **Corrected code snippets** - For each issue, provide the EXACT corrected code (not just descriptions)

**Output Structure:**
- **Title**: One-line summary of review scope
- **Summary**: 3 bullets highlighting critical findings (not generic statements)
- **Findings**: Numbered list with format:
  * Severity: CRITICAL | HIGH | MEDIUM | LOW
  * File: exact/path/to/file.ext:LineNumber
  * Issue: Precise description of the problem
  * Current Code: \`\`\`language\nactual problematic code\n\`\`\`
  * Fixed Code: \`\`\`language\nideal corrected code\n\`\`\`
  * Explanation: Why this is a problem and how fix addresses it
- **Suggested Patches**: Full corrected file sections (optional, for complex changes)
- **Final Notes**: Security risks, performance concerns, architecture issues
- **Effort**: For each finding, include S | M | L (~hours)
- **Docs**: Note any documentation updates (README, API docs, comments)

**Forbidden Behaviors:**
- Do NOT give generic summaries like "the code works but could be improved"
- Do NOT invent issues that aren't visible in the provided code
- Do NOT skip code analysis in favor of high-level explanations
- Do NOT omit line numbers or corrected code snippets
- Do NOT hallucinate files, functions, or languages not present

Each file has been annotated with its detected programming language. Use this to provide language-specific best practices.`;

    let aggregate = header + '\n';
    let batchIdx = 1;
    const t0 = Date.now();
    let totalResponseChars = 0;
    let providerUsed = 'ollama';

    for (const blob of batches) {
      const prompt = `Batch ${batchIdx}/${batches.length}\n\n${blob}`;
      const r = await generateLLMResponse(prompt, system, selectedModel, temp);
      providerUsed = r.provider;
      totalResponseChars += r.text.length;
      aggregate += `\n\n## Batch ${batchIdx} Review\n${r.text}\n`;
      batchIdx++;
    }

    const durationMs = Date.now() - t0;
    const tokenEstimate = Math.ceil((totalChars + totalResponseChars) / 4);

    // Update cache with language info
    const newFiles: any = {};
    for (const f of files) newFiles[f.rel] = { hash: f.hash, size: f.size, lang: f.lang };
    idx[repoKey] = { files: newFiles, lastReviewed: Date.now() };
    try { fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2), 'utf8'); } catch {}

    return res.json({
      provider: providerUsed,
      model: selectedModel,
      metrics: {
        durationMs,
        filesReviewed: selected.length,
        batches: batches.length,
        inputChars: totalChars,
        outputChars: totalResponseChars,
        tokenEstimate
      },
      review: aggregate
    });
  } catch (e: any) {
    return res.status(500).json({ error: 'Repo review failed', detail: e?.message || String(e) });
  } finally {
    // Clean up temporary clone directory
    if (folder) {
      try {
        fs.rmSync(folder, { recursive: true, force: true });
      } catch {}
    }
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
