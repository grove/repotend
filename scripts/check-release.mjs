#!/usr/bin/env node
/** Read-only pre-tag release gate; does not publish, tag, or modify files. */
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const schemaRoot = 'https://json-schema.org/draft/2020-12/schema';

export function validateReleaseMetadata({ pkg, lock, audit, reportSchema, remediationSchema, remediation }) {
  const problems = [];
  const fail = (condition, message) => { if (!condition) problems.push(message); };
  const version = pkg?.version;
  fail(typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version),
    'package.json must use a stable SemVer version (no -dev suffix)');
  fail(pkg?.private === true, 'v0.1 is GitHub-only; keep the npm package private');
  fail(lock?.version === version && lock?.packages?.['']?.version === version,
    'package-lock.json root versions must match package.json');
  fail(audit?.toolVersion === version, 'audit toolVersion must match package.json');
  fail(audit?.schemaVersion === '0.1', 'audit must emit schemaVersion 0.1');
  fail(audit?.errors?.length === 0, 'self-audit must not contain execution errors');
  fail(Array.isArray(audit?.findings) && audit.findings.length === 13 &&
    audit.findings.every((item) => item.status === 'PASS'),
    'RepoTend self-audit must return 13 narrowly scoped PASS findings');
  fail(remediation?.mode === 'remediate' && remediation?.schemaVersion === '0.1' &&
    Array.isArray(remediation?.proposals) && remediation.proposals.length === 0,
    'RepoTend must not propose changes to itself in a release build');
  for (const [filename, schema] of [
    ['report.schema.json', reportSchema],
    ['remediation.schema.json', remediationSchema],
  ]) {
    const expected = `https://raw.githubusercontent.com/grove/repotend/v${version}/schemas/${filename}`;
    fail(schema?.$schema === schemaRoot, `${filename} must use JSON Schema Draft 2020-12`);
    fail(schema?.$id === expected, `${filename} $id must target the intended v${version} tag`);
  }
  fail(reportSchema?.properties?.schemaVersion?.const === '0.1',
    'audit JSON Schema must describe schemaVersion 0.1');
  fail(remediationSchema?.$defs?.plan?.properties?.schemaVersion?.const === '0.1' &&
    remediationSchema?.$defs?.outcome?.properties?.schemaVersion?.const === '0.1',
    'remediation JSON Schema must describe schemaVersion 0.1');
  return problems;
}

function jsonResult(script, args) {
  const result = spawnSync(process.execPath, [join(repo, script), '--root', repo, '--format', 'json', ...args], {
    cwd: repo, encoding: 'utf8', shell: false, timeout: 60_000, maxBuffer: 4 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${script} failed: ${result.error?.message ?? result.stderr?.trim() ?? `exit ${result.status}`}`);
  }
  try { return JSON.parse(result.stdout); }
  catch { throw new Error(`${script} produced invalid JSON`); }
}

async function main() {
  if (process.argv.length !== 2) throw new Error('Usage: node scripts/check-release.mjs');
  const readJson = async (path) => JSON.parse(await readFile(join(repo, path), 'utf8'));
  const [pkg, lock, reportSchema, remediationSchema] = await Promise.all([
    readJson('package.json'), readJson('package-lock.json'),
    readJson('schemas/report.schema.json'), readJson('schemas/remediation.schema.json'),
  ]);
  const audit = jsonResult('skills/repotend/scripts/audit.mjs', []);
  const remediation = jsonResult('skills/repotend/scripts/remediate.mjs', []);
  const problems = validateReleaseMetadata({ pkg, lock, audit, reportSchema, remediationSchema, remediation });
  if (problems.length) throw new Error(problems.join('\n'));
  process.stdout.write(`RepoTend v${pkg.version} pre-tag checks passed: ${audit.findings.length} self-audit PASS, no remediation proposals, aligned JSON Schema IDs.\n`);
  process.stdout.write('Not checked: remote schema URLs, tag ancestry, release assets, or GitHub Release publication (all require the post-merge tag).\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Release preflight failed: ${error instanceof Error ? error.message : 'unknown error'}\n`);
    process.exitCode = 2;
  });
}
