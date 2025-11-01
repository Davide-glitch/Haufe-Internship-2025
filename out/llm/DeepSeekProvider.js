"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepSeekProvider = void 0;
const axios_1 = __importDefault(require("axios"));
class DeepSeekProvider {
    constructor(apiKey, model = 'deepseek-coder') {
        this.name = 'DeepSeek Coder';
        this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY || '';
        this.model = model;
    }
    async isAvailable() {
        return !!this.apiKey;
    }
    async chat(prompt, system) {
        const start = Date.now();
        const body = {
            model: this.model,
            messages: [
                ...(system ? [{ role: 'system', content: system }] : []),
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
        };
        const res = await axios_1.default.post('https://api.deepseek.com/v1/chat/completions', body, {
            headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
            timeout: 60000,
        });
        const text = res.data?.choices?.[0]?.message?.content ?? '';
        const promptTokens = res.data?.usage?.prompt_tokens ?? 0;
        const responseTokens = res.data?.usage?.completion_tokens ?? 0;
        // DeepSeek pricing: ~$0.14/$0.28 per 1M tokens
        const cost = (promptTokens * 0.14 + responseTokens * 0.28) / 1000000;
        const usage = {
            promptTokens,
            responseTokens,
            promptChars: prompt.length + (system?.length ?? 0),
            responseChars: text.length,
            durationMs: Date.now() - start,
            provider: 'deepseek',
            cost,
        };
        return { text, usage };
    }
    async generateFix(codeSnippet, issue, languageId) {
        const system = 'You are a code fixer specialized in software engineering. Return ONLY the corrected code without explanations.';
        const prompt = `Language: ${languageId}\nIssue: ${issue}\n\nCode:\n${codeSnippet}\n\nFixed code:`;
        try {
            const { text } = await this.chat(prompt, system);
            return text.replace(/```[\w]*\n?/g, '').trim() || null;
        }
        catch {
            return null;
        }
    }
}
exports.DeepSeekProvider = DeepSeekProvider;
//# sourceMappingURL=DeepSeekProvider.js.map