import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { parseConfig, ConfigurationError } from '../skills/repotend/scripts/config.ts';
import { runAudit, renderMarkdown } from '../skills/repotend/scripts/engine.ts';
import { planRemediation } from '../skills/repotend/scripts/remediation.ts';

const ids = new Set(['repo.pr-template', 'dx.editorconfig', 'repo.license-present', 'security.workflow-permissions']);
const enforceable = new Set(['repo.pr-template', 'dx.editorconfig', 'repo.license-present']);
const rule = (report, id) => report.findings.find((f) => f.ruleId === id);
async function repo(t) {
  const root = await mkdtemp(join(tmpdir(), 'repotend-suppression-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

const policy = `schema: 1
profile: small-oss
rules:
  repo.pr-template:
    enforce: true
suppressions:
  repo.pr-template:
    reason: Organization PR template applies instead
    expires: 2027-12-31
  dx.editorconfig:
    reason: Maintainer prefers project-specific editor settings
`;

test('suppression config accepts justified exceptions, optional expiry, and rule enforcement', () => {
  const config = parseConfig(policy, ids, enforceable);
  assert.deepEqual(config.suppressions['repo.pr-template'], { reason: 'Organization PR template applies instead', expires: '2027-12-31' });
  assert.deepEqual(config.suppressions['dx.editorconfig'], { reason: 'Maintainer prefers project-specific editor settings' });
  assert.equal(config.rules['repo.pr-template'].enforce, true);
});

test('rejects unknown, duplicate, malformed, or unjustified suppressions', () => {
  for (const data of [
    'suppressions:\n  repo.pr-template:\n    expires: 2027-01-01',
    'suppressions:\n  nonexistent.rule:\n    reason: Shared defaults',
    'suppressions:\n  repo.pr-template:\n    reason: Unneeded\n    reason: Duplicated',
    'suppressions:\n  repo.pr-template:\n    reason: Unneeded\n    ticket: EX-1',
    'suppressions:\n  repo.pr-template:\n    reason: Unneeded\n    expires: tomorrow',
    'suppressions:\n  repo.pr-template:\n    reason: Unneeded\n    expires: 2027-02-29',
    'suppressions:\n  repo.pr-template:\n    reason: Unneeded\n    expires: 2027-13-01',
    'suppressions:\n  repo.pr-template:\n    reason: "Quoted reason"',
    'suppressions:\n  repo.pr-template:',
    'suppressions:\n  repo.pr-template:\n    reason:',
    'suppressions:\n  repo.pr-template:\n    reason: ' + 'x'.repeat(241),
    'suppressions:\n  repo.pr-template:\n    reason: Allowed\nsuppressions:\n  dx.editorconfig:\n    reason: Duplicate mapping',
    'rules:\n  repo.pr-template:\n    enabled: false\nsuppressions:\n  repo.pr-template:\n    reason: Conflict',
  ]) assert.throws(() => parseConfig('schema: 1\n' + data + '\n', ids, enforceable), ConfigurationError, data);
});

test('active exception is visible, prevents enforced failure, and does not hide other findings', async (t) => {
  const root = await repo(t);
  await writeFile(join(root, '.repotend.yml'), policy);
  const report = await runAudit(root, undefined, '2027-06-01');
  const pr = rule(report, 'repo.pr-template');
  assert.equal(pr.status, 'SUPPRESSED');
  assert.equal(pr.enforced, true);
  assert.equal(pr.suppression.active, true);
  assert.equal(pr.suppression.expires, '2027-12-31');
  assert.equal(rule(report, 'dx.editorconfig').status, 'SUPPRESSED');
  assert.equal(rule(report, 'repo.license-present').status, 'WARN');
  assert.match(renderMarkdown(report), /2 suppressed/);
  assert.match(renderMarkdown(report), /Organization PR template applies instead/);
  assert.deepEqual(report.errors, []);
});

test('expiry is inclusive, then enforcement resumes and the expired reason remains visible', async (t) => {
  const root = await repo(t);
  await writeFile(join(root, '.repotend.yml'), policy);
  const today = await runAudit(root, undefined, '2027-12-31');
  assert.equal(rule(today, 'repo.pr-template').status, 'SUPPRESSED');
  const tomorrow = await runAudit(root, undefined, '2028-01-01');
  const expired = rule(tomorrow, 'repo.pr-template');
  assert.equal(expired.status, 'FAIL');
  assert.equal(expired.suppression.active, false);
  assert.match(renderMarkdown(tomorrow), /Expired/);
});

test('a suppression never masks a passing, unknown, or not-applicable result', async (t) => {
  const root = await repo(t);
  await mkdir(join(root, '.github'), { recursive: true });
  await writeFile(join(root, '.github/pull_request_template.md'), '## Summary\n');
  await writeFile(join(root, '.repotend.yml'), policy.replace('    enforce: true\n', ''));
  const report = await runAudit(root, undefined, '2027-01-01');
  assert.equal(rule(report, 'repo.pr-template').status, 'PASS');
  assert.equal(rule(report, 'repo.pr-template').suppression.active, true);
  assert.equal(rule(report, 'ci.concurrency').status, 'NOT_APPLICABLE');
});

test('suppressed findings are excluded from remediation preview', async (t) => {
  const root = await repo(t);
  await writeFile(join(root, '.repotend.yml'), 'schema: 1\nsuppressions:\n  repo.pr-template:\n    reason: The organization shares PR templates\n');
  const plan = await planRemediation(root);
  assert.deepEqual(plan.proposals.map((p) => p.ruleId), ['dx.editorconfig']);
  assert.equal((await planRemediation(root)).planId, plan.planId);
});

test('CLI exits 0 when a verified enforced failure has an active exception', async (t) => {
  const root = await repo(t);
  await writeFile(join(root, '.repotend.yml'), 'schema: 1\nrules:\n  repo.pr-template:\n    enforce: true\nsuppressions:\n  repo.pr-template:\n    reason: Organization-wide template inherited\n');
  const proc = spawnSync(process.execPath, [join(process.cwd(), 'skills/repotend/scripts/audit.mjs'), '--root', root, '--format', 'json'], { encoding: 'utf8' });
  assert.equal(proc.status, 0, proc.stderr);
  assert.equal(rule(JSON.parse(proc.stdout), 'repo.pr-template').status, 'SUPPRESSED');
});
