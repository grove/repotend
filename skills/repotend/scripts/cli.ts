import process from 'node:process';

async function main(): Promise<void> {
  let root = process.cwd();
  let format: 'json' | 'markdown' = 'markdown';
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') {
      process.stdout.write(`Usage: node skills/repotend/scripts/audit.mjs [options]

Check repository health without changing files. Requires Node.js 22.16+.

Options:
  --root PATH             Repository to check (default: current working directory)
  --format markdown|json  Report format (default: markdown)
  --help                  Show this help and exit without auditing
`);
      return;
    }
    if (arg === '--root' && args[i + 1]) root = args[++i];
    else if (arg === '--format' && args[i + 1]) {
      const value = args[++i];
      if (value !== 'json' && value !== 'markdown')
        throw new Error(`Invalid format: ${value}. Supported formats: markdown, json.`);
      format = value;
    } else throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  const { runAudit, renderMarkdown } = await import('./engine.ts');
  const report = await runAudit(root);
  process.stdout.write(format === 'json' ? JSON.stringify(report, null, 2) + '\n' : renderMarkdown(report));
  process.exitCode = report.errors.length ? 2 : report.findings.some((f) => f.status === 'FAIL') ? 1 : 0;
}
main().catch((error: unknown) => {
  process.stderr.write(`RepoTend audit failed: ${error instanceof Error ? error.message : 'unknown error'}\n`);
  process.exitCode = 2;
});
