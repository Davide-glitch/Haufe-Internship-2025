// Base interface for all LLM providers
export interface LLMProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  chat(prompt: string, system?: string): Promise<{ text: string; usage: LLMUsage }>;
  generateFix(codeSnippet: string, issue: string, languageId: string): Promise<string | null>;
}

export interface LLMUsage {
  promptTokens?: number;
  responseTokens?: number;
  promptChars: number;
  responseChars: number;
  durationMs: number;
  cost?: number;
  provider: string;
}

export type ProviderType = 'ollama' | 'openai' | 'deepseek' | 'gemini';

export interface ProviderConfig {
  enabled: boolean;
  priority: number; // Lower = higher priority
  apiKey?: string;
  model?: string;
}
