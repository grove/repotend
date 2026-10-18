import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('a Skills CLI-style directory copy can be prepared and audited independently', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'repotend-skills-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const skill = join(root, 'installed skills', 'repotend');
  const target = join(root, 'application');
  await cp(join(repo, 'skills/repotend'), skill, { recursive: true });
  await mkdir(join(target, '.github/workflows'), { recursive: true });
  await writeFile(join(target, '.github/workflows/check.yml'),
    'name: check\non: pull_request\npermissions: { contents: read }\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n');
  await writeFile(join(target, 'package.json'), JSON.stringify({ scripts: {
    preinstall: 'node -e "require(\\'fs\\').writeFileSync(\\'UNEXPECTED\\', \\'executed\\')"',
  } }));
  const marker = join(target, 'sentinel');
  await writeFile(marker, 'unchanged');
  const before = await Promise.all([
    readFile(join(target, 'package.json'), 'utf8'),
    readFile(join(target, '.github/workflows/check.yml'), 'utf8'),
    readFile(marker, 'utf8'),
  ]);

  const manifest = JSON.parse(await readFile(join(skill, 'package.json'), 'utf8'));
  const lock = JSON.parse(await readFile(join(skill, 'package-lock.json'), 'utf8'));
  assert.equal(manifest.dependencies.yaml, '2.8.1');
  assert.equal(lock.packages['node_modules/yaml'].version, manifest.dependencies.yaml);
  assert.ok(lock.packages['node_modules/yaml'].integrity.startsWith('sha512-'));
  assert.match(await readFile(join(skill, 'SKILL.md'), 'utf8'), /^---\nname: repotend\n/);
  for (const file of ['docs/INSTALLATION.md', 'docs/WORKFLOW_CHECKS.md',
    'docs/CONFIGURATION.md', 'docs/REMEDIATION.md', 'LICENSE']) {
    assert.ok((await readFile(join(skill, file), 'utf8')).length > 0, file);
  }
  const audit = () => spawnSync(process.execPath, [join(skill, 'scripts/audit.mjs'),
    '--root', target, '--format', 'json'], { cwd: target, encoding: 'utf8', timeout: 30_000 });

  // The skills CLI copies files, it does not install npm dependencies.
  const missing = audit();
  assert.equal(missing.status, 2);
  assert.equal(missing.stdout, '');
  assert.match(missing.stderr, /yaml|ERR_MODULE_NOT_FOUND/);

  // Setup only the copied skill's pinned dependency; ignore all package lifecycle scripts.
  const install = spawnSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: skill, encoding: 'utf8', timeout: 120_000,
  });
  assert.equal(install.status, 0, install.stderr);
  assert.equal(JSON.parse(await readFile(join(skill, 'node_modules/yaml/package.json'), 'utf8')).version,
    manifest.dependencies.yaml);

  const result = audit();
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.findings.length, 13);
  assert.deepEqual(report.errors, []);
  assert.equal(report.findings.find((f) => f.ruleId === 'ci.workflow-validity').status, 'PASS');

  const after = await Promise.all([
    readFile(join(target, 'package.json'), 'utf8'),
    readFile(join(target, '.github/workflows/check.yml'), 'utf8'),
    readFile(marker, 'utf8'),
  ]);
  assert.deepEqual(after, before);
  await assert.rejects(readFile(join(target, 'UNEXPECTED')), { code: 'ENOENT' });
});
