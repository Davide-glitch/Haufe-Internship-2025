import axios from 'axios';
import { LLMProvider, LLMUsage } from './types';

export class OpenAIProvider implements LLMProvider {
  name = 'OpenAI GPT-4';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = 'gpt-4o-mini') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
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

    const res = await axios.post('https://api.openai.com/v1/chat/completions', body, {
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      timeout: 60000,
    });

    const text: string = res.data?.choices?.[0]?.message?.content ?? '';
    const promptTokens = res.data?.usage?.prompt_tokens ?? 0;
    const responseTokens = res.data?.usage?.completion_tokens ?? 0;
    
    // Cost estimation: gpt-4o-mini is ~$0.15/$0.60 per 1M tokens
    const cost = (promptTokens * 0.15 + responseTokens * 0.60) / 1_000_000;

    const usage: LLMUsage = {
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

  async generateFix(codeSnippet: string, issue: string, languageId: string): Promise<string | null> {
    const system = 'You are a code fixer. Return ONLY the corrected code snippet without explanations, markdown, or commentary.';
    const prompt = `Language: ${languageId}\nIssue: ${issue}\n\nOriginal code:\n\`\`\`\n${codeSnippet}\n\`\`\`\n\nReturn the fixed code only.`;
    try {
      const { text } = await this.chat(prompt, system);
      return text.replace(/```[\w]*\n?/g, '').trim() || null;
    } catch {
      return null;
    }
  }
}
