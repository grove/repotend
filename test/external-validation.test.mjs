import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { runAudit } from '../skills/repotend/scripts/engine.ts';
import { renderMarkdown, summarize, validateCases } from '../scripts/validate-external.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function directory(t) {
  const path = await mkdtemp(join(tmpdir(), 'repotend-consumer-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}
async function put(root, path, content = 'sample\n') {
  const full = join(root, ...path.split('/'));
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, content);
}
function get(report, id) {
  const finding = report.findings.find((f) => f.ruleId === id);
  assert.ok(finding, `Missing finding: ${id}`);
  return finding;
}

test('common license, contribution and security filenames do not generate false warnings', async (t) => {
  const small = await directory(t);
  await put(small, 'license');
  await put(small, '.github/security.md');
  let audit = await runAudit(small);
  assert.equal(get(audit, 'repo.license-present').status, 'PASS');
  assert.deepEqual(get(audit, 'repo.license-present').evidence, [{ path: 'license' }]);
  assert.equal(get(audit, 'repo.security-policy').status, 'PASS');

  const complex = await directory(t);
  await put(complex, 'LICENSE.txt');
  await put(complex, 'docs/contributing.md');
  await put(complex, '.github/CODE_OF_CONDUCT.md');
  audit = await runAudit(complex);
  for (const id of ['repo.license-present', 'repo.contributing', 'repo.code-of-conduct']) {
    assert.equal(get(audit, id).status, 'PASS', id);
  }
  assert.deepEqual(get(audit, 'repo.contributing').evidence, [{ path: 'docs/contributing.md' }]);
});

test('an unreadable candidate never becomes a verified missing-file warning', async (t) => {
  const root = await directory(t);
  await symlink(join(tmpdir(), 'no-actual-license'), join(root, 'LICENSE'));
  const result = await runAudit(root);
  assert.equal(get(result, 'repo.license-present').status, 'UNKNOWN');
});

test('pinned public sample definitions are well formed', async () => {
  const definitions = JSON.parse(await readFile(join(project, 'test/external-repositories.json'), 'utf8'));
  validateCases(definitions);
  assert.equal(definitions.length, 2);
  assert.throws(() => validateCases([{ repository: 'invalid', commit: 'main', expected: { foo: 'PASS' } }]));
  assert.throws(() => validateCases([definitions[0], definitions[0]]));
});

test('external summary flags regressions without interpreting advisory warnings as failures', () => {
  const source = {
    repository: 'org/tool', commit: 'a'.repeat(40), purpose: 'fixture',
    expected: { 'repo.license-present': 'PASS' },
  };
  const report = { schemaVersion: '0.1', errors: [], findings: [
    { ruleId: 'repo.license-present', status: 'PASS', confidence: 'verified', summary: 'License present', evidence: [{ path: 'LICENSE' }] },
    { ruleId: 'security.action-pinning', status: 'WARN', confidence: 'verified', summary: 'Unpinned external action', evidence: [] },
  ] };
  const okay = summarize(source, report);
  assert.deepEqual(okay.mismatches, []);
  assert.equal(okay.counts.WARN, 1);
  assert.match(renderMarkdown([okay]), /Unpinned external action/);
  assert.match(renderMarkdown([okay]), /Expectations/);
  const bad = summarize({ ...source, expected: { 'repo.license-present': 'WARN' } }, report);
  assert.equal(bad.mismatches.length, 1);
  assert.throws(() => summarize(source, { ...report, errors: [{ code: 'RULE_EXECUTION' }] }));
});

test('a symlinked skill in a separate consumer workspace executes without changing that workspace', async (t) => {
  const consumer = await directory(t);
  const audited = await directory(t);
  const skillFolder = join(consumer, '.github', 'skills');
  await mkdir(skillFolder, { recursive: true });
  const link = join(skillFolder, 'repotend');
  await symlink(join(project, 'skills', 'repotend'), link, process.platform === 'win32' ? 'junction' : 'dir');
  await put(audited, 'license');
  const before = await readdir(audited);
  const command = join(link, 'scripts', 'audit.mjs');
  const r = spawnSync(process.execPath, [command, '--root', audited, '--format', 'json'], {
    encoding: 'utf8', shell: false, timeout: 20_000,
  });
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout);
  assert.equal(get(report, 'repo.license-present').status, 'PASS');
  assert.deepEqual(await readdir(audited), before);
  const skill = await readFile(join(link, 'SKILL.md'), 'utf8');
  assert.match(skill, /^---\nname: repotend\n/m);
  assert.match(skill, /description:/);
});
