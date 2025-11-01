import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { LLMRouter } from '../llm/LLMRouter';
import { LLMUsage } from '../llm/types';
import { getAnalyzer } from '../analyzers/LanguageAnalyzers';

export type Severity = 'info' | 'warning' | 'error' | 'critical';

export interface ReviewIssue {
  id: string;
  filePath: string;
  title: string;
  message: string;
  severity: Severity;
  startLine: number;
  endLine: number;
  guideline?: string;
  tags?: string[];
  effort?: string;
}

export interface ReviewMetrics {
  total: number;
  bySeverity: Record<Severity, number>;
  durationMs: number;
  tokenUsage?: LLMUsage;
}

export interface ReviewResult {
  summary: string;
  issues: ReviewIssue[];
  metrics: ReviewMetrics;
  rawAi?: string;
  providerUsed?: string;
  docSuggestions?: string[];
}

export interface DiffHunk {
  header: string;
  content: string;
  newStart: number;
  newLines: number;
}

export interface FileChange {
  filePath: string;
  hunks: DiffHunk[];
  patch: string;
}

export class ReviewManager {
  private llmRouter = new LLMRouter();
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    // Discover providers on startup
    this.llmRouter.discoverProviders().catch(console.error);
  }

  private getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  async getGitDiff(): Promise<FileChange[]> {
    const cwd = this.getWorkspaceRoot();
    if (!cwd) throw new Error('No workspace open');

    const patch = await this.exec('git diff --staged', cwd);
    if (!patch.trim()) return [];

    const files: FileChange[] = [];
    const parts = patch.split(/^diff --git .*$/m).filter((p) => p.trim());
    for (const p of parts) {
      const m = p.match(/^\+\+\+ b\/(.*)$/m);
      if (!m) continue;
      const filePath = path.join(cwd, m[1].trim());

      const hunks: DiffHunk[] = [];
      const hunkRegex = /^@@ -(\d+),(\d+) \+(\d+),(\d+) @@.*$/gm;
      let hm: RegExpExecArray | null;
      while ((hm = hunkRegex.exec(p)) !== null) {
        const newStart = parseInt(hm[3], 10);
        const newLines = parseInt(hm[4], 10);
        const startIdx = hm.index + hm[0].length;
        const nextIdx = p.indexOf('\n@@', startIdx);
        const content = p.substring(startIdx, nextIdx === -1 ? p.length : nextIdx);
        hunks.push({ header: hm[0], content, newStart, newLines });
      }
      files.push({ filePath, hunks, patch: p });
    }
    return files;
  }

  private async exec(cmd: string, cwd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      cp.exec(cmd, { cwd, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) return reject(new Error(stderr || err.message));
        resolve(stdout);
      });
    });
  }

  private runHeuristics(code: string, languageId: string, filePath: string): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const lines = code.split(/\r?\n/);

    const push = (title: string, message: string, severity: Severity, line: number, guideline?: string, tags?: string[]) => {
      issues.push({
        id: `${path.basename(filePath)}:${line}:${title}`,
        filePath,
        title,
        message,
        severity,
        startLine: line,
        endLine: line,
        guideline,
        tags,
      });
    };

    // Simple heuristics
    lines.forEach((ln, idx) => {
      const lineNo = idx + 1;
      if (/console\.log\(|print\(|System\.out\.println\(/.test(ln)) {
        push('Debug logging', 'Remove debug logging before commit.', 'warning', lineNo, 'Guideline: Avoid debug logs in committed code', ['style']);
      }
      if (/eval\s*\(/.test(ln)) {
        push('Unsafe eval', 'Avoid eval; it can execute arbitrary code.', 'critical', lineNo, 'CWE-95: Improper Neutralization of Directives', ['security']);
      }
      if (/(password|api[_-]?key|secret)\s*[:=]\s*['\"][^'\"]+['\"]/i.test(ln)) {
        push('Hardcoded secret', 'Detected a hardcoded credential; move to secrets management.', 'critical', lineNo, 'OWASP: Sensitive Data Exposure', ['security']);
      }
      if (ln.length > 140) {
        push('Long line', 'Line exceeds 140 characters.', 'info', lineNo, 'PEP8/Eslint max-len', ['style']);
      }
    });

    if (/^\s*(def|function|class)\s+/m.test(code) && !/\"\"\"|\'\'\'|\/\*|\*\*/.test(code)) {
      issues.push({
        id: `${path.basename(filePath)}:1:docs`,
        filePath,
        title: 'Missing documentation',
        message: 'Consider adding docstrings or JSDoc for public functions/classes.',
        severity: 'info',
        startLine: 1,
        endLine: 1,
        guideline: 'Documentation standards',
        tags: ['docs'],
      });
    }

    return issues;
  }

  private async applyCustomRules(code: string, filePath: string): Promise<ReviewIssue[]> {
    try {
      const cfgFiles = await vscode.workspace.findFiles('code-review.config.json', '**/node_modules/**', 1);
      if (!cfgFiles.length) return [];
      const buf = await vscode.workspace.fs.readFile(cfgFiles[0]);
      const cfg = JSON.parse(Buffer.from(buf).toString('utf8')) as { patterns?: Array<{ name: string; regex: string; severity?: Severity; message?: string; guideline?: string; tags?: string[] }>; };
      const issues: ReviewIssue[] = [];
      if (cfg.patterns) {
        for (const p of cfg.patterns) {
          const re = new RegExp(p.regex, 'gm');
          let m: RegExpExecArray | null;
          while ((m = re.exec(code)) !== null) {
            const upto = code.substring(0, m.index);
            const line = (upto.match(/\n/g)?.length ?? 0) + 1;
            issues.push({
              id: `${path.basename(filePath)}:${line}:${p.name}`,
              filePath,
              title: p.name,
              message: p.message || `Matched pattern: ${p.regex}`,
              severity: p.severity || 'warning',
              startLine: line,
              endLine: line,
              guideline: p.guideline,
              tags: p.tags,
            });
          }
        }
      }
      return issues;
    } catch {
      return [];
    }
  }

  async reviewCode(code: string, languageId: string, filePath: string): Promise<ReviewResult> {
    const t0 = Date.now();
    const heuristic = this.runHeuristics(code, languageId, filePath);
    const custom = await this.applyCustomRules(code, filePath);
    
    // Language-specific analysis
    const analyzer = getAnalyzer(languageId);
    const langIssues: ReviewIssue[] = analyzer ? analyzer.analyze(code, filePath).map(r => ({
      id: `${path.basename(filePath)}:${r.line}:${r.title}`,
      filePath,
      ...r,
      startLine: r.line,
      endLine: r.line,
    })) : [];

    // Use LLM router for intelligent provider selection
    const system = 'You are a senior staff engineer performing code reviews. Provide concise, actionable findings with severity (info|warning|error|critical), rule references, and suggested fixes. Prefer bullet points.';
    const prompt = `Language: ${languageId}\nContext: File: ${filePath}\n--- CODE START ---\n${code.slice(0, 4000)}\n--- CODE END ---\n\nAnalyze for:\n- defects, bugs, and edge cases\n- security issues\n- performance or complexity problems\n- style and guideline violations (PEP8/Airbnb/etc.)\n- missing tests or docs\n\nReturn findings in Markdown.`;
    
    const { text: insights, usage } = await this.llmRouter.chat(prompt, system);

    // Convert AI markdown to a single summary; keep raw in result
    const effortMap: Record<Severity, string> = { info: '1-3 min', warning: '5-10 min', error: '10-20 min', critical: '20-40 min' };
    const issues = [...heuristic, ...custom, ...langIssues].map(i => ({ ...i, effort: i.effort ?? effortMap[i.severity] }));

    const metrics: ReviewMetrics = {
      total: issues.length,
      bySeverity: {
        info: issues.filter(i => i.severity === 'info').length,
        warning: issues.filter(i => i.severity === 'warning').length,
        error: issues.filter(i => i.severity === 'error').length,
        critical: issues.filter(i => i.severity === 'critical').length,
      },
      durationMs: Date.now() - t0 + (usage?.durationMs ?? 0),
      tokenUsage: usage,
    };

    // Extract documentation suggestions from AI insights
    const docSuggestions = this.extractDocSuggestions(insights, issues);

    return {
      summary: 'Automated review completed. See issues and AI insights below.',
      issues,
      metrics,
      rawAi: insights,
      providerUsed: usage.provider,
      docSuggestions,
    };
  }

  private extractDocSuggestions(aiInsights: string, issues: ReviewIssue[]): string[] {
    const suggestions: string[] = [];
    
    // Check for missing docstrings
    const docIssues = issues.filter(i => i.title.toLowerCase().includes('doc'));
    if (docIssues.length > 0) {
      suggestions.push('Add docstrings/JSDoc to public functions and classes');
    }
    
    // Parse AI insights for doc recommendations
    const lines = aiInsights.toLowerCase().split('\n');
    lines.forEach(line => {
      if (line.includes('document') || line.includes('comment') || line.includes('readme')) {
        if (line.length < 200) { // Keep suggestions concise
          suggestions.push(line.trim());
        }
      }
    });
    
    // Add README suggestion if code is complex
    if (issues.filter(i => i.severity === 'critical' || i.severity === 'error').length > 3) {
      suggestions.push('Consider adding a README with setup instructions and usage examples');
    }
    
    return [...new Set(suggestions)].slice(0, 5); // Dedupe and limit to 5
  }

  async reviewChanges(changes: FileChange[]): Promise<ReviewResult> {
    const t0 = Date.now();
    const combinedPatch = changes.map(c => `File: ${c.filePath}\n${c.patch}`).join('\n\n');
    
    // Use LLM router
    const system = 'You are a senior engineer reviewing git diffs. Identify issues in the changed code. Be concise and actionable.';
    const prompt = `Review these staged changes:\n\n${combinedPatch.slice(0, 6000)}\n\nIdentify issues, security concerns, bugs, and style violations.`;
    const { text: insights, usage } = await this.llmRouter.chat(prompt, system);

    // Heuristics on changed hunks only
    const issues: ReviewIssue[] = [];
    for (const ch of changes) {
      for (const h of ch.hunks) {
        const pseudoCode = h.content
          .split(/\n/)
          .filter(l => l.startsWith('+'))
          .map(l => l.slice(1))
          .join('\n');
        if (!pseudoCode.trim()) continue;
        issues.push(...this.runHeuristics(pseudoCode, 'diff', ch.filePath));
      }
    }

    const effortMap: Record<Severity, string> = { info: '1-3 min', warning: '5-10 min', error: '10-20 min', critical: '20-40 min' };
    const metrics: ReviewMetrics = {
      total: issues.length,
      bySeverity: {
        info: issues.filter(i => i.severity === 'info').length,
        warning: issues.filter(i => i.severity === 'warning').length,
        error: issues.filter(i => i.severity === 'error').length,
        critical: issues.filter(i => i.severity === 'critical').length,
      },
      durationMs: Date.now() - t0 + (usage?.durationMs ?? 0),
      tokenUsage: usage,
    };
    // attach effort to each issue
    issues.forEach(i => { (i as any).effort = (i as any).effort || effortMap[i.severity]; });

    return {
      summary: 'Incremental review of staged changes completed.',
      issues,
      metrics,
      rawAi: insights,
      providerUsed: usage.provider,
    };
  }
}
