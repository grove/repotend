import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
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
  // Case-insensitive filesystems may recognize a differently cased candidate first.
  const license = get(audit, 'repo.license-present').evidence;
  assert.equal(license.length, 1);
  assert.equal(await realpath(join(small, license[0].path)), await realpath(join(small, 'license')));
  assert.equal(get(audit, 'repo.security-policy').status, 'PASS');

  const complex = await directory(t);
  await put(complex, 'LICENSE.txt');
  await put(complex, 'docs/contributing.md');
  await put(complex, '.github/CODE_OF_CONDUCT.md');
  audit = await runAudit(complex);
  for (const id of ['repo.license-present', 'repo.contributing', 'repo.code-of-conduct']) {
    assert.equal(get(audit, id).status, 'PASS', id);
  }
  const contribution = get(audit, 'repo.contributing').evidence;
  assert.equal(contribution.length, 1);
  assert.equal(await realpath(join(complex, contribution[0].path)), await realpath(join(complex, 'docs/contributing.md')));
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
