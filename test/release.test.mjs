import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { validateReleaseMetadata } from '../scripts/check-release.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (path) => JSON.parse(await readFile(join(project, path), 'utf8'));
const sample = async () => ({
  pkg: await readJson('package.json'),
  lock: await readJson('package-lock.json'),
  reportSchema: await readJson('schemas/report.schema.json'),
  remediationSchema: await readJson('schemas/remediation.schema.json'),
  audit: { toolVersion: '0.1.0', schemaVersion: '0.1', findings: Array.from({ length: 13 }, () => ({ status: 'PASS' })), errors: [] },
  remediation: { mode: 'remediate', schemaVersion: '0.1', proposals: [] },
});

test('release metadata contract accepts the candidate version, schema IDs, and clean self-checks', async () => {
  assert.deepEqual(validateReleaseMetadata(await sample()), []);
});

test('release preflight rejects drift in package-lock, runtime version, and schema tag', async () => {
  const base = await sample();
  const problems = (update) => {
    const copy = structuredClone(base);
    update(copy);
    return validateReleaseMetadata(copy);
  };
  assert(problems((value) => { value.lock.version = '0.1.0-dev'; }).some((x) => x.includes('package-lock')));
  assert(problems((value) => { value.audit.toolVersion = '0.1.0-dev'; }).some((x) => x.includes('toolVersion')));
  assert(problems((value) => { value.reportSchema.$id = value.reportSchema.$id.replace('v0.1.0', 'main'); }).some((x) => x.includes('$id')));
  assert(problems((value) => { value.remediation.proposals.push({}); }).some((x) => x.includes('propose changes')));
  assert(problems((value) => { value.pkg.version = '0.1.0-dev'; }).some((x) => x.includes('stable SemVer')));
});

test('release preflight command is read-only and exits successfully in this repository', () => {
  const runner = join(project, 'scripts/check-release.mjs');
  const result = spawnSync(process.execPath, [runner], { cwd: project, encoding: 'utf8', timeout: 90_000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /v0\.1\.0 pre-tag checks passed/);
  assert.match(result.stdout, /Not checked: remote schema URLs/);
});
