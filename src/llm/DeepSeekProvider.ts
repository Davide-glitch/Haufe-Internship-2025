import axios from 'axios';
import { LLMProvider, LLMUsage } from './types';

export class DeepSeekProvider implements LLMProvider {
  name = 'DeepSeek Coder';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = 'deepseek-coder') {
    this.apiKey = apiKey || process.env.DEEPSEEK_API_KEY || '';
    this.model = model;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async chat(prompt: string, system?: string): Promise<{ text: string; usage: LLMUsage }> {
    const start = Date.now();
    const body = {
      model: this.model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    };

    const res = await axios.post('https://api.deepseek.com/v1/chat/completions', body, {
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      timeout: 60000,
    });

    const text: string = res.data?.choices?.[0]?.message?.content ?? '';
    const promptTokens = res.data?.usage?.prompt_tokens ?? 0;
    const responseTokens = res.data?.usage?.completion_tokens ?? 0;
    
    // DeepSeek pricing: ~$0.14/$0.28 per 1M tokens
    const cost = (promptTokens * 0.14 + responseTokens * 0.28) / 1_000_000;

    const usage: LLMUsage = {
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

  async generateFix(codeSnippet: string, issue: string, languageId: string): Promise<string | null> {
    const system = 'You are a code fixer specialized in software engineering. Return ONLY the corrected code without explanations.';
    const prompt = `Language: ${languageId}\nIssue: ${issue}\n\nCode:\n${codeSnippet}\n\nFixed code:`;
    try {
      const { text } = await this.chat(prompt, system);
      return text.replace(/```[\w]*\n?/g, '').trim() || null;
    } catch {
      return null;
    }
  }
}
