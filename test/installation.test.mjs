import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'repotend-bundle-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'tool');
  await mkdir(source);
  for (const path of ['scripts', 'skills', 'docs', 'package.json', 'package-lock.json', 'LICENSE']) {
    await cp(join(project, path), join(source, path), { recursive: true });
  }
  const consumer = join(root, 'consumer with spaces');
  await mkdir(consumer);
  const destination = join(root, 'personal skills', 'repotend');
  const install = (...args) => spawnSync(process.execPath, [join(source, 'scripts/install-skill.mjs'), ...args], {
    cwd: consumer, encoding: 'utf8', timeout: 150_000,
  });
  const run = (script, ...args) => spawnSync(process.execPath, [join(destination, 'scripts', script),
    '--root', consumer, '--format', 'json', ...args], { cwd: consumer, encoding: 'utf8', timeout: 20_000 });
  return { source, consumer, destination, install, run };
}
async function snapshot(root) {
  const files = {};
  for (const item of await readdir(root, { withFileTypes: true })) {
    const path = join(root, item.name);
    if (item.isDirectory()) {
      for (const [child, content] of Object.entries(await snapshot(path))) files[`${item.name}/${child}`] = content;
    } else files[item.name] = await readFile(path, 'utf8');
  }
  return files;
}
const status = (report, id) => report.findings.find((f) => f.ruleId === id).status;

test('copied installation works without its source checkout and preserves the reviewed approval boundary', async (t) => {
  const { source, consumer, destination, install, run } = await fixture(t);
  // A target lifecycle script must never run during installation, audit, or remediation.
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ scripts: {
    preinstall: 'node -e "require(\'fs\').writeFileSync(\'UNEXPECTED\', \'executed\')"',
  } }));
  await mkdir(join(consumer, '.github/workflows'), { recursive: true });
  await writeFile(join(consumer, '.github/workflows/check.yml'),
    'name: check\non: pull_request\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n');
  const before = await snapshot(consumer);
  const installed = install('--dest', destination);
  assert.equal(installed.status, 0, installed.stderr);
  assert.deepEqual(await snapshot(consumer), before);
  assert.equal(JSON.parse(await readFile(join(destination, 'node_modules/yaml/package.json'), 'utf8')).version, '2.8.1');
  assert.match(await readFile(join(destination, 'SKILL.md'), 'utf8'), /^---\nname: repotend\n/);
  await rm(source, { recursive: true });

  const audit = run('audit.mjs');
  assert.equal(audit.status, 0, audit.stderr);
  const report = JSON.parse(audit.stdout);
  assert.equal(report.findings.length, 13);
  assert.deepEqual(report.errors, []);
  for (const id of ['repo.pr-template', 'dx.editorconfig']) assert.equal(status(report, id), 'WARN');
  assert.equal(report.findings.find((f) => f.ruleId === 'security.workflow-permissions').confidence, 'heuristic');
  const preview = run('remediate.mjs');
  assert.equal(preview.status, 0, preview.stderr);
  const plan = JSON.parse(preview.stdout);
  assert.match(plan.planId, /^[a-f0-9]{64}$/);
  assert.deepEqual(plan.proposals.map((p) => p.path), ['.github/pull_request_template.md', '.editorconfig']);
  assert(plan.proposals.every((p) => p.diff.startsWith('--- /dev/null\n')));
  assert.deepEqual(JSON.parse(run('remediate.mjs').stdout), plan);
  // A denial means the host never calls --apply. A digest alone is not human consent.
  assert.deepEqual(await snapshot(consumer), before);
  for (const args of [['--apply'], ['--apply', 'bad'], ['--apply', '0'.repeat(64)]]) {
    const refused = run('remediate.mjs', ...args);
    assert.equal(refused.status, 2, refused.stderr);
    assert.deepEqual(await snapshot(consumer), before);
  }
  const applied = run('remediate.mjs', '--apply', plan.planId);
  assert.equal(applied.status, 0, applied.stderr);
  const result = JSON.parse(applied.stdout);
  assert.equal(result.planId, plan.planId);
  assert.deepEqual(result.changed, plan.proposals.map((p) => p.path));
  assert(result.verified.every((f) => f.status === 'PASS'));
  const expected = { ...before, ...Object.fromEntries(plan.proposals.map((p) => [p.path, p.content])) };
  assert.deepEqual(await snapshot(consumer), expected);
  const verified = JSON.parse(run('audit.mjs').stdout);
  for (const id of ['repo.pr-template', 'dx.editorconfig']) assert.equal(status(verified, id), 'PASS');
  assert.equal(run('remediate.mjs', '--apply', plan.planId).status, 2);
  assert.deepEqual(await snapshot(consumer), expected);

  await rm(join(consumer, '.editorconfig'));
  const stale = JSON.parse(run('remediate.mjs').stdout);
  await writeFile(join(consumer, '.editorconfig'), 'human settings\n');
  const changed = await snapshot(consumer);
  assert.equal(run('remediate.mjs', '--apply', stale.planId).status, 2);
  assert.deepEqual(await snapshot(consumer), changed);

  // The parser is bundled: an audit works even if the copied skill's
  // historical npm dependency tree is absent.
  const savedModules = join(dirname(destination), 'saved-node-modules');
  await rename(join(destination, 'node_modules'), savedModules);
  for (const script of ['audit.mjs', 'remediate.mjs']) {
    const output = run(script);
    assert.equal(output.status, 0, output.stderr);
    assert.ok(JSON.parse(output.stdout), script);
  }
  await rename(savedModules, join(destination, 'node_modules'));
  // A corrupt engine remains a distinct execution error.
  await writeFile(join(destination, 'scripts/engine.ts'), 'this is invalid TypeScript !!!');
  const corrupt = run('audit.mjs');
  assert.equal(corrupt.status, 2);
  assert.equal(corrupt.stdout, '');
  assert.match(corrupt.stderr, /syntax|Expected|Unexpected/i);
  assert.deepEqual(await snapshot(consumer), changed);
});

test('installer rejects bad arguments and never replaces existing paths', async (t) => {
  const { consumer, destination, install } = await fixture(t);
  assert.equal(install().status, 2);
  assert.equal(install('--dest', destination, '--force').status, 2);
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, 'keep'), 'existing installation\n');
  const before = await snapshot(destination);
  assert.equal(install('--dest', destination).status, 2);
  assert.deepEqual(await snapshot(destination), before);
  assert.deepEqual(await snapshot(consumer), {});
  await rm(destination, { recursive: true });
  await symlink(consumer, destination, process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(install('--dest', destination).status, 2);
  assert.deepEqual(await snapshot(consumer), {});
});

test('failed dependency setup cleans up only the new installation and does not claim success', async (t) => {
  const { source, consumer, destination, install } = await fixture(t);
  const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'));
  manifest.dependencies.yaml = '0.0.0-repotend-invalid';
  await writeFile(join(source, 'package.json'), JSON.stringify(manifest));
  const failed = install('--dest', destination);
  assert.equal(failed.status, 2);
  assert.match(failed.stderr, /Pinned dependency installation failed/);
  assert.doesNotMatch(failed.stdout, /RepoTend installed at/);
  await assert.rejects(readFile(join(destination, 'SKILL.md')), { code: 'ENOENT' });
  assert.deepEqual(await snapshot(consumer), {});
});
