"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const axios_1 = __importDefault(require("axios"));
class OpenAIProvider {
    constructor(apiKey, model = 'gpt-4o-mini') {
        this.name = 'OpenAI GPT-4';
        this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
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
        const res = await axios_1.default.post('https://api.openai.com/v1/chat/completions', body, {
            headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
            timeout: 60000,
        });
        const text = res.data?.choices?.[0]?.message?.content ?? '';
        const promptTokens = res.data?.usage?.prompt_tokens ?? 0;
        const responseTokens = res.data?.usage?.completion_tokens ?? 0;
        // Cost estimation: gpt-4o-mini is ~$0.15/$0.60 per 1M tokens
        const cost = (promptTokens * 0.15 + responseTokens * 0.60) / 1000000;
        const usage = {
            promptTokens,
            responseTokens,
            promptChars: prompt.length + (system?.length ?? 0),
            responseChars: text.length,
            durationMs: Date.now() - start,
            provider: 'openai',
            cost,
        };
        return { text, usage };
    }
    async generateFix(codeSnippet, issue, languageId) {
        const system = 'You are a code fixer. Return ONLY the corrected code snippet without explanations, markdown, or commentary.';
        const prompt = `Language: ${languageId}\nIssue: ${issue}\n\nOriginal code:\n\`\`\`\n${codeSnippet}\n\`\`\`\n\nReturn the fixed code only.`;
        try {
            const { text } = await this.chat(prompt, system);
            return text.replace(/```[\w]*\n?/g, '').trim() || null;
        }
        catch {
            return null;
        }
    }
}
exports.OpenAIProvider = OpenAIProvider;
//# sourceMappingURL=OpenAIProvider.js.map