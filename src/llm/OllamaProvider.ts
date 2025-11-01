import axios from 'axios';
import { LLMProvider, LLMUsage } from './types';

export class OllamaProvider implements LLMProvider {
  name = 'Ollama (Local)';
  private baseUrl = 'http://127.0.0.1:11434';
  private model: string;

  constructor(model: string = 'qwen2.5-coder:7b') {
    this.model = model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 2000 });
      const models = res.data?.models || [];
      return models.some((m: any) => m.name === this.model);
    } catch {
      return false;
    }
  }

  async chat(prompt: string, system?: string): Promise<{ text: string; usage: LLMUsage }> {
    const start = Date.now();
    const body = {
      model: this.model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
      stream: false,
    };

    const res = await axios.post(`${this.baseUrl}/api/chat`, body, { timeout: 120000 });
    const text: string = res.data?.message?.content ?? res.data?.response ?? '';
    
    const usage: LLMUsage = {
      promptChars: JSON.stringify(body).length,
      responseChars: text.length,
      durationMs: Date.now() - start,
      provider: 'ollama',
      cost: 0, // Local = free!
    };
    return { text, usage };
  }

  async generateFix(codeSnippet: string, issue: string, languageId: string): Promise<string | null> {
    const system = 'You generate minimal diff-style fixes. Return only the replacement code without explanations.';
    const prompt = `Language: ${languageId}\nIssue: ${issue}\nProblematic snippet:\n\n${codeSnippet}\n\nProvide a fixed snippet only.`;
    try {
      const { text } = await this.chat(prompt, system);
      return text?.trim() || null;
    } catch {
      return null;
    }
  }
}
