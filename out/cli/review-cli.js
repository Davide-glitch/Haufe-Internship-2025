#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ReviewManager_1 = require("../services/ReviewManager");
async function main() {
    const args = process.argv.slice(2);
    const staged = args.includes('--staged');
    const cwd = process.cwd();
    // Minimal fake ExtensionContext for ReviewManager
    const context = { globalState: { get: () => undefined, update: async () => { } } };
    const manager = new ReviewManager_1.ReviewManager(context);
    if (!staged) {
        console.log('Usage: ai-review --staged');
        process.exit(0);
    }
    const changes = await manager.getGitDiff();
    const result = await manager.reviewChanges(changes);
    console.log('AI Review result:');
    console.log(JSON.stringify(result.metrics, null, 2));
    if (result.issues.length) {
        console.log(`Found ${result.issues.length} issues:`);
        for (const i of result.issues) {
            console.log(`- [${i.severity}] ${i.filePath}:${i.startLine} ${i.title} — ${i.message}`);
        }
    }
    // Fail on any critical issues
    const critical = result.issues.filter(i => i.severity === 'critical').length;
    if (critical > 0) {
        console.error(`Critical issues: ${critical}.`);
        process.exit(2);
    }
}
main().catch((e) => { console.error(e?.message || e); process.exit(1); });
//# sourceMappingURL=review-cli.js.map