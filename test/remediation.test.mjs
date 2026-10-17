import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, lstat, rm, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { runAudit } from '../skills/repotend/scripts/engine.ts';
import { applyRemediation, planRemediation, renderRemediationMarkdown, RemediationError } from '../skills/repotend/scripts/remediation.ts';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'repotend-fix-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
const by = (report, id) => report.findings.find((f) => f.ruleId === id);
async function exists(path) { try { await lstat(path); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } }

const paths = ['.github/pull_request_template.md', '.editorconfig'];

test('dry-run proposes two deterministic additions without creating files or directories', async (t) => {
  const root = await fixture(t);
  const before = await readdir(root);
  const plan = await planRemediation(root);
  assert.deepEqual(plan.proposals.map((x) => x.path), paths);
  assert.equal(plan.mode, 'remediate');
  assert.match(plan.planId, /^[0-9a-f]{64}$/);
  assert.deepEqual(await readdir(root), before);
  assert.equal(plan.proposals[0].diff.startsWith('--- /dev/null\n+++ b/.github/pull_request_template.md'), true);
  assert.match(plan.proposals[1].content, /insert_final_newline = true/);
  assert.doesNotMatch(plan.proposals[1].content, /indent_style|indent_size/);
  assert.match(renderRemediationMarkdown(plan), /No files were changed/);
  assert.deepEqual(await planRemediation(root), plan);
});

test('reviewed plan creates missing files, verifies them, and refuses stale replay', async (t) => {
  const root = await fixture(t);
  const preview = await planRemediation(root);
  const result = await applyRemediation(root, preview.planId);
  assert.deepEqual(result.changed, paths);
  assert(result.verified.every((f) => f.status === 'PASS'));
  assert.equal(await readFile(join(root, paths[0]), 'utf8'), preview.proposals[0].content);
  assert.equal(await readFile(join(root, paths[1]), 'utf8'), preview.proposals[1].content);
  assert.equal(by(await runAudit(root), 'repo.pr-template').status, 'PASS');
  assert.equal(by(await runAudit(root), 'dx.editorconfig').status, 'PASS');
  const after = await planRemediation(root);
  assert.deepEqual(after.proposals, []);
  const noOp = await applyRemediation(root, after.planId);
  assert.deepEqual(noOp.changed, []);
  await assert.rejects(applyRemediation(root, preview.planId), /Stale plan/);
});

test('stale destination introduced after preview stops entire apply before any changes', async (t) => {
  const root = await fixture(t);
  const preview = await planRemediation(root);
  await writeFile(join(root, '.editorconfig'), 'CUSTOM\n');
  await assert.rejects(applyRemediation(root, preview.planId), /Stale plan/);
  assert.equal(await exists(join(root, '.github')), false);
  assert.equal(await readFile(join(root, '.editorconfig'), 'utf8'), 'CUSTOM\n');
});

test('symlinked parent is not followed or changed by remediation', async (t) => {
  const root = await fixture(t);
  const outside = await fixture(t);
  await symlink(outside, join(root, '.github'));
  const plan = await planRemediation(root);
  assert.deepEqual(plan.proposals.map((x) => x.path), ['.editorconfig']);
  await applyRemediation(root, plan.planId);
  assert.equal(await exists(join(outside, 'pull_request_template.md')), false);
  assert.equal(by(await runAudit(root), 'repo.pr-template').status, 'UNKNOWN');
});

test('symlinked destination is UNKNOWN, not considered safely missing', async (t) => {
  const root = await fixture(t);
  const outside = await fixture(t);
  await writeFile(join(outside, 'external.txt'), 'DO NOT CHANGE\n');
  await symlink(join(outside, 'external.txt'), join(root, '.editorconfig'));
  const preview = await planRemediation(root);
  assert.deepEqual(preview.proposals.map((x) => x.path), ['.github/pull_request_template.md']);
  await applyRemediation(root, preview.planId);
  assert.equal(await readFile(join(outside, 'external.txt'), 'utf8'), 'DO NOT CHANGE\n');
});

test('does not replace alternate PR templates or existing EditorConfig', async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, 'docs'));
  await writeFile(join(root, 'docs/PULL_REQUEST_TEMPLATE.md'), 'Existing template\n');
  await writeFile(join(root, '.editorconfig'), 'Existing settings\n');
  const result = await planRemediation(root);
  assert.deepEqual(result.proposals, []);
  const applied = await applyRemediation(root, result.planId);
  assert.deepEqual(applied.changed, []);
  assert.equal(await readFile(join(root, 'docs/PULL_REQUEST_TEMPLATE.md'), 'utf8'), 'Existing template\n');
});

test('does not create fixes for disabled rules, security concerns, or missing licenses', async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, '.repotend.yml'), 'schema: 1\nrules:\n  repo.pr-template:\n    enabled: false\n');
  const preview = await planRemediation(root);
  assert.deepEqual(preview.proposals.map((x) => x.ruleId), ['dx.editorconfig']);
  const result = await applyRemediation(root, preview.planId);
  assert.deepEqual(result.changed, ['.editorconfig']);
  assert.equal(await exists(join(root, 'LICENSE')), false);
});

test('verified enforced failure is eligible for a fix, not treated as UNKNOWN', async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, '.repotend.yml'), 'schema: 1\nrules:\n  repo.pr-template:\n    enforce: true\n');
  const audit = await runAudit(root);
  assert.equal(by(audit, 'repo.pr-template').status, 'FAIL');
  assert.equal((await planRemediation(root)).proposals.length, 2);
});

test('invalid config cannot produce proposed edits', async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, '.repotend.yml'), 'schema: broken\n');
  await assert.rejects(planRemediation(root), /schema: 1 is required/);
});

test('missing and malformed plan IDs never change repository', async (t) => {
  const root = await fixture(t);
  await assert.rejects(applyRemediation(root, 'bad'), RemediationError);
  await assert.rejects(applyRemediation(root, '0'.repeat(64)), /Stale plan/);
  assert.deepEqual(await readdir(root), []);
});

test('CLI previews JSON without writes and requires reviewed plan for applying', async (t) => {
  const root = await fixture(t);
  const cli = join(process.cwd(), 'skills/repotend/scripts/remediate.mjs');
  const run = (...args) => spawnSync(process.execPath, [cli, '--root', root, '--format', 'json', ...args], { encoding: 'utf8' });
  const preview = run();
  assert.equal(preview.status, 0, preview.stderr);
  const plan = JSON.parse(preview.stdout);
  assert.equal(plan.proposals.length, 2);
  assert.deepEqual(await readdir(root), []);
  assert.equal(run('--apply').status, 2);
  assert.deepEqual(await readdir(root), []);
  const apply = run('--apply', plan.planId);
  assert.equal(apply.status, 0, apply.stderr);
  const changed = JSON.parse(apply.stdout);
  assert.deepEqual(changed.changed, paths);
  assert(changed.verified.every((f) => f.status === 'PASS'));
  assert.equal(run('--apply', plan.planId).status, 2);
  assert.equal(JSON.parse(run().stdout).proposals.length, 0);
});

test('CLI rejects unknown arguments and malformed options without writing', async (t) => {
  const root = await fixture(t);
  const cli = join(process.cwd(), 'skills/repotend/scripts/remediate.mjs');
  const failed = spawnSync(process.execPath, [cli, '--root', root, '--format', 'xml'], { encoding: 'utf8' });
  assert.equal(failed.status, 2);
  assert.deepEqual(await readdir(root), []);
});
