#!/usr/bin/env node
// Separate opt-in entrypoint; the offline audit never imports this verifier.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const result = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', '--experimental-strip-types',
  fileURLToPath(new URL('./verify-github-cli.ts', import.meta.url)), ...process.argv.slice(2)], {
  stdio: 'inherit', shell: false,
});
if (result.error) process.stderr.write('RepoTend could not start GitHub verification.\n');
process.exitCode = result.status ?? 2;
