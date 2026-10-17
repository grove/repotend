import process from 'node:process';

async function main(): Promise<void> {
  const { runAudit, renderMarkdown } = await import('./engine.ts');
  let root = process.cwd();
  let format: 'json' | 'markdown' = 'markdown';
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--root' && args[i + 1]) root = args[++i];
    else if (arg === '--format' && args[i + 1] && ['json', 'markdown'].includes(args[i + 1]))
      format = args[++i] as 'json' | 'markdown';
    else throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  const report = await runAudit(root);
  process.stdout.write(format === 'json' ? JSON.stringify(report, null, 2) + '\n' : renderMarkdown(report));
  process.exitCode = report.errors.length ? 2 : report.findings.some((f) => f.status === 'FAIL') ? 1 : 0;
}
main().catch((error: unknown) => {
  process.stderr.write(`RepoTend audit failed: ${error instanceof Error ? error.message : 'unknown error'}\n`);
  process.exitCode = 2;
});
