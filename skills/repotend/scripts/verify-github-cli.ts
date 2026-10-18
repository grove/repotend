import { verifyGitHub } from './github.ts';

async function main(): Promise<void> {
  let root = process.cwd();
  let repo = '';
  let branch = '';
  let allowRemote = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help') {
      process.stdout.write(`Usage: node verify-github.mjs --repo OWNER/REPO --branch BRANCH [--root PATH] [--allow-remote]

Separate experimental JSON context for ci.path-filter-safety. Requires Node.js 22.16+.
Without --allow-remote: not verified, with no network or credential access.
With --allow-remote: use the existing gh connection for read-only GitHub.com GET requests.
Never changes files, GitHub settings, workflows, or the offline v0.1 report.
Exit 0: context emitted (inspect status for uncertainty); exit 2: invocation/local execution error.
`);
      return;
    }
    if (arg === '--allow-remote') allowRemote = true;
    else if (['--root', '--repo', '--branch'].includes(arg) && args[i + 1] && !args[i + 1].startsWith('--')) {
      const value = args[++i];
      if (arg === '--root') root = value;
      else if (arg === '--repo') repo = value;
      else branch = value;
    } else throw new Error('Unknown or incomplete option; see --help');
  }
  const context = await verifyGitHub({ root, repo, branch, allowRemote });
  process.stdout.write(JSON.stringify(context, null, 2) + '\n');
}
main().catch(() => {
  process.stderr.write('RepoTend GitHub verification failed: check arguments and local repository access; see --help.\n');
  process.exitCode = 2;
});
