import * as vscode from 'vscode';
import { LLMProvider, LLMUsage, ProviderType } from './types';
import { OllamaProvider } from './OllamaProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { DeepSeekProvider } from './DeepSeekProvider';
import { GeminiProvider } from './GeminiProvider';

/**
 * Intelligent LLM Router
 * - Tries providers in order of priority
 * - Falls back automatically if one fails
 * - Tracks costs and usage
 * - Prefers local (free) over cloud (paid)
 */
export class LLMRouter {
  private providers: Map<ProviderType, LLMProvider> = new Map();
  private availableProviders: ProviderType[] = [];
  private totalCost = 0;
  private requestCount = 0;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Register all providers
    this.providers.set('ollama', new OllamaProvider(this.getModelConfig('ollama')));
    this.providers.set('deepseek', new DeepSeekProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('gemini', new GeminiProvider());
  }

  private getModelConfig(provider: ProviderType): string {
    const config = vscode.workspace.getConfiguration('aiCodeReview');
    return config.get(`${provider}.model`) || this.getDefaultModel(provider);
  }

  private getDefaultModel(provider: ProviderType): string {
    const defaults: Record<ProviderType, string> = {
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
  async discoverProviders(): Promise<ProviderType[]> {
    const config = vscode.workspace.getConfiguration('aiCodeReview');
    const preferLocal = config.get('preferLocalLLM', true);

    // Priority order: local first (if preferred), then cloud
    const priorities: ProviderType[] = preferLocal
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
  async chat(prompt: string, system?: string): Promise<{ text: string; usage: LLMUsage }> {
    if (this.availableProviders.length === 0) {
      await this.discoverProviders();
    }

    if (this.availableProviders.length === 0) {
      throw new Error('No LLM providers available. Install Ollama or configure API keys.');
    }

    let lastError: Error | null = null;

    for (const type of this.availableProviders) {
      const provider = this.providers.get(type);
      if (!provider) continue;

      try {
        const result = await provider.chat(prompt, system);
        this.requestCount++;
        if (result.usage.cost) {
          this.totalCost += result.usage.cost;
        }
        return result;
      } catch (error: any) {
        lastError = error;
        console.warn(`Provider ${type} failed, trying next...`, error.message);
        continue;
      }
    }

    throw lastError || new Error('All providers failed');
  }

  async generateFix(codeSnippet: string, issue: string, languageId: string): Promise<string | null> {
    if (this.availableProviders.length === 0) {
      await this.discoverProviders();
    }

    for (const type of this.availableProviders) {
      const provider = this.providers.get(type);
      if (!provider) continue;

      try {
        return await provider.generateFix(codeSnippet, issue, languageId);
      } catch {
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
