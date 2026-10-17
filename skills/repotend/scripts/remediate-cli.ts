import process from 'node:process';
import { applyRemediation, planRemediation, renderRemediationMarkdown } from './remediation.ts';

async function main(): Promise<void> {
  let root = process.cwd();
  let format: 'json' | 'markdown' = 'markdown';
  let apply: string | undefined;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const option = args[i];
    if (option === '--root' && args[i + 1]) root = args[++i];
    else if (option === '--format' && ['json', 'markdown'].includes(args[i + 1])) format = args[++i] as 'json' | 'markdown';
    else if (option === '--apply' && args[i + 1]) apply = args[++i];
    else throw new Error(`Unknown or incomplete option: ${option}`);
  }
  const result = apply ? await applyRemediation(root, apply) : await planRemediation(root);
  process.stdout.write(format === 'json' ? JSON.stringify(result, null, 2) + '\n' : renderRemediationMarkdown(result));
}
main().catch((error: unknown) => {
  process.stderr.write(`RepoTend remediation failed: ${error instanceof Error ? error.message : 'unknown error'}\n`);
  process.exitCode = 2;
});
