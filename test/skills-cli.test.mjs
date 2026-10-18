import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('Skills CLI style copy audits a separate project with no npm install', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'repotend-skills-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const skill = join(root, 'installed skills', 'repotend');
  const target = join(root, 'application');
  // Simulate the Skills CLI: copy only the skill directory, not the repo root.
  await cp(join(repo, 'skills/repotend'), skill, { recursive: true });
  await mkdir(join(target, '.github/workflows'), { recursive: true });
  await writeFile(join(target, '.github/workflows/ci.yml'), [
    'name: test',
    'on: [push, pull_request]',
    'permissions: read-all',
    'jobs:',
    '  check:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '',
  ].join('\n'));
  const before = await readFile(join(target, '.github/workflows/ci.yml'), 'utf8');
  assert.match(await readFile(join(skill, 'SKILL.md'), 'utf8'), /^---\nname: repotend\n/);
  assert.match(await readFile(join(skill, 'vendor/yaml/LICENSE'), 'utf8'), /Permission to use/);
  assert.match(await readFile(join(skill, 'vendor/yaml/README.md'), 'utf8'), /v2.8.1/);

  const run = (script) => spawnSync(process.execPath, [join(skill, 'scripts', script),
    '--root', target, '--format', 'json'], {
    cwd: target, encoding: 'utf8', timeout: 30000,
  });
  // No network, npm, node_modules or credentials are used in the copied skill.
  const audit = run('audit.mjs');
  assert.equal(audit.status, 0, audit.stderr);
  const report = JSON.parse(audit.stdout);
  assert.equal(report.findings.length, 13);
  assert.deepEqual(report.errors, []);
  const finding = (id) => report.findings.find((f) => f.ruleId === id);
  assert.equal(finding('ci.workflow-validity').status, 'PASS');
  assert.equal(finding('ci.duplicate-triggers').status, 'WARN');
  assert.equal(finding('security.action-pinning').status, 'WARN');
  assert.equal(finding('repo.pr-template').status, 'WARN');

  const preview = run('remediate.mjs');
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(JSON.parse(preview.stdout).proposals.length, 2);
  assert.equal(await readFile(join(target, '.github/workflows/ci.yml'), 'utf8'), before);

  // YAML syntax errors must still be detected, with evidence, not silently skipped.
  await writeFile(join(target, '.github/workflows/ci.yml'), 'name: [broken\n');
  const invalid = run('audit.mjs');
  assert.equal(invalid.status, 0, invalid.stderr);
  assert.equal(JSON.parse(invalid.stdout).findings.find(
    (f) => f.ruleId === 'ci.workflow-validity').status, 'WARN');
});
