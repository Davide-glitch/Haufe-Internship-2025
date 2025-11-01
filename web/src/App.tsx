import { useState, useEffect, useRef } from 'react';

interface HealthData {
  ok: boolean;
  model?: string;
  models?: string[];
}

export default function App() {
  const [code, setCode] = useState<string>('# Paste your code here or ask a question\n');
  const [model, setModel] = useState<string>('');
  const [models, setModels] = useState<string[]>([]);
  const [temperature, setTemperature] = useState<number>(0.1);
  const [repo, setRepo] = useState<string>('');
  const [resp, setResp] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [repoGuidelines, setRepoGuidelines] = useState<string>(()=>localStorage.getItem('repoGuidelines')||'');
  const [metrics, setMetrics] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentFile, setCommentFile] = useState<string>('');
  const [commentLines, setCommentLines] = useState<string>('');
  const [commentText, setCommentText] = useState<string>('');
  const commentTextRef = useRef<HTMLTextAreaElement | null>(null);

  type Finding = { id: string; file?: string; lines?: string; title?: string };
  const [findings, setFindings] = useState<Finding[]>([]);

  useEffect(() => {
    fetch('http://localhost:7070/health', { method: 'GET' })
      .then(r => r.json())
      .then((data: HealthData) => {
        setHealthOk(data.ok);
        const list = data.models?.length ? data.models : (data.model ? [data.model] : []);
        setModels(list);
        if (data.model) setModel(data.model);
      })
      .catch(() => setHealthOk(false));
  }, []);

  const submit = async () => {
    if (!code.trim()) { setResp('Please enter some code or a question.'); return; }
    setLoading(true); setResp('');
    try {
      const r = await fetch('http://localhost:7070/api/review', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'python', model, temperature })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Request failed');
      setResp(data?.raw || JSON.stringify(data, null, 2));
    } catch (e: any) { setResp(`Error: ${e?.message || e}`); }
    finally { setLoading(false); }
  };

  const submitRepo = async () => {
    if (!repo.trim()) { setResp('Please enter a GitHub repo: owner/repo or https URL'); return; }
    setLoading(true); setResp('');
    try {
      const r = await fetch('http://localhost:7070/api/reviewRepo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, model, temperature, changedOnly: (localStorage.getItem('repoChangedOnly')==='1'), guidelines: repoGuidelines })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Request failed');
      setResp(data?.review || data?.raw || JSON.stringify(data, null, 2));
      setMetrics(data?.metrics || null);
      // load comments for this repo
      try {
        const cr = await fetch(`http://localhost:7070/api/comments?repo=${encodeURIComponent(repo.startsWith('http')?repo:`https://github.com/${repo}.git`)}`);
        const cd = await cr.json();
        setComments(cd?.comments || []);
      } catch {}
    } catch (e: any) { setResp(`Error: ${e?.message || e}`); }
    finally { setLoading(false); }
  };

  const clearAll = () => { setCode(''); setResp(''); };

  const saveGuidelines = (v: string) => { setRepoGuidelines(v); localStorage.setItem('repoGuidelines', v); };

  const addComment = async () => {
    if (!repo.trim() || !commentText.trim()) return;
    const repoKey = repo.startsWith('http')?repo:`https://github.com/${repo}.git`;
    try {
      const r = await fetch('http://localhost:7070/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo: repoKey, file: commentFile || undefined, lines: commentLines || undefined, text: commentText }) });
      const d = await r.json();
      if (r.ok) {
        setComments([...(comments||[]), d.comment]);
        setCommentText(''); setCommentFile(''); setCommentLines('');
      }
    } catch {}
  };

  // Parse findings from the last review response to allow quick comment anchoring
  useEffect(() => {
    const text = resp || '';
    if (!text) { setFindings([]); return; }

    const out: Finding[] = [];
    const lines = text.split(/\n/);
    // Heuristics: look for lines containing "File:" and nearby "Line" or "Lines"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fileMatch = line.match(/File\s*:\s*([^\s\*`#]+[^,:\n\r`#]*)/i);
      if (fileMatch) {
        let file = (fileMatch[1] || '').trim();
        // Normalize trailing markers
        file = file.replace(/[),;]+$/,'');
        // Find lines range on same line or within next few lines
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
        // Try to derive a title from an "Issue:" label or next non-empty line
        let title = '';
        for (let j = 0; j <= 4 && (i + j) < lines.length; j++) {
          const ln = lines[i + j];
          const im = ln.match(/Issue\s*:\s*(.+)/i);
          if (im) { title = im[1].trim(); break; }
        }
        if (!title) {
          for (let j = 1; j <= 6 && (i + j) < lines.length; j++) {
            const ln = lines[i + j].trim();
            if (ln && !/^\*|^```|^Current Code|^Fixed Code|^Explanation/i.test(ln)) { title = ln.replace(/^[-\d\.\)]\s*/, '').slice(0, 120); break; }
          }
        }
        const id = `${file}:${rng || 'unknown'}`;
        out.push({ id, file, lines: rng || undefined, title });
      }
    }
    // De-duplicate by id while keeping order
    const seen = new Set<string>();
    const uniq: Finding[] = [];
    for (const f of out) { if (f.file && !seen.has(f.id)) { seen.add(f.id); uniq.push(f); } }
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
        <div className="status">
          <span className={`status-dot ${healthOk ? 'ok' : 'offline'}`}></span>
          <span className="status-label">{healthOk ? 'API Online' : 'API Offline'}</span>
        </div>
      </div>

      <div className="main-content">
        <div className="editor-panel">
          <div className="panel-header">
            <span className="panel-title">Code Input</span>
            <div className="controls-inline">
              <div className="slider-wrap">
                <span className="slider-label">Temperature</span>
                <span className="slider-end">0</span>
                <input type="range" min={0} max={1} step={0.05} value={temperature} onChange={e=>setTemperature(parseFloat(e.target.value))} />
                <span className="slider-end">1</span>
              </div>
              <button className="btn-secondary" onClick={clearAll}>Clear</button>
            </div>
          </div>
          <textarea
            className="code-editor"
            value={code}
            onChange={e=>setCode(e.target.value)}
            spellCheck={false}
            placeholder="Paste code or ask a question..."
          />

          {/* Left-side extras: Guidelines upload and Findings navigator */}
          <div className="panel-header" style={{ borderTop: '1px solid var(--border-color)' }}>
            <span className="panel-title">Project Guidelines & Findings</span>
          </div>
          <div style={{ padding: '0.75rem 1.25rem', display:'grid', gap: '.5rem' }}>
            <div className="controls-inline" style={{gap:'.5rem', flexWrap:'wrap'}}>
              <label className="btn-secondary" style={{cursor:'pointer'}}>
                📄 Upload Guidelines
                <input type="file" accept=".md,.txt,.json" style={{display:'none'}} onChange={async (e)=>{
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const text = await f.text();
                  saveGuidelines(text);
                }} />
              </label>
              <span style={{fontSize:'.85rem', color:'var(--text-muted)'}}>or paste below</span>
            </div>
            <textarea className="code-editor" style={{minHeight: 120}} placeholder="Paste PEP8 / ESLint rules or custom guidelines here..." value={repoGuidelines} onChange={e=>saveGuidelines(e.target.value)} />

            {findings && findings.length>0 && (
              <div>
                <div className="label-inline" style={{marginBottom:'.25rem'}}>Findings (last review)</div>
                <div style={{maxHeight:180, overflowY:'auto', border:'1px solid var(--border-color)', borderRadius:6}}>
                  {findings.slice(0, 20).map((f, idx) => (
                    <div key={f.id+idx} style={{padding:'.5rem .75rem', borderBottom:'1px solid var(--border-color)', display:'flex', gap:'.5rem', alignItems:'center'}}>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontSize:'.8rem', color:'var(--text-muted)'}}>{f.file}{f.lines?` • ${f.lines}`:''}</div>
                        <div style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{f.title || '(no title found)'}</div>
                      </div>
                      <button className="btn-secondary" onClick={()=>{
                        if (f.file) setCommentFile(f.file);
                        setCommentLines(f.lines || '');
                        // Scroll to and focus the comment box on the right
                        setTimeout(()=>{
                          commentTextRef.current?.scrollIntoView({ behavior:'smooth', block:'center' });
                          commentTextRef.current?.focus();
                        }, 50);
                      }}>Comment</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="output-panel">
          <div className="panel-header">
            <span className="panel-title">AI Review</span>
            <div className="controls-inline">
              <label className="label-inline">Model:</label>
              <select className="select-model" value={model} onChange={e=>setModel(e.target.value)} disabled={models.length === 0}>
                {models.length === 0 && <option value="">No models</option>}
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <button className="btn-primary" onClick={submit} disabled={loading || !healthOk}>
                {loading ? '⏳ Reviewing…' : '🚀 Review'}
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
                <p className="placeholder-hint">Paste code above and click Review</p>
              </div>
            )}
          </div>

          <div className="panel-header" style={{ borderTop: '1px solid var(--border-color)' }}>
            <span className="panel-title">Review GitHub Repo</span>
            <div className="controls-inline" style={{ width: '100%' }}>
              <input
                className="repo-input"
                placeholder="owner/repo or https://github.com/owner/repo(.git)"
                value={repo}
                onChange={e=>setRepo(e.target.value)}
                spellCheck={false}
                style={{ flex: 1 }}
              />
              <label className="label-inline" style={{marginLeft:'.5rem'}}>Changed only</label>
              <input type="checkbox" onChange={e=>localStorage.setItem('repoChangedOnly', e.target.checked ? '1' : '0')} defaultChecked={localStorage.getItem('repoChangedOnly')==='1'} />
              <button className="btn-primary" onClick={submitRepo} disabled={loading || !healthOk}>🔎 Review Repo</button>
            </div>
          </div>
          {metrics && (
            <div style={{ padding: '0.5rem 1.25rem', borderTop: '1px solid var(--border-color)', fontSize:'.85rem', color:'var(--text-muted)' }}>
              <b>Metrics:</b> duration {metrics.durationMs} ms • files {metrics.filesReviewed} • batches {metrics.batches} • input {metrics.inputChars} chars • output {metrics.outputChars} chars • est tokens {metrics.tokenEstimate}
            </div>
          )}

          <div className="panel-header" style={{ borderTop: '1px solid var(--border-color)' }}>
            <span className="panel-title">Comments</span>
          </div>
          <div style={{ padding: '0.75rem 1.25rem', display:'grid', gap: '.5rem' }}>
            <div className="controls-inline" style={{gap:'.5rem', flexWrap:'wrap'}}>
              <input className="repo-input" placeholder="file path (optional)" value={commentFile} onChange={e=>setCommentFile(e.target.value)} />
              <input className="repo-input" placeholder="lines e.g. 12-20 (optional)" value={commentLines} onChange={e=>setCommentLines(e.target.value)} />
            </div>
            <textarea ref={commentTextRef} className="code-editor" style={{minHeight: 80}} placeholder="Add a comment or resolution note..." value={commentText} onChange={e=>setCommentText(e.target.value)} />
            <div>
              <button className="btn-primary" onClick={addComment} disabled={!repo || !commentText.trim()}>Add Comment</button>
            </div>
            {comments && comments.length>0 && (
              <div style={{marginTop:'.5rem'}}>
                <div className="label-inline" style={{marginBottom:'.25rem'}}>Thread</div>
                <div style={{maxHeight:200, overflowY:'auto', border:'1px solid var(--border-color)', borderRadius:6, padding:'.5rem 0'}}>
                  {comments.slice().reverse().map(c=> (
                    <div key={c.id} style={{padding:'.4rem 1rem', borderBottom:'1px solid var(--border-color)'}}>
                      <div style={{fontSize:'.8rem', color:'var(--text-muted)'}}>{c.file || '(no file)'} {c.lines ? `• ${c.lines}`:''} • {new Date(c.createdAt).toLocaleString()}</div>
                      <div style={{whiteSpace:'pre-wrap'}}>{c.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="footer">
        <span>Powered by Ollama • Running locally on your machine</span>
      </div>
    </div>
  );
}
