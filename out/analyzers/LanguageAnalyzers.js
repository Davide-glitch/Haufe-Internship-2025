"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptAnalyzer = exports.JavaScriptAnalyzer = exports.PythonAnalyzer = void 0;
exports.getAnalyzer = getAnalyzer;
class PythonAnalyzer {
    constructor() {
        this.patterns = [
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
    }
    analyze(code, filePath) {
        const results = [];
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
exports.PythonAnalyzer = PythonAnalyzer;
class JavaScriptAnalyzer {
    constructor() {
        this.patterns = [
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
    }
    analyze(code, filePath) {
        const results = [];
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
exports.JavaScriptAnalyzer = JavaScriptAnalyzer;
class TypeScriptAnalyzer {
    constructor() {
        this.patterns = [
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
    }
    analyze(code, filePath) {
        const results = [];
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
exports.TypeScriptAnalyzer = TypeScriptAnalyzer;
function getAnalyzer(languageId) {
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
//# sourceMappingURL=LanguageAnalyzers.js.map