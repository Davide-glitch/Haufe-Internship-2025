import { useState, useEffect, useRef } from 'react';

interface HealthData {
  ok: boolean;
  provider?: string;
  model?: string;
  models?: string[];
  cloudFallback?: boolean;
}

type Finding = {
  id: string;
  file?: string;
  lines?: string;
  title?: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
};

export default function App() {
  const [code, setCode] = useState<string>('# Paste your code here or ask a question\n');
  const [language, setLanguage] = useState<string>('auto');
  const [model, setModel] = useState<string>('');
  const [models, setModels] = useState<string[]>([]);
  const [temperature, setTemperature] = useState<number>(0.1);
  const [repo, setRepo] = useState<string>('');
  const [changedOnly, setChangedOnly] = useState<boolean>(() => localStorage.getItem('repoChangedOnly') === '1');
  const [resp, setResp] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [repoGuidelines, setRepoGuidelines] = useState<string>(() => localStorage.getItem('repoGuidelines') || '');
  const [metrics, setMetrics] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentFile, setCommentFile] = useState<string>('');
  const [commentLines, setCommentLines] = useState<string>('');
  const [commentText, setCommentText] = useState<string>('');
  const [copyStatus, setCopyStatus] = useState<string>('');
  const commentTextRef = useRef<HTMLTextAreaElement | null>(null);

  const [findings, setFindings] = useState<Finding[]>([]);

  const checkHealth = () => {
    fetch('http://localhost:7070/health', { method: 'GET' })
      .then(r => r.json())
      .then((data: HealthData) => {
        setHealthData(data);
        const list = data.models?.length ? data.models : (data.model ? [data.model] : []);
        setModels(list);
        if (data.model && (!model || !list.includes(model))) {
          setModel(data.model);
        }
      })
      .catch(() => setHealthData({ ok: false }));
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const detectLanguage = (snippet: string): string => {
    if (language !== 'auto') return language;
    const lower = snippet.toLowerCase();
    if (/^\s*(import\s+react|const\s+|let\s+|function\s*\(|=>|console\.log|export\s+default)/m.test(snippet)) {
      return snippet.includes(': string') || snippet.includes(': number') || snippet.includes('interface ') ? 'typescript' : 'javascript';
    }
    if (/^\s*(def\s+|import\s+|from\s+\w+\s+import|print\(|elif\s+|class\s+\w+:)/m.test(snippet)) {
      return 'python';
    }
    if (/^\s*(public\s+class|package\s+|System\.out\.println)/m.test(snippet)) {
      return 'java';
    }
    if (/^\s*(package\s+main|func\s+|import\s+\()/m.test(snippet)) {
      return 'go';
    }
    if (/^\s*(fn\s+main|use\s+std::|let\s+mut)/m.test(snippet)) {
      return 'rust';
    }
    if (lower.startsWith('how') || lower.startsWith('why') || lower.startsWith('what') || lower.startsWith('explain')) {
      return 'plain';
    }
    return 'python';
  };

  const submit = async () => {
    if (!code.trim()) { setResp('Please enter some code or a question.'); return; }
    setLoading(true); setResp('');
    try {
      const detectedLang = detectLanguage(code);
      const r = await fetch('http://localhost:7070/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: detectedLang,
          model,
          temperature,
          guidelines: repoGuidelines || undefined
        })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || data?.detail || 'Request failed');
      setResp(data?.raw || JSON.stringify(data, null, 2));
      setMetrics(data?.metrics || null);
    } catch (e: any) {
      setResp(`Error: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const submitRepo = async () => {
    if (!repo.trim()) { setResp('Please enter a GitHub repo: owner/repo or https URL'); return; }
    setLoading(true); setResp('');
    try {
      const r = await fetch('http://localhost:7070/api/reviewRepo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: repo.trim(),
          model,
          temperature,
          changedOnly,
          guidelines: repoGuidelines || undefined
        })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || data?.detail || 'Request failed');
      setResp(data?.review || data?.raw || JSON.stringify(data, null, 2));
      setMetrics(data?.metrics || null);

      // Load comments for this repo
      try {
        const repoKey = repo.startsWith('http') ? repo.trim() : `https://github.com/${repo.trim()}.git`;
        const cr = await fetch(`http://localhost:7070/api/comments?repo=${encodeURIComponent(repoKey)}`);
        const cd = await cr.json();
        setComments(cd?.comments || []);
      } catch {}
    } catch (e: any) {
      setResp(`Error: ${e?.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const clearAll = () => { setCode(''); setResp(''); setMetrics(null); };

  const saveGuidelines = (v: string) => {
    setRepoGuidelines(v);
    localStorage.setItem('repoGuidelines', v);
  };

  const handleMultipleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const contents: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const text = await f.text();
      contents.push(`### Guideline: ${f.name}\n${text}`);
    }
    const merged = repoGuidelines ? `${repoGuidelines}\n\n${contents.join('\n\n')}` : contents.join('\n\n');
    saveGuidelines(merged);
    e.target.value = '';
  };

  const addComment = async () => {
    if (!repo.trim() || !commentText.trim()) return;
    const repoKey = repo.startsWith('http') ? repo.trim() : `https://github.com/${repo.trim()}.git`;
    try {
      const r = await fetch('http://localhost:7070/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: repoKey,
          file: commentFile || undefined,
          lines: commentLines || undefined,
          text: commentText
        })
      });
      const d = await r.json();
      if (r.ok && d.comment) {
        setComments([...comments, d.comment]);
        setCommentText('');
        setCommentFile('');
        setCommentLines('');
      }
    } catch {}
  };

  const copyToClipboard = () => {
    if (!resp) return;
    navigator.clipboard.writeText(resp).then(() => {
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 2000);
    });
  };

  // Parse findings from the last review response to allow quick comment anchoring
  useEffect(() => {
    const text = resp || '';
    if (!text) { setFindings([]); return; }

    const out: Finding[] = [];
    const lines = text.split(/\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fileMatch = line.match(/File\s*:\s*([^\s\*`#]+[^,:\n\r`#]*)/i);
      if (fileMatch) {
        let file = (fileMatch[1] || '').trim().replace(/[),;]+$/, '');
        let rng = '';
        const sameLineRange = line.match(/Lines?\s*[: ]\s*([0-9]+(?:-[0-9]+)?)/i) || line.match(/:(\d+(?:-\d+)?)/);
        if (sameLineRange) {
          rng = sameLineRange[1];
        } else {
          for (let j = 1; j <= 4 && (i + j) < lines.length; j++) {
            const ln = lines[i + j];
            const m = ln.match(/Lines?\s*[: ]\s*([0-9]+(?:-[0-9]+)?)/i) || ln.match(/Line\s*[: ]\s*(\d+)/i);
            if (m) { rng = m[1]; break; }
          }
        }

        // Severity detection
        let sev: Finding['severity'] = undefined;
        for (let j = -2; j <= 4 && (i + j) >= 0 && (i + j) < lines.length; j++) {
          const ln = lines[i + j];
          if (/CRITICAL/i.test(ln)) { sev = 'CRITICAL'; break; }
          if (/HIGH/i.test(ln)) { sev = 'HIGH'; break; }
          if (/MEDIUM/i.test(ln)) { sev = 'MEDIUM'; break; }
          if (/LOW/i.test(ln)) { sev = 'LOW'; break; }
          if (/INFO/i.test(ln)) { sev = 'INFO'; break; }
        }

        let title = '';
        for (let j = 0; j <= 4 && (i + j) < lines.length; j++) {
          const ln = lines[i + j];
          const im = ln.match(/Issue\s*:\s*(.+)/i);
          if (im) { title = im[1].trim(); break; }
        }
        if (!title) {
          for (let j = 1; j <= 6 && (i + j) < lines.length; j++) {
            const ln = lines[i + j].trim();
            if (ln && !/^\*|^```|^Current Code|^Fixed Code|^Explanation/i.test(ln)) {
              title = ln.replace(/^[-\d\.\)]\s*/, '').slice(0, 120);
              break;
            }
          }
        }
        const id = `${file}:${rng || 'unknown'}:${title.slice(0, 30)}`;
        out.push({ id, file, lines: rng || undefined, title, severity: sev });
      }
    }
    const seen = new Set<string>();
    const uniq: Finding[] = [];
    for (const f of out) {
      if (f.file && !seen.has(f.id)) {
        seen.add(f.id);
        uniq.push(f);
      }
    }
    setFindings(uniq.slice(0, 50));
  }, [resp]);

  return (
    <div className="app">
      <div className="header">
        <div className="logo">
          <div className="logo-icon">⚡</div>
          <div className="logo-text">
            <h1>AI Code Review</h1>
            <p>Local • Private • Zero Cost</p>
          </div>
        </div>
        <div className="status" onClick={checkHealth} style={{ cursor: 'pointer' }} title="Click to refresh status">
          <span className={`status-dot ${healthData?.ok ? 'ok' : 'offline'}`}></span>
          <span className="status-label">
            {healthData?.ok
              ? (healthData.cloudFallback && healthData.provider === 'openai'
                  ? 'Cloud Active (OpenAI)'
                  : 'API Online (Ollama)')
              : 'API Offline'}
          </span>
          <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '0.25rem' }}>🔄</span>
        </div>
      </div>

      <div className="main-content">
        <div className="editor-panel">
          <div className="panel-header">
            <span className="panel-title">Code Input</span>
            <div className="controls-inline">
              <label className="label-inline">Lang:</label>
              <select
                className="select-model"
                value={language}
                onChange={e => setLanguage(e.target.value)}
                style={{ width: 'auto', padding: '0.25rem 0.5rem' }}
              >
                <option value="auto">Auto-detect</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="go">Go</option>
                <option value="rust">Rust</option>
                <option value="cpp">C++</option>
                <option value="csharp">C#</option>
                <option value="plain">General Q&A</option>
              </select>

              <div className="slider-wrap">
                <span className="slider-label">Temp</span>
                <span className="slider-end">0</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  title={`Temperature: ${temperature}`}
                />
                <span className="slider-end">1</span>
              </div>
              <button className="btn-secondary" onClick={clearAll}>Clear</button>
            </div>
          </div>
          <textarea
            className="code-editor"
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
            placeholder="Paste code or ask a question..."
          />

          {/* Left-side extras: Guidelines upload & Findings navigator */}
          <div className="panel-header" style={{ borderTop: '1px solid var(--border-color)' }}>
            <span className="panel-title">Project Guidelines & Rules</span>
            {repoGuidelines && (
              <button
                className="btn-secondary"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => saveGuidelines('')}
              >
                Clear Rules
              </button>
            )}
          </div>
          <div style={{ padding: '0.75rem 1.25rem', display: 'grid', gap: '.5rem' }}>
            <div className="controls-inline" style={{ gap: '.5rem', flexWrap: 'wrap' }}>
              <label className="btn-secondary" style={{ cursor: 'pointer' }}>
                📄 Upload Guidelines (supports multi-file)
                <input
                  type="file"
                  multiple
                  accept=".md,.txt,.json,.toml,.yaml,.yml"
                  style={{ display: 'none' }}
                  onChange={handleMultipleFilesUpload}
                />
              </label>
              <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Auto-merges uploaded rules</span>
            </div>
            <textarea
              className="code-editor"
              style={{ minHeight: 110 }}
              placeholder="Paste PEP8 / ESLint / OWASP rules or team coding guidelines here..."
              value={repoGuidelines}
              onChange={e => saveGuidelines(e.target.value)}
            />

            {findings && findings.length > 0 && (
              <div>
                <div className="label-inline" style={{ marginBottom: '.25rem' }}>
                  Findings ({findings.length} detected from last review)
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 6 }}>
                  {findings.map((f, idx) => (
                    <div
                      key={f.id + idx}
                      style={{
                        padding: '.5rem .75rem',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        gap: '.5rem',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          {f.severity && (
                            <span
                              style={{
                                padding: '1px 5px',
                                borderRadius: 3,
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                color: '#fff',
                                backgroundColor:
                                  f.severity === 'CRITICAL' ? '#ef4444' :
                                  f.severity === 'HIGH' ? '#f97316' :
                                  f.severity === 'MEDIUM' ? '#eab308' :
                                  f.severity === 'LOW' ? '#3b82f6' : '#6b7280'
                              }}
                            >
                              {f.severity}
                            </span>
                          )}
                          <span>{f.file}{f.lines ? ` : ${f.lines}` : ''}</span>
                        </div>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.85rem' }}>
                          {f.title || '(finding)'}
                        </div>
                      </div>
                      <button
                        className="btn-secondary"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => {
                          if (f.file) setCommentFile(f.file);
                          setCommentLines(f.lines || '');
                          setTimeout(() => {
                            commentTextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            commentTextRef.current?.focus();
                          }, 50);
                        }}
                      >
                        Comment
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="output-panel">
          <div className="panel-header">
            <span className="panel-title">AI Review Output</span>
            <div className="controls-inline">
              <label className="label-inline">Model:</label>
              <select
                className="select-model"
                value={model}
                onChange={e => setModel(e.target.value)}
                disabled={models.length === 0}
              >
                {models.length === 0 && <option value="">No models found</option>}
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              {resp && (
                <button className="btn-secondary" onClick={copyToClipboard} style={{ fontSize: '0.8rem' }}>
                  {copyStatus || '📋 Copy'}
                </button>
              )}
              <button className="btn-primary" onClick={submit} disabled={loading || !healthData?.ok}>
                {loading ? '⏳ Reviewing…' : '🚀 Review Code'}
              </button>
            </div>
          </div>
          <div className="output-content">
            {resp ? (
              <pre className="output-text">{resp}</pre>
            ) : (
              <div className="placeholder">
                <div className="placeholder-icon">💡</div>
                <p>Your AI-powered review will appear here</p>
                <p className="placeholder-hint">Paste code on the left or enter a GitHub repository below</p>
              </div>
            )}
          </div>

          <div className="panel-header" style={{ borderTop: '1px solid var(--border-color)' }}>
            <span className="panel-title">Review Entire GitHub Repository</span>
          </div>
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'grid', gap: '0.5rem' }}>
            <div className="controls-inline" style={{ width: '100%', gap: '0.5rem' }}>
              <input
                className="repo-input"
                placeholder="owner/repo or https://github.com/owner/repo"
                value={repo}
                onChange={e => setRepo(e.target.value)}
                spellCheck={false}
                style={{ flex: 1 }}
              />
              <label className="label-inline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input
                  type="checkbox"
                  checked={changedOnly}
                  onChange={e => {
                    setChangedOnly(e.target.checked);
                    localStorage.setItem('repoChangedOnly', e.target.checked ? '1' : '0');
                  }}
                />
                Changed only
              </label>
              <button className="btn-primary" onClick={submitRepo} disabled={loading || !healthData?.ok}>
                {loading ? '⏳ Analyzing Repo…' : '🔎 Review Repo'}
              </button>
            </div>
          </div>

          {metrics && (
            <div style={{ padding: '0.5rem 1.25rem', borderBottom: '1px solid var(--border-color)', fontSize: '.85rem', color: 'var(--text-muted)' }}>
              <b>Metrics:</b> Duration: {metrics.durationMs}ms
              {metrics.filesReviewed !== undefined && ` • Files: ${metrics.filesReviewed}`}
              {metrics.batches !== undefined && ` • Batches: ${metrics.batches}`}
              {metrics.inputChars !== undefined && ` • Input: ${metrics.inputChars.toLocaleString()} chars`}
              {metrics.outputChars !== undefined && ` • Output: ${metrics.outputChars.toLocaleString()} chars`}
              {metrics.tokenEstimate !== undefined && ` • Est. Tokens: ~${metrics.tokenEstimate.toLocaleString()}`}
            </div>
          )}

          <div className="panel-header">
            <span className="panel-title">Repository Comments & Discussion</span>
          </div>
          <div style={{ padding: '0.75rem 1.25rem', display: 'grid', gap: '.5rem' }}>
            <div className="controls-inline" style={{ gap: '.5rem', flexWrap: 'wrap' }}>
              <input
                className="repo-input"
                placeholder="file path e.g. src/utils.py (optional)"
                value={commentFile}
                onChange={e => setCommentFile(e.target.value)}
                style={{ flex: 1, minWidth: 160 }}
              />
              <input
                className="repo-input"
                placeholder="lines e.g. 12-20 (optional)"
                value={commentLines}
                onChange={e => setCommentLines(e.target.value)}
                style={{ width: 140 }}
              />
            </div>
            <textarea
              ref={commentTextRef}
              className="code-editor"
              style={{ minHeight: 75 }}
              placeholder="Add a comment, resolution note, or discussion point..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
            />
            <div>
              <button className="btn-primary" onClick={addComment} disabled={!repo.trim() || !commentText.trim()}>
                Add Comment
              </button>
            </div>
            {comments && comments.length > 0 && (
              <div style={{ marginTop: '.5rem' }}>
                <div className="label-inline" style={{ marginBottom: '.25rem' }}>
                  Comments for {repo} ({comments.length})
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 6, padding: '.25rem 0' }}>
                  {comments.slice().reverse().map(c => (
                    <div key={c.id} style={{ padding: '.5rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                        {c.file || 'General'} {c.lines ? `(Lines ${c.lines})` : ''} • {new Date(c.createdAt).toLocaleString()}
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap', marginTop: 4, fontSize: '0.9rem' }}>{c.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="footer">
        <span>Powered by Ollama • Running locally and privately on your machine</span>
      </div>
    </div>
  );
}
