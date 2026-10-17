#!/usr/bin/env node
// Compatibility launcher; target repo scripts are never executed.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const cli = join(dirname(fileURLToPath(import.meta.url)), 'remediate-cli.ts');
const result = spawnSync(process.execPath, ['--experimental-strip-types', cli, ...process.argv.slice(2)], {
  stdio: 'inherit', shell: false,
});
if (result.error) {
  process.stderr.write(`RepoTend could not start: ${result.error.message}\n`);
  process.exitCode = 2;
} else {
  process.exitCode = result.status ?? 2;
}
