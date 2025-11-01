"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
const axios_1 = __importDefault(require("axios"));
class OllamaProvider {
    constructor(model = 'qwen2.5-coder:7b') {
        this.name = 'Ollama (Local)';
        this.baseUrl = 'http://127.0.0.1:11434';
        this.model = model;
    }
    async isAvailable() {
        try {
            const res = await axios_1.default.get(`${this.baseUrl}/api/tags`, { timeout: 2000 });
            const models = res.data?.models || [];
            return models.some((m) => m.name === this.model);
        }
        catch {
            return false;
        }
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
            provider: 'ollama',
            cost: 0, // Local = free!
        };
        return { text, usage };
    }
    async generateFix(codeSnippet, issue, languageId) {
        const system = 'You generate minimal diff-style fixes. Return only the replacement code without explanations.';
        const prompt = `Language: ${languageId}\nIssue: ${issue}\nProblematic snippet:\n\n${codeSnippet}\n\nProvide a fixed snippet only.`;
        try {
            const { text } = await this.chat(prompt, system);
            return text?.trim() || null;
        }
        catch {
            return null;
        }
    }
}
exports.OllamaProvider = OllamaProvider;
//# sourceMappingURL=OllamaProvider.js.map