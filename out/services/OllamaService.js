"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaService = void 0;
const axios_1 = __importDefault(require("axios"));
class OllamaService {
    constructor() {
        this.baseUrl = 'http://127.0.0.1:11434';
        this.model = process.env.AI_REVIEW_MODEL || 'deepseek-coder:6.7b';
    }
    async chat(prompt, system) {
        const start = Date.now();
        const body = {
            model: this.model,
            messages: [
                ...(system ? [{ role: 'system', content: system }] : []),
                { role: 'user', content: prompt },
            ],
            stream: false,
        };
        const res = await axios_1.default.post(`${this.baseUrl}/api/chat`, body, { timeout: 120000 });
        const text = res.data?.message?.content ?? res.data?.response ?? '';
        const usage = {
            promptChars: JSON.stringify(body).length,
            responseChars: text.length,
            durationMs: Date.now() - start,
        };
        return { text, usage };
    }
    async analyzeCode(code, languageId, context) {
        const system = 'You are a senior staff engineer performing code reviews. Provide concise, actionable findings with severity (info|warning|error|critical), rule references, and suggested fixes. Prefer bullet points.';
        const prompt = `Language: ${languageId}\nContext: ${context}\n--- CODE START ---\n${code}\n--- CODE END ---\n\nAnalyze for:\n- defects, bugs, and edge cases\n- security issues\n- performance or complexity problems\n- style and guideline violations (PEP8/Airbnb/etc.)\n- missing tests or docs\n\nReturn findings in Markdown.`;
        const { text, usage } = await this.chat(prompt, system);
        return { insights: text, usage };
    }
    async generateFix(codeSnippet, issue, languageId) {
        const system = 'You generate minimal diff-style fixes that replace only the given snippet with an improved version. Return only the replacement code without explanations.';
        const prompt = `Language: ${languageId}\nIssue: ${issue}\nProblematic snippet:\n\n${codeSnippet}\n\nProvide a fixed snippet only.`;
        try {
            const { text } = await this.chat(prompt, system);
            return text?.trim() || null;
        }
        catch (e) {
            return null;
        }
    }
}
exports.OllamaService = OllamaService;
//# sourceMappingURL=OllamaService.js.map