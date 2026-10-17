import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runAudit } from '../skills/repotend/scripts/engine.ts';

const base = 'name: Checks\non: pull_request\npermissions: { contents: read }\nconcurrency:\n  group: audit-${{ github.ref }}\n  cancel-in-progress: true\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683\n      - run: echo ok\n';
async function repo(t, text = base) {
  const root = await mkdtemp(join(tmpdir(), 'repotend-workflow-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, '.github/workflows'), { recursive: true });
  await writeFile(join(root, '.github/workflows/test.yml'), text);
  return root;
}
const finding = (report, id) => { const f = report.findings.find((x) => x.ruleId === id); assert(f, id); return f; };

test('valid GitHub workflow has no CI or security warnings', async (t) => {
  const root = await repo(t);
  const report = await runAudit(root);
  for (const id of ['ci.workflow-validity', 'security.workflow-permissions', 'ci.concurrency',
    'ci.duplicate-triggers', 'ci.path-filter-safety', 'security.action-pinning']) {
    assert.equal(finding(report, id).status, 'PASS', id);
  }
  assert.equal(finding(report, 'ci.workflow-validity').confidence, 'verified');
  assert.equal(finding(report, 'security.workflow-permissions').confidence, 'heuristic');
});

test('malformed YAML is a verified validity warning and other CI checks remain unknown', async (t) => {
  const root = await repo(t, 'name: malformed\non: [push\njobs:\n  foo: {}\n');
  const report = await runAudit(root);
  assert.equal(finding(report, 'ci.workflow-validity').status, 'WARN');
  assert.equal(finding(report, 'ci.concurrency').status, 'UNKNOWN');
  assert.equal(finding(report, 'security.action-pinning').status, 'UNKNOWN');
});

test('YAML 1.2 on key is recognized as event, not a boolean', async (t) => {
  const root = await repo(t, 'on: [push, pull_request]\njobs:\n  ok:\n    runs-on: ubuntu-latest\n    steps: []\n');
  const report = await runAudit(root);
  assert.equal(finding(report, 'ci.workflow-validity').status, 'PASS');
  assert.equal(finding(report, 'ci.concurrency').status, 'WARN');
  assert.equal(finding(report, 'ci.duplicate-triggers').status, 'WARN');
});

test('push on main only plus pull requests is not flagged as a duplicate', async (t) => {
  const root = await repo(t, base.replace('on: pull_request', 'on:\n  push:\n    branches: [main]\n  pull_request:'));
  const report = await runAudit(root);
  assert.equal(finding(report, 'ci.duplicate-triggers').status, 'PASS');
});

test('workflow and job-level permissions both considered; broad scopes are contextual warnings', async (t) => {
  const root = await repo(t, base.replace('permissions: { contents: read }', 'permissions: write-all'));
  const report = await runAudit(root);
  assert.equal(finding(report, 'security.workflow-permissions').status, 'WARN');
  assert.equal(finding(report, 'security.workflow-permissions').confidence, 'heuristic');
  assert(finding(report, 'security.workflow-permissions').evidence[0]?.line);
});

test('job-level permissions can satisfy an omitted workflow default', async (t) => {
  const root = await repo(t, base.replace('permissions: { contents: read }\n', '')
    .replace('    runs-on: ubuntu-latest', '    permissions: { contents: read }\n    runs-on: ubuntu-latest'));
  const report = await runAudit(root);
  assert.equal(finding(report, 'security.workflow-permissions').status, 'PASS');
});

test('missing permissions on one job does not pass when other jobs set them', async (t) => {
  const root = await repo(t, base.replace('permissions: { contents: read }\n', '')
    .replace('    runs-on: ubuntu-latest', '    permissions: { contents: read }\n    runs-on: ubuntu-latest')
    + '  unprotected:\n    runs-on: ubuntu-latest\n    steps: []\n');
  const report = await runAudit(root);
  assert.equal(finding(report, 'security.workflow-permissions').status, 'WARN');
});

test('event path filtering is advisory and includes evidence', async (t) => {
  const root = await repo(t, base.replace('on: pull_request', 'on:\n  pull_request:\n    paths: ["src/**"]'));
  const report = await runAudit(root);
  assert.equal(finding(report, 'ci.path-filter-safety').status, 'WARN');
  assert(finding(report, 'ci.path-filter-safety').evidence.length);
});

test('external floating tags and docker tags produce action-pinning warnings', async (t) => {
  const root = await repo(t, base.replace('actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683', 'actions/checkout@v4')
    .replace('      - run: echo ok', '      - uses: docker://alpine:latest\n      - run: echo ok'));
  const report = await runAudit(root);
  assert.equal(finding(report, 'security.action-pinning').status, 'WARN');
  assert.equal(finding(report, 'security.action-pinning').evidence.length, 2);
});

test('unconfigured cancellation is a recommendation, not a blocker', async (t) => {
  const root = await repo(t, base.replace(/concurrency:\n  group:.*\n  cancel-in-progress: true\n/, ''));
  const report = await runAudit(root);
  assert.equal(finding(report, 'ci.concurrency').status, 'WARN');
  assert.equal(finding(report, 'ci.concurrency').enforced, false);
});

test('workflow YAML duplicate keys are rejected, not silently normalized', async (t) => {
  const root = await repo(t, base + '\non: push\n');
  const report = await runAudit(root);
  assert.equal(finding(report, 'ci.workflow-validity').status, 'WARN');
});

test('observed heuristic rules cannot be enforced via policy config', async (t) => {
  const root = await repo(t);
  await writeFile(join(root, '.repotend.yml'), 'schema: 1\nrules:\n  ci.concurrency:\n    enforce: true\n');
  await assert.rejects(runAudit(root), /heuristic and cannot be enforced/);
});
