#!/usr/bin/env node
// Compatibility entrypoint. Node 22 needs type stripping enabled for the typed engine.
// No shell interpolation, external packages, or execution of target-repository code.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import process from 'node:process';
const source = join(dirname(fileURLToPath(import.meta.url)), 'cli.ts');
// Node 22.16/22.17 warn about type stripping even when only showing help.
const result = spawnSync(process.execPath, ['--disable-warning=ExperimentalWarning', '--experimental-strip-types', source, ...process.argv.slice(2)], {
  stdio: 'inherit', shell: false,
});
if (result.error) {
  process.stderr.write(`RepoTend could not start: ${result.error.message}\n`);
  process.exitCode = 2;
} else if (result.signal) {
  process.exitCode = 2;
} else {
  process.exitCode = result.status ?? 2;
}
