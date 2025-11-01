import { Severity } from '../services/ReviewManager';

export interface Pattern {
  name: string;
  regex: RegExp;
  severity: Severity;
  message: string;
  guideline?: string;
  tags?: string[];
}

export interface LanguageAnalyzer {
  patterns: Pattern[];
  analyze(code: string, filePath: string): Array<{
    title: string;
    message: string;
    severity: Severity;
    line: number;
    guideline?: string;
    tags?: string[];
  }>;
}

export class PythonAnalyzer implements LanguageAnalyzer {
  patterns: Pattern[] = [
    {
      name: 'Hardcoded password',
      regex: new RegExp('(password|passwd|pwd)\\s*=\\s*[\'"][^\'"]+[\'"]', 'i'),
      severity: 'critical',
      message: 'Hardcoded password detected. Use environment variables or secrets management.',
      guideline: 'OWASP: A02 Cryptographic Failures',
      tags: ['security', 'credentials'],
    },
    {
      name: 'SQL injection risk',
      regex: /execute\s*\(\s*["'].*%s.*["']\s*%/,
      severity: 'critical',
      message: 'Potential SQL injection. Use parameterized queries.',
      guideline: 'OWASP: A03 Injection',
      tags: ['security', 'sql'],
    },
    {
      name: 'Eval usage',
      regex: /\beval\s*\(/,
      severity: 'critical',
      message: 'Avoid eval() - it executes arbitrary code and is a security risk.',
      guideline: 'CWE-95',
      tags: ['security', 'code-execution'],
    },
    {
      name: 'Bare except',
      regex: /except\s*:/,
      severity: 'warning',
      message: 'Bare except catches all exceptions including system exits. Be specific.',
      guideline: 'PEP 8',
      tags: ['best-practice', 'error-handling'],
    },
  ];

  analyze(code: string, filePath: string) {
    const results: Array<{ title: string; message: string; severity: Severity; line: number; guideline?: string; tags?: string[] }> = [];
    const lines = code.split(/\r?\n/);

    for (const pattern of this.patterns) {
      lines.forEach((line, idx) => {
        if (pattern.regex.test(line)) {
          results.push({
            title: pattern.name,
            message: pattern.message,
            severity: pattern.severity,
            line: idx + 1,
            guideline: pattern.guideline,
            tags: pattern.tags,
          });
        }
      });
    }

    return results;
  }
}

export class JavaScriptAnalyzer implements LanguageAnalyzer {
  patterns: Pattern[] = [
    {
      name: 'Eval usage',
      regex: /\beval\s*\(/,
      severity: 'critical',
      message: 'Avoid eval() - major security risk.',
      guideline: 'ESLint: no-eval',
      tags: ['security'],
    },
    {
      name: 'Console log',
      regex: /console\.(log|debug|info)/,
      severity: 'warning',
      message: 'Remove debug console statements before committing.',
      guideline: 'ESLint: no-console',
      tags: ['style', 'debugging'],
    },
    {
      name: 'Var declaration',
      regex: /\bvar\s+\w+/,
      severity: 'warning',
      message: 'Use let or const instead of var.',
      guideline: 'ESLint: no-var',
      tags: ['style', 'es6'],
    },
  ];

  analyze(code: string, filePath: string) {
    const results: Array<{ title: string; message: string; severity: Severity; line: number; guideline?: string; tags?: string[] }> = [];
    const lines = code.split(/\r?\n/);

    for (const pattern of this.patterns) {
      lines.forEach((line, idx) => {
        if (pattern.regex.test(line)) {
          results.push({
            title: pattern.name,
            message: pattern.message,
            severity: pattern.severity,
            line: idx + 1,
            guideline: pattern.guideline,
            tags: pattern.tags,
          });
        }
      });
    }

    return results;
  }
}

export class TypeScriptAnalyzer implements LanguageAnalyzer {
  patterns: Pattern[] = [
    {
      name: 'Eval usage',
      regex: /\beval\s*\(/,
      severity: 'critical',
      message: 'Avoid eval() - major security risk.',
      guideline: 'ESLint: no-eval',
      tags: ['security'],
    },
    {
      name: 'Console log',
      regex: /console\.(log|debug|info)/,
      severity: 'warning',
      message: 'Remove debug console statements before committing.',
      guideline: 'ESLint: no-console',
      tags: ['style', 'debugging'],
    },
    {
      name: 'Any type',
      regex: /:\s*any\b/,
      severity: 'warning',
      message: 'Avoid using "any" type. Be specific with types.',
      guideline: 'TypeScript: strict typing',
      tags: ['typescript', 'type-safety'],
    },
  ];

  analyze(code: string, filePath: string) {
    const results: Array<{ title: string; message: string; severity: Severity; line: number; guideline?: string; tags?: string[] }> = [];
    const lines = code.split(/\r?\n/);

    for (const pattern of this.patterns) {
      lines.forEach((line, idx) => {
        if (pattern.regex.test(line)) {
          results.push({
            title: pattern.name,
            message: pattern.message,
            severity: pattern.severity,
            line: idx + 1,
            guideline: pattern.guideline,
            tags: pattern.tags,
          });
        }
      });
    }

    return results;
  }
}

export function getAnalyzer(languageId: string): LanguageAnalyzer | null {
  switch (languageId) {
    case 'python':
      return new PythonAnalyzer();
    case 'javascript':
      return new JavaScriptAnalyzer();
    case 'typescript':
      return new TypeScriptAnalyzer();
    default:
      return null;
  }
}
