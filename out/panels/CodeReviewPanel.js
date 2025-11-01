"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeReviewPanel = void 0;
const vscode = __importStar(require("vscode"));
class CodeReviewPanel {
    constructor(panel) {
        this.disposables = [];
        this.panel = panel;
    }
    static render(extensionUri, review, context, llmRouter) {
        const column = vscode.window.activeTextEditor?.viewColumn;
        if (CodeReviewPanel.currentPanel) {
            CodeReviewPanel.currentPanel.panel.reveal(column);
            CodeReviewPanel.currentPanel.update(review);
            return;
        }
        const panel = vscode.window.createWebviewPanel('aiCodeReviewPanel', 'AI Code Review', column ?? vscode.ViewColumn.Beside, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        CodeReviewPanel.currentPanel = new CodeReviewPanel(panel);
        CodeReviewPanel.currentPanel.update(review);
        panel.onDidDispose(() => CodeReviewPanel.currentPanel?.dispose());
        panel.webview.onDidReceiveMessage(async (message) => {
            if (!message)
                return;
            const { type, payload } = message;
            switch (type) {
                case 'applyFix': {
                    await vscode.commands.executeCommand('aiCodeReview.applyFix', payload);
                    break;
                }
                case 'copyInsights': {
                    await vscode.env.clipboard.writeText(review.rawAi ?? '');
                    vscode.window.showInformationMessage('AI insights copied to clipboard');
                    break;
                }
            }
        });
    }
    update(review) {
        this.panel.title = 'AI Code Review';
        this.panel.webview.html = this.getHtml(review);
    }
    getHtml(review) {
        const metrics = review.metrics;
        const issuesHtml = review.issues
            .map((i) => `
        <div class="issue ${i.severity}">
          <div class="issue-head">
            <div class="sev ${i.severity}">${i.severity.toUpperCase()}</div>
            <div class="title">${escapeHtml(i.title)}</div>
          </div>
          <div class="body">
            <div class="path">${escapeHtml(i.filePath)}:${i.startLine}-${i.endLine}</div>
            <div class="msg">${escapeHtml(i.message)}</div>
            ${i.guideline ? `<div class="guideline">${escapeHtml(i.guideline)}</div>` : ''}
            <div class="actions">
              <button class="btn" data-action="applyFix" data-file="${encodeURIComponent(i.filePath)}" data-start="${i.startLine}" data-end="${i.endLine}" data-msg="${encodeURIComponent(i.message)}">Apply Fix</button>
            </div>
          </div>
        </div>
      `)
            .join('\n');
        const aiHtml = review.rawAi ? `<pre class="ai">${escapeHtml(review.rawAi)}</pre>` : '';
        return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>AI Code Review</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 0; padding: 0; }
  header { padding: 12px 16px; background: var(--vscode-editor-background); border-bottom: 1px solid var(--vscode-editorWidget-border); position: sticky; top: 0; }
  .row { display: flex; gap: 16px; padding: 12px 16px; }
  .card { flex: 1; padding: 12px; border: 1px solid var(--vscode-editorWidget-border); border-radius: 6px; background: var(--vscode-editor-background); }
  .metric { font-size: 12px; color: var(--vscode-descriptionForeground); }
  .metric .num { font-size: 20px; color: var(--vscode-foreground); }
  .issues { padding: 8px 16px 24px; }
  .issue { border: 1px solid var(--vscode-editorWidget-border); border-radius: 8px; margin-bottom: 10px; overflow: hidden; }
  .issue-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--vscode-editor-background); border-bottom: 1px dashed var(--vscode-editorWidget-border); }
  .sev { font-size: 11px; padding: 2px 6px; border-radius: 10px; }
  .sev.info { background: #e5f6ff; color: #055160; }
  .sev.warning { background: #fff4e5; color: #663c00; }
  .sev.error { background: #fdecea; color: #611a15; }
  .sev.critical { background: #ffebee; color: #b71c1c; }
  .issue .body { padding: 10px 12px; }
  .issue .path { color: var(--vscode-descriptionForeground); font-size: 12px; margin-bottom: 6px; }
  .issue .msg { margin-bottom: 6px; white-space: pre-wrap; }
  .issue .guideline { font-size: 12px; color: var(--vscode-descriptionForeground); margin-bottom: 8px; }
  .btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; }
  .btn:hover { filter: brightness(1.1); }
  .ai { white-space: pre-wrap; border: 1px solid var(--vscode-editorWidget-border); padding: 10px; border-radius: 6px; }
</style>
</head>
<body>
  <header>
    <strong>AI Code Review</strong>
    <div>${escapeHtml(review.summary)}</div>
  </header>
  <div class="row">
    <div class="card">
      <div class="metric">Total Issues</div>
      <div class="num metric">${metrics.total}</div>
    </div>
    <div class="card">
      <div class="metric">Severity</div>
      <div class="metric">INFO: ${metrics.bySeverity.info} • WARN: ${metrics.bySeverity.warning} • ERR: ${metrics.bySeverity.error} • CRIT: ${metrics.bySeverity.critical}</div>
    </div>
    <div class="card">
      <div class="metric">Performance</div>
      <div class="metric">${(metrics.durationMs / 1000).toFixed(1)}s • ${metrics.tokenUsage?.promptTokens ? `${(metrics.tokenUsage.promptTokens ?? 0) + (metrics.tokenUsage.responseTokens ?? 0)} tokens` : `~${metrics.tokenUsage ? (metrics.tokenUsage.promptChars + metrics.tokenUsage.responseChars) : 0} chars`}</div>
    </div>
    <div class="card">
      <div class="metric">Provider</div>
      <div class="metric">${escapeHtml(review.providerUsed || 'unknown')}${metrics.tokenUsage?.cost ? ` • $${metrics.tokenUsage.cost.toFixed(4)}` : ' • FREE'}</div>
    </div>
    <div class="card">
      <button id="copyInsights" class="btn">Copy AI Insights</button>
    </div>
  </div>

  <section class="issues">${issuesHtml}</section>
  ${aiHtml}
  ${review.docSuggestions && review.docSuggestions.length > 0 ? `
  <section style="padding: 8px 16px 24px;">
    <h3 style="margin: 16px 0 8px; color: var(--vscode-foreground);">📝 Documentation Suggestions</h3>
    <ul style="margin: 0; padding-left: 24px;">
      ${review.docSuggestions.map(s => `<li style="margin: 6px 0;">${escapeHtml(s)}</li>`).join('')}
    </ul>
  </section>
  ` : ''}

  <script>
    const vscode = acquireVsCodeApi();
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.matches('button[data-action="applyFix"]')) {
        const filePath = decodeURIComponent(t.getAttribute('data-file'));
        const startLine = parseInt(t.getAttribute('data-start'));
        const endLine = parseInt(t.getAttribute('data-end'));
        const message = decodeURIComponent(t.getAttribute('data-msg'));
        vscode.postMessage({ type: 'applyFix', payload: { filePath, startLine, endLine, message } });
      }
    });
    document.getElementById('copyInsights')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'copyInsights' });
    });
  </script>
</body>
</html>
    `;
    }
    dispose() {
        CodeReviewPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}
exports.CodeReviewPanel = CodeReviewPanel;
function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
//# sourceMappingURL=CodeReviewPanel.js.map