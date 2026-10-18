import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('Skills CLI style copy contains everything needed for isolated runtime setup', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'repotend-skills-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const skill = join(root, 'installed skills', 'repotend');
  const target = join(root, 'application');
  await cp(join(repo, 'skills/repotend'), skill, { recursive: true });
  await cp(join(repo, 'test/fixtures'), target, { recursive: true }).catch(async () => {
    const { mkdir } = await import('node:fs/promises');
    await mkdir(target);
  });
  const manifest = JSON.parse(await readFile(join(skill, 'package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(join(skill, 'package-lock.json'), 'utf8'));
  assert.equal(manifest.dependencies.yaml, '2.8.1');
  assert.equal(lock.packages['node_modules/yaml'].version, manifest.dependencies.yaml);
  assert.match(await readFile(join(skill, 'SKILL.md'), 'utf8'), /^---\nname: repotend\n/);
  for (const file of ['docs/INSTALLATION.md', 'docs/WORKFLOW_CHECKS.md',
    'docs/CONFIGURATION.md', 'docs/REMEDIATION.md', 'LICENSE']) {
    assert.ok((await readFile(join(skill, file), 'utf8')).length > 0, file);
  }
  // A skills-cli copy has no node_modules: setup happens only in the copied skill.
  const install = spawnSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: skill, encoding: 'utf8', timeout: 120_000,
  });
  assert.equal(install.status, 0, install.stderr);
  const result = spawnSync(process.execPath, [join(skill, 'scripts/audit.mjs'),
    '--root', target, '--format', 'json'], { cwd: target, encoding: 'utf8', timeout: 30_000 });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.findings.length, 13);
  assert.deepEqual(report.errors, []);
  assert.ok(report.findings.some((f) => f.ruleId === 'repo.pr-template'));
  await writeFile(join(target, 'sentinel'), 'untouched');
  assert.equal(await readFile(join(target, 'sentinel'), 'utf8'), 'untouched');
});
