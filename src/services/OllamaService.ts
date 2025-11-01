import axios from 'axios';

export interface OllamaUsage {
  promptChars: number;
  responseChars: number;
  durationMs: number;
}

export class OllamaService {
  private baseUrl = 'http://127.0.0.1:11434';
  private model = process.env.AI_REVIEW_MODEL || 'deepseek-coder:6.7b';

  async chat(prompt: string, system?: string): Promise<{ text: string; usage: OllamaUsage }> {
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
    const usage: OllamaUsage = {
      promptChars: JSON.stringify(body).length,
      responseChars: text.length,
      durationMs: Date.now() - start,
    };
    return { text, usage };
  }

  async analyzeCode(code: string, languageId: string, context: string): Promise<{ insights: string; usage: OllamaUsage }> {
    const system = 'You are a senior staff engineer performing code reviews. Provide concise, actionable findings with severity (info|warning|error|critical), rule references, and suggested fixes. Prefer bullet points.';
    const prompt = `Language: ${languageId}\nContext: ${context}\n--- CODE START ---\n${code}\n--- CODE END ---\n\nAnalyze for:\n- defects, bugs, and edge cases\n- security issues\n- performance or complexity problems\n- style and guideline violations (PEP8/Airbnb/etc.)\n- missing tests or docs\n\nReturn findings in Markdown.`;
    const { text, usage } = await this.chat(prompt, system);
    return { insights: text, usage };
  }

  async generateFix(codeSnippet: string, issue: string, languageId: string): Promise<string | null> {
    const system = 'You generate minimal diff-style fixes that replace only the given snippet with an improved version. Return only the replacement code without explanations.';
    const prompt = `Language: ${languageId}\nIssue: ${issue}\nProblematic snippet:\n\n${codeSnippet}\n\nProvide a fixed snippet only.`;
    try {
      const { text } = await this.chat(prompt, system);
      return text?.trim() || null;
    } catch (e) {
      return null;
    }
  }
}
