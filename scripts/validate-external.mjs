#!/usr/bin/env node
/**
 * Read-only smoke validation of two pinned, publicly available GitHub projects.
 * Executes git and RepoTend only; never installs/runs dependencies of the target.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const launcher = resolve(scriptDir, '../skills/repotend/scripts/audit.mjs');
const casesPath = resolve(scriptDir, '../test/external-repositories.json');
const SHA_RE = /^[0-9a-f]{40}$/;
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const GIT_ENV = {
  ...process.env,
  GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_NOSYSTEM: '1',
  GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null',
  GIT_LFS_SKIP_SMUDGE: '1',
};

function run(program, args, { timeout = 60_000, cwd, env = process.env } = {}) {
  const r = spawnSync(program, args, {
    cwd, encoding: 'utf8', env, timeout, maxBuffer: 3 * 1024 * 1024,
    windowsHide: true, shell: false,
  });
  if (r.error || r.status !== 0) {
    const diagnostics = (r.stderr || r.error?.message || 'unknown error').trim().slice(0, 500);
    throw new Error(`${program} failed (${r.status ?? 'no exit code'}): ${diagnostics}`);
  }
  return r.stdout.trim();
}

export function validateCases(cases) {
  if (!Array.isArray(cases) || cases.length === 0 || cases.length > 3) throw new Error('Expected 1–3 external cases');
  for (const item of cases) {
    if (!REPO_RE.test(item.repository) || !SHA_RE.test(item.commit)) throw new Error('Invalid pinned GitHub repository');
    if (!item.expected || Object.keys(item.expected).length === 0) throw new Error('Expected status assertions');
    if (Object.values(item.expected).some((x) => x !== 'PASS' && x !== 'WARN' && x !== 'NOT_APPLICABLE')) throw new Error('Unsupported expected status');
  }
  if (new Set(cases.map((x) => x.repository)).size !== cases.length) throw new Error('Duplicate external repository');
  return cases;
}

export function summarize(item, report) {
  if (report.schemaVersion !== '0.1' || !Array.isArray(report.findings) || (report.errors?.length ?? 0) > 0) {
    throw new Error(`Invalid or errored RepoTend report for ${item.repository}`);
  }
  const actual = Object.fromEntries(report.findings.map((f) => [f.ruleId, f.status]));
  const mismatches = Object.entries(item.expected).flatMap(([rule, expected]) =>
    actual[rule] === expected ? [] : [`${rule}: expected ${expected}, got ${actual[rule] ?? 'missing'}`]);
  const counts = Object.fromEntries(['PASS', 'WARN', 'FAIL', 'UNKNOWN', 'NOT_APPLICABLE']
    .map((s) => [s, report.findings.filter((f) => f.status === s).length]));
  return {
    repository: item.repository, commit: item.commit, purpose: item.purpose,
    counts, mismatches,
    findings: report.findings.map((f) => ({
      ruleId: f.ruleId, status: f.status, confidence: f.confidence,
      summary: f.summary, evidence: f.evidence,
    })),
  };
}

export function renderMarkdown(results) {
  const lines = [
    '## RepoTend external repository smoke (pinned commits)', '',
    '> Read-only local analysis after a pinned Git checkout. Warnings are advisory; no target code is executed.', '',
    '| Repository | PASS | WARN | UNKNOWN | N/A | Expectations |',
    '| --- | ---: | ---: | ---: | ---: | --- |',
  ];
  for (const r of results) {
    lines.push(`| [${r.repository}](https://github.com/${r.repository}/tree/${r.commit}) | ${r.counts.PASS} | ${r.counts.WARN} | ${r.counts.UNKNOWN} | ${r.counts.NOT_APPLICABLE} | ${r.mismatches.length ? 'Failed' : 'Met'} |`);
    for (const f of r.findings.filter((f) => f.status === 'WARN' || f.status === 'UNKNOWN')) {
      lines.push(`\n- **${r.repository} / \`${f.ruleId}\` (${f.status}):** ${f.summary}`);
    }
    for (const mismatch of r.mismatches) lines.push(`\n- **Unexpected result:** ${r.repository}: ${mismatch}`);
  }
  return lines.join('\n') + '\n';
}

async function checkRepo(item, workspace) {
  const target = join(workspace, item.repository.replace('/', '-'));
  run('git', ['-c', 'core.hooksPath=/dev/null', 'init', '--quiet', target], { env: GIT_ENV });
  run('git', ['-C', target, 'remote', 'add', 'origin', `https://github.com/${item.repository}.git`], { env: GIT_ENV });
  run('git', ['-C', target, '-c', 'protocol.file.allow=never', 'fetch', '--quiet', '--no-tags', '--depth=1', 'origin', item.commit], { env: GIT_ENV, timeout: 90_000 });
  run('git', ['-C', target, '-c', 'core.hooksPath=/dev/null', 'checkout', '--quiet', '--detach', 'FETCH_HEAD'], { env: GIT_ENV });
  const sha = run('git', ['-C', target, 'rev-parse', 'HEAD'], { env: GIT_ENV });
  if (sha !== item.commit) throw new Error(`Commit mismatch for ${item.repository}`);
  const result = run(process.execPath, [launcher, '--root', target, '--format', 'json'], { timeout: 45_000 });
  const report = JSON.parse(result);
  const after = run('git', ['-C', target, 'status', '--porcelain', '--untracked-files=all'], { env: GIT_ENV });
  if (after) throw new Error(`Audit modified ${item.repository}`);
  return summarize(item, report);
}

async function main() {
  const args = process.argv.slice(2);
  const format = args.length === 0 ? 'markdown' : args.length === 2 && args[0] === '--format' ? args[1] : null;
  if (format !== 'markdown' && format !== 'json') throw new Error('Usage: validate-external.mjs [--format markdown|json]');
  const cases = validateCases(JSON.parse(await readFile(casesPath, 'utf8')));
  const workspace = await mkdtemp(join(tmpdir(), 'repotend-external-'));
  try {
    const results = [];
    for (const item of cases) results.push(await checkRepo(item, workspace));
    process.stdout.write(format === 'json' ? JSON.stringify(results, null, 2) + '\n' : renderMarkdown(results));
    if (results.some((x) => x.mismatches.length)) process.exitCode = 1;
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`External validation failed: ${error instanceof Error ? error.message : 'unknown error'}\n`);
    process.exitCode = 2;
  });
}
