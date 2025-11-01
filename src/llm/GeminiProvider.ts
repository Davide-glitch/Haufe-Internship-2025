import axios from 'axios';
import { LLMProvider, LLMUsage } from './types';

export class GeminiProvider implements LLMProvider {
  name = 'Google Gemini';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = 'gemini-1.5-flash') {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    this.model = model;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async chat(prompt: string, system?: string): Promise<{ text: string; usage: LLMUsage }> {
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
    const res = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
    });

    const text: string = res.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const promptTokens = res.data?.usageMetadata?.promptTokenCount ?? 0;
    const responseTokens = res.data?.usageMetadata?.candidatesTokenCount ?? 0;
    
    // Gemini Flash pricing: $0.075/$0.30 per 1M tokens
    const cost = (promptTokens * 0.075 + responseTokens * 0.30) / 1_000_000;

    const usage: LLMUsage = {
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

  async generateFix(codeSnippet: string, issue: string, languageId: string): Promise<string | null> {
    const system = 'You are a senior software engineer fixing code issues. Return ONLY the corrected code snippet.';
    const prompt = `Language: ${languageId}\nIssue: ${issue}\n\nCode to fix:\n${codeSnippet}\n\nProvide the fixed code only, no explanations:`;
    try {
      const { text } = await this.chat(prompt, system);
      return text.replace(/```[\w]*\n?/g, '').trim() || null;
    } catch {
      return null;
    }
  }
}
