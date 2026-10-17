#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== '--dest' || !args[1]) {
    throw new Error('Usage: node scripts/install-skill.mjs --dest <new-skill-directory>');
  }
  const destination = resolve(args[1]);
  await mkdir(dirname(destination), { recursive: true });
  // Exclusive creation also refuses symlinks and protects an existing installation.
  await mkdir(destination);
  try {
    await cp(join(project, 'skills/repotend'), destination, { recursive: true });
    await cp(join(project, 'docs'), join(destination, 'docs'), { recursive: true });
    for (const file of ['package.json', 'package-lock.json', 'LICENSE']) {
      await cp(join(project, file), join(destination, file));
    }
    const result = spawnSync('npm', [
      'ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund',
    ], { cwd: destination, encoding: 'utf8', timeout: 120_000, shell: false });
    if (result.error || result.status !== 0) {
      throw new Error(`Pinned dependency installation failed: ${result.error?.message ?? result.stderr}`);
    }
    // Validate module resolution without depending on the audited project's setup.
    const fixture = await mkdtemp(join(tmpdir(), 'repotend-install-'));
    try {
      for (const script of ['audit.mjs', 'remediate.mjs']) {
        const check = spawnSync(process.execPath, [join(destination, 'scripts', script),
          '--root', fixture, '--format', 'json'], { cwd: fixture, encoding: 'utf8', timeout: 20_000 });
        if (check.error || check.status !== 0) {
          throw new Error(`Installed ${script} failed: ${check.error?.message ?? check.stderr}`);
        }
        JSON.parse(check.stdout);
      }
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
  process.stdout.write(`RepoTend installed at ${destination}\nRestart Copilot CLI to discover the skill.\n`);
}

main().catch((error) => {
  process.stderr.write(`RepoTend installation failed: ${error.message}\n`);
  process.exitCode = 2;
});
