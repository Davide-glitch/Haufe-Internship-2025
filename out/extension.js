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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const CodeReviewPanel_1 = require("./panels/CodeReviewPanel");
const ReviewManager_1 = require("./services/ReviewManager");
const LLMRouter_1 = require("./llm/LLMRouter");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
function activate(context) {
    const reviewManager = new ReviewManager_1.ReviewManager(context);
    const llmRouter = new LLMRouter_1.LLMRouter();
    let promptPanel;
    const API_BASE = process.env.AI_REVIEW_API || 'http://localhost:7070';
    const openQuickPrompt = (preserveFocus = true) => {
        if (promptPanel) {
            try {
                promptPanel.reveal(vscode.ViewColumn.Two, preserveFocus);
            }
            catch { }
            return;
        }
        promptPanel = vscode.window.createWebviewPanel('aiQuickPrompt', 'AI Quick Prompt', { viewColumn: vscode.ViewColumn.Two, preserveFocus }, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        const getHtml = () => {
            const csp = `default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src https: http:`;
            return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="${csp}" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>AI Quick Prompt</title>
        <style>
          body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 0; padding: 16px; color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); }
          .wrap { max-width: 920px; margin: 0 auto; }
          h2 { margin: 0 0 12px 0; font-size: 16px; color: var(--vscode-foreground); }
          .row { display: flex; gap: 8px; align-items: center; margin: 8px 0; }
          select { background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 6px 8px; border-radius: 4px; }
          textarea { width: 100%; min-height: 140px; resize: vertical; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 6px; padding: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
          button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; }
          button:hover { filter: brightness(1.05); }
          .muted { opacity: .8; font-size: 12px; }
          .out { margin-top: 12px; border: 1px solid var(--vscode-input-border); border-radius: 6px; padding: 10px; white-space: pre-wrap; background: rgba(127,127,127,0.07); }
          .status { margin-left: 8px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h2>Ask AI (paste code or describe your problem)</h2>
          <div class="row">
            <label class="muted">Current Model:</label>
            <select id="model"></select>
            <span id="health" class="status muted">Checking API…</span>
          </div>
          <textarea id="prompt" placeholder="Paste code or write a question…"></textarea>
          <div class="row">
            <button id="run">Review</button>
            <button id="clear" class="muted" style="background:transparent;border:1px solid var(--vscode-input-border);">Clear</button>
          </div>
          <div id="out" class="out" style="display:none;"></div>
        </div>
        <script>
          const vscode = acquireVsCodeApi();
          const el = (id) => document.getElementById(id);
          const out = el('out');
          const btn = el('run');
          const model = el('model');
          const txt = el('prompt');
          const health = el('health');

          window.addEventListener('message', (ev) => {
            const msg = ev.data || {};
            if (msg.type === 'health') {
              health.textContent = msg.ok ? 'API: OK' : 'API: OFFLINE';
              health.style.color = msg.ok ? 'var(--vscode-debugIcon-startForeground)' : 'var(--vscode-editorError-foreground)';
              if (msg.models && Array.isArray(msg.models)) {
                model.innerHTML = '';
                (msg.models.length ? msg.models : [msg.model]).forEach((m) => {
                  const opt = document.createElement('option');
                  opt.value = m; opt.textContent = m; model.appendChild(opt);
                });
                if (msg.model) model.value = msg.model;
              }
            }
            if (msg.type === 'result') {
              out.style.display = 'block';
              out.textContent = msg.text || '';
              btn.disabled = false; btn.textContent = 'Review';
            }
            if (msg.type === 'error') {
              out.style.display = 'block';
              out.textContent = 'Error: ' + (msg.message || 'Unknown error');
              btn.disabled = false; btn.textContent = 'Review';
            }
          });

          el('clear').onclick = () => { out.style.display='none'; out.textContent=''; txt.value=''; };
          btn.onclick = () => {
            const code = (txt.value || '').trim();
            if (!code) { out.style.display='block'; out.textContent='Please enter some code or a question.'; return; }
            btn.disabled = true; btn.textContent = 'Reviewing…';
            vscode.postMessage({ type: 'review', code, language: 'python', model: model.value });
          };
        </script>
      </body>
      </html>`;
        };
        promptPanel.webview.html = getHtml();
        const checkHealth = async () => {
            try {
                const r = await axios_1.default.get(`${API_BASE}/health`, { timeout: 3000 });
                promptPanel?.webview.postMessage({ type: 'health', ok: !!r.data?.ok, model: r.data?.model, models: r.data?.models });
            }
            catch {
                promptPanel?.webview.postMessage({ type: 'health', ok: false });
            }
        };
        checkHealth();
        promptPanel.webview.onDidReceiveMessage(async (message) => {
            if (!message)
                return;
            if (message.type === 'review') {
                try {
                    const { code, language, model } = message;
                    const r = await axios_1.default.post(`${API_BASE}/api/review`, { code, language, model }, { timeout: 60000 });
                    const text = r.data?.raw || JSON.stringify(r.data, null, 2);
                    promptPanel?.webview.postMessage({ type: 'result', text });
                }
                catch (e) {
                    promptPanel?.webview.postMessage({ type: 'error', message: e?.message || String(e) });
                }
            }
        });
        promptPanel.onDidDispose(() => { promptPanel = undefined; });
    };
    // Command: Review Current File
    const reviewFileCommand = vscode.commands.registerCommand('aiCodeReview.reviewFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active file to review');
            return;
        }
        const document = editor.document;
        const code = document.getText();
        const language = document.languageId;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'AI Code Review: Analyzing current file…',
            cancellable: true,
        }, async (progress, token) => {
            try {
                progress.report({ increment: 5 });
                const review = await reviewManager.reviewCode(code, language, document.fileName);
                CodeReviewPanel_1.CodeReviewPanel.render(context.extensionUri, review, context, llmRouter);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Review failed: ${error?.message ?? error}`);
            }
        });
    });
    // Command: Open Quick Prompt
    const openPromptCommand = vscode.commands.registerCommand('aiCodeReview.openPrompt', async () => {
        openQuickPrompt(false);
    });
    // Command: Open Web UI in external browser (optional)
    const openWebUICommand = vscode.commands.registerCommand('aiCodeReview.openWebUI', async () => {
        try {
            await vscode.env.openExternal(vscode.Uri.parse('http://localhost:5173'));
        }
        catch (e) {
            vscode.window.showErrorMessage('Failed to open Web UI');
        }
    });
    // Command: Review Git Changes (Incremental)
    const reviewChangesCommand = vscode.commands.registerCommand('aiCodeReview.reviewChanges', async () => {
        try {
            const changes = await reviewManager.getGitDiff();
            if (!changes || changes.length === 0) {
                vscode.window.showInformationMessage('No staged changes to review. Stage your changes first.');
                return;
            }
            const review = await reviewManager.reviewChanges(changes);
            CodeReviewPanel_1.CodeReviewPanel.render(context.extensionUri, review, context, llmRouter);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to review changes: ${error?.message ?? error}`);
        }
    });
    // Command: Apply Fix from Webview request
    const applyFixCommand = vscode.commands.registerCommand('aiCodeReview.applyFix', async (args) => {
        try {
            if (!args)
                return;
            const { filePath, startLine, endLine, message, languageId } = args;
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
            const editor = await vscode.window.showTextDocument(doc);
            const start = new vscode.Position(Math.max(0, startLine - 1), 0);
            const end = new vscode.Position(Math.max(0, endLine - 1), doc.lineAt(Math.max(0, endLine - 1)).text.length);
            const range = new vscode.Range(start, end);
            const original = doc.getText(range);
            const fix = await llmRouter.generateFix(original, message, languageId ?? doc.languageId);
            if (fix && editor) {
                await editor.edit((builder) => builder.replace(range, fix));
                vscode.window.showInformationMessage('Applied AI fix.');
            }
            else {
                vscode.window.showWarningMessage('No fix generated.');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to apply fix: ${error?.message ?? error}`);
        }
    });
    // Command: Install Git pre-commit hook
    const installHookCommand = vscode.commands.registerCommand('aiCodeReview.installPreCommitHook', async () => {
        try {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!root) {
                vscode.window.showErrorMessage('Open a folder before installing the hook.');
                return;
            }
            const gitDir = path.join(root, '.git');
            if (!fs.existsSync(gitDir)) {
                vscode.window.showErrorMessage('No .git directory found. Initialize git first.');
                return;
            }
            const hooksDir = path.join(gitDir, 'hooks');
            if (!fs.existsSync(hooksDir))
                fs.mkdirSync(hooksDir);
            const hookPath = path.join(hooksDir, 'pre-commit');
            const script = `#!/bin/sh\n# AI Code Review pre-commit hook\n# Reviews staged changes and warns on high severity issues.\nnode \\"$PWD/out/cli/review-cli.js\\" --staged || {\n  echo \"AI review found critical issues. Commit aborted.\";\n  exit 1;\n}\n`;
            fs.writeFileSync(hookPath, script, { encoding: 'utf8' });
            try {
                fs.chmodSync(hookPath, 0o755);
            }
            catch { }
            vscode.window.showInformationMessage('Installed AI pre-commit hook to .git/hooks/pre-commit');
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to install pre-commit hook: ${error?.message ?? error}`);
        }
    });
    // Status Bar Item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(check) AI Review';
    statusBarItem.command = 'aiCodeReview.reviewFile';
    statusBarItem.tooltip = 'Click to review current file';
    statusBarItem.show();
    context.subscriptions.push(reviewFileCommand, reviewChangesCommand, applyFixCommand, installHookCommand, openPromptCommand, openWebUICommand, statusBarItem);
    // Auto-run review on startup and when switching/opening supported files
    try {
        const config = vscode.workspace.getConfiguration('aiCodeReview');
        const autoRun = config.get('autoRunOnStartup', true);
        const reviewed = new WeakSet();
        const isSupported = (doc) => {
            if (!doc)
                return false;
            const lang = doc.languageId;
            return lang === 'python' || lang === 'javascript' || lang === 'typescript';
        };
        const runAuto = async (doc) => {
            if (!autoRun)
                return;
            const target = doc ?? vscode.window.activeTextEditor?.document;
            if (!target || !isSupported(target))
                return;
            if (reviewed.has(target))
                return;
            reviewed.add(target);
            try {
                await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'AI Code Review (auto)…', cancellable: false }, async () => {
                    const code = target.getText();
                    const language = target.languageId;
                    const review = await reviewManager.reviewCode(code, language, target.fileName);
                    CodeReviewPanel_1.CodeReviewPanel.render(context.extensionUri, review, context, llmRouter);
                });
            }
            catch (e) {
                console.warn('Auto review failed', e);
            }
        };
        // Trigger once after activation (small delay so active editor is ready)
        setTimeout(() => {
            runAuto();
            // Also open Quick Prompt so there's always a place to paste code/questions
            openQuickPrompt(true);
        }, 500);
        // When opening a new document
        context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((d) => {
            if (isSupported(d))
                setTimeout(() => runAuto(d), 200);
        }));
        // When switching editors
        context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((ed) => {
            if (ed && isSupported(ed.document))
                setTimeout(() => runAuto(ed.document), 200);
        }));
    }
    catch (e) {
        console.warn('Failed to setup auto-run', e);
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map