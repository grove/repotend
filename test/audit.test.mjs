import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runAudit, renderMarkdown } from '../skills/repotend/scripts/engine.ts';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'repotend-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function put(root, path, data = 'sample\n') {
  const parts = path.split('/');
  if (parts.length > 1) await mkdir(join(root, ...parts.slice(0, -1)), { recursive: true });
  await writeFile(join(root, ...parts), data);
}
const status = (r, id) => r.findings.find((f) => f.ruleId === id).status;

test('empty repo: warnings are advisory and workflows are not applicable', async (t) => {
  const root = await fixture(t);
  const report = await runAudit(root);
  assert.equal(report.findings.length, 8);
  assert.equal(report.findings.filter((f) => f.status === 'FAIL').length, 0);
  assert.equal(status(report, 'repo.license-present'), 'WARN');
  assert.equal(status(report, 'security.workflow-permissions'), 'NOT_APPLICABLE');
  assert.deepEqual(report.errors, []);
});

test('repository files and explicit workflow permissions pass narrow checks', async (t) => {
  const root = await fixture(t);
  for (const p of ['LICENSE', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', '.editorconfig', '.github/pull_request_template.md', '.github/ISSUE_TEMPLATE/bug_report.yml']) await put(root, p);
  await put(root, '.github/workflows/check.yml', 'name: check\npermissions:\n  contents: read\n');
  const report = await runAudit(root);
  assert(report.findings.every((f) => f.status === 'PASS'));
  assert.match(renderMarkdown(report), /8 passed · 0 warnings/);
});

test('permissions heuristic warns without a permissions stanza', async (t) => {
  const root = await fixture(t);
  await put(root, '.github/workflows/check.yml', 'name: check\n# permissions: write-all\njobs: {}\n');
  const report = await runAudit(root);
  assert.equal(status(report, 'security.workflow-permissions'), 'WARN');
  assert.equal(report.findings.find((f) => f.ruleId === 'security.workflow-permissions').confidence, 'heuristic');
});

test('symlinked required files are unknown, not accepted', async (t) => {
  const root = await fixture(t);
  await symlink(join(tmpdir(), 'external-license'), join(root, 'LICENSE'));
  const report = await runAudit(root);
  assert.equal(status(report, 'repo.license-present'), 'UNKNOWN');
});

test('runs deterministically without modifying repository files', async (t) => {
  const root = await fixture(t);
  await put(root, 'LICENSE', 'Apache\n');
  const before = await readdir(root);
  const one = JSON.stringify(await runAudit(root));
  const two = JSON.stringify(await runAudit(root));
  assert.equal(one, two);
  assert.deepEqual(await readdir(root), before);
});

test('issue-form config by itself does not count as an issue template', async (t) => {
  const root = await fixture(t);
  await put(root, '.github/ISSUE_TEMPLATE/config.yml', 'blank_issues_enabled: true\n');
  const report = await runAudit(root);
  assert.equal(status(report, 'repo.issue-templates'), 'WARN');
});

test('symlinked parent directories are not traversed', async (t) => {
  const root = await fixture(t);
  const external = await fixture(t);
  await put(external, 'workflows/other.yml', 'permissions: write-all\n');
  await symlink(external, join(root, '.github'));
  const report = await runAudit(root);
  assert.equal(status(report, 'repo.pr-template'), 'UNKNOWN');
  assert.equal(status(report, 'security.workflow-permissions'), 'UNKNOWN');
});
