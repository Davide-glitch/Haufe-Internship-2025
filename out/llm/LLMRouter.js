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
exports.LLMRouter = void 0;
const vscode = __importStar(require("vscode"));
const OllamaProvider_1 = require("./OllamaProvider");
const OpenAIProvider_1 = require("./OpenAIProvider");
const DeepSeekProvider_1 = require("./DeepSeekProvider");
const GeminiProvider_1 = require("./GeminiProvider");
/**
 * Intelligent LLM Router
 * - Tries providers in order of priority
 * - Falls back automatically if one fails
 * - Tracks costs and usage
 * - Prefers local (free) over cloud (paid)
 */
class LLMRouter {
    constructor() {
        this.providers = new Map();
        this.availableProviders = [];
        this.totalCost = 0;
        this.requestCount = 0;
        this.initializeProviders();
    }
    initializeProviders() {
        // Register all providers
        this.providers.set('ollama', new OllamaProvider_1.OllamaProvider(this.getModelConfig('ollama')));
        this.providers.set('deepseek', new DeepSeekProvider_1.DeepSeekProvider());
        this.providers.set('openai', new OpenAIProvider_1.OpenAIProvider());
        this.providers.set('gemini', new GeminiProvider_1.GeminiProvider());
    }
    getModelConfig(provider) {
        const config = vscode.workspace.getConfiguration('aiCodeReview');
        return config.get(`${provider}.model`) || this.getDefaultModel(provider);
    }
    getDefaultModel(provider) {
        const defaults = {
            ollama: 'qwen2.5-coder:7b',
            deepseek: 'deepseek-coder',
            openai: 'gpt-4o-mini',
            gemini: 'gemini-1.5-flash',
        };
        return defaults[provider];
    }
    /**
     * Check which providers are available
     */
    async discoverProviders() {
        const config = vscode.workspace.getConfiguration('aiCodeReview');
        const preferLocal = config.get('preferLocalLLM', true);
        // Priority order: local first (if preferred), then cloud
        const priorities = preferLocal
            ? ['ollama', 'deepseek', 'openai', 'gemini']
            : ['deepseek', 'openai', 'gemini', 'ollama'];
        this.availableProviders = [];
        for (const type of priorities) {
            const provider = this.providers.get(type);
            if (provider && await provider.isAvailable()) {
                this.availableProviders.push(type);
            }
        }
        return this.availableProviders;
    }
    /**
     * Smart routing: try providers in priority order
     */
    async chat(prompt, system) {
        if (this.availableProviders.length === 0) {
            await this.discoverProviders();
        }
        if (this.availableProviders.length === 0) {
            throw new Error('No LLM providers available. Install Ollama or configure API keys.');
        }
        let lastError = null;
        for (const type of this.availableProviders) {
            const provider = this.providers.get(type);
            if (!provider)
                continue;
            try {
                const result = await provider.chat(prompt, system);
                this.requestCount++;
                if (result.usage.cost) {
                    this.totalCost += result.usage.cost;
                }
                return result;
            }
            catch (error) {
                lastError = error;
                console.warn(`Provider ${type} failed, trying next...`, error.message);
                continue;
            }
        }
        throw lastError || new Error('All providers failed');
    }
    async generateFix(codeSnippet, issue, languageId) {
        if (this.availableProviders.length === 0) {
            await this.discoverProviders();
        }
        for (const type of this.availableProviders) {
            const provider = this.providers.get(type);
            if (!provider)
                continue;
            try {
                return await provider.generateFix(codeSnippet, issue, languageId);
            }
            catch {
                continue;
            }
        }
        return null;
    }
    getStats() {
        return {
            availableProviders: this.availableProviders,
            totalCost: this.totalCost,
            requestCount: this.requestCount,
        };
    }
    resetStats() {
        this.totalCost = 0;
        this.requestCount = 0;
    }
}
exports.LLMRouter = LLMRouter;
//# sourceMappingURL=LLMRouter.js.map