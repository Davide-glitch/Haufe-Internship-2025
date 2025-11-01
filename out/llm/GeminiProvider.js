"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
const axios_1 = __importDefault(require("axios"));
class GeminiProvider {
    constructor(apiKey, model = 'gemini-1.5-flash') {
        this.name = 'Google Gemini';
        this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
        this.model = model;
    }
    async isAvailable() {
        return !!this.apiKey;
    }
    async chat(prompt, system) {
        const start = Date.now();
        const body = {
            contents: [{
                    parts: [{
                            text: system ? `${system}\n\n${prompt}` : prompt
                        }]
                }],
            generationConfig: {
                temperature: 0.3,
            }
        };
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        const res = await axios_1.default.post(url, body, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000,
        });
        const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const promptTokens = res.data?.usageMetadata?.promptTokenCount ?? 0;
        const responseTokens = res.data?.usageMetadata?.candidatesTokenCount ?? 0;
        // Gemini Flash pricing: $0.075/$0.30 per 1M tokens
        const cost = (promptTokens * 0.075 + responseTokens * 0.30) / 1000000;
        const usage = {
            promptTokens,
            responseTokens,
            promptChars: prompt.length + (system?.length ?? 0),
            responseChars: text.length,
            durationMs: Date.now() - start,
            provider: 'gemini',
            cost,
        };
        return { text, usage };
    }
    async generateFix(codeSnippet, issue, languageId) {
        const system = 'You are a senior software engineer fixing code issues. Return ONLY the corrected code snippet.';
        const prompt = `Language: ${languageId}\nIssue: ${issue}\n\nCode to fix:\n${codeSnippet}\n\nProvide the fixed code only, no explanations:`;
        try {
            const { text } = await this.chat(prompt, system);
            return text.replace(/```[\w]*\n?/g, '').trim() || null;
        }
        catch {
            return null;
        }
    }
}
exports.GeminiProvider = GeminiProvider;
//# sourceMappingURL=GeminiProvider.js.map