import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { runAudit } from '../skills/repotend/scripts/engine.ts';
import { verifyGitHub } from '../skills/repotend/scripts/github.ts';

const workflow = `on:
  pull_request:
    paths: ['src/**']
jobs:
  test:
    name: Tests
    runs-on: ubuntu-latest
    steps: [{run: 'echo test'}]
`;
const protection = { url: 'https://api.github.com/repos/example/project/branches/main/protection', required_status_checks: null };
const required = (context = 'Tests') => ({ type: 'required_status_checks', ruleset_id: 42,
  ruleset_source_type: 'Organization', ruleset_source: 'example',
  parameters: { required_status_checks: [{ context, integration_id: 15368 }] } });
async function fixture(t, source = workflow) {
  const root = await mkdtemp(join(tmpdir(), 'repotend-github-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, '.github/workflows'), { recursive: true });
  await writeFile(join(root, '.github/workflows/test.yml'), source);
  return root;
}
function options(root, extra = {}) { return { root, repo: 'example/project', branch: 'main', allowRemote: true, ...extra }; }
function mock({ rules = [], classic = protection, inventory = [] } = {}) {
  const calls = [];
  const get = (endpoint, paginated) => {
    calls.push({ endpoint, paginated });
    const data = endpoint.includes('/rules/branches/') ? rules : endpoint.includes('/protection') ? classic : inventory;
    return data?.status ? data : { data };
  };
  return { get, calls };
}

test('explicit opt-in is required; ordinary audit and unapproved context never use the connection', async (t) => {
  const root = await fixture(t);
  const before = await runAudit(root);
  const context = await verifyGitHub(options(root, { allowRemote: false }), () => assert.fail('Remote access without opt-in'));
  assert.equal(context.status, 'not verified');
  assert.equal(context.comparisons[0].status, 'not verified');
  assert.equal(context.requiredCheckConfigurationComplete, false);
  assert(context.policies.every((p) => p.reason.includes('--allow-remote')));
  assert.deepEqual(await runAudit(root), before);
  assert.equal(before.findings.find((f) => f.ruleId === 'ci.path-filter-safety').status, 'WARN');
});

test('applicable active rules are evaluated by GitHub for the exact branch, including slash names', async (t) => {
  const root = await fixture(t);
  const { get, calls } = mock({ rules: [required()] });
  const context = await verifyGitHub(options(root, { branch: 'release/next' }), get);
  assert.equal(context.status, 'remote-verified');
  assert.equal(context.branch, 'release/next');
  assert.equal(context.repository, 'example/project');
  assert(Number.isFinite(Date.parse(context.startedAt)));
  assert(Date.parse(context.completedAt) >= Date.parse(context.startedAt));
  assert.deepEqual(calls, [
    { endpoint: 'repos/example/project/rules/branches/release%2Fnext?per_page=100', paginated: true },
    { endpoint: 'repos/example/project/branches/release%2Fnext/protection', paginated: false },
    { endpoint: 'repos/example/project/rulesets?includes_parents=true&per_page=100', paginated: true },
  ]);
  const comparison = context.comparisons[0];
  assert.equal(comparison.conclusion, 'required-check-name-matches-filtered-job');
  assert.equal(comparison.status, 'remote-verified');
  assert.deepEqual(comparison.matches, [{ context: 'Tests', appId: 15368, policy: 'ruleset:42' }]);
  assert.deepEqual(comparison.evidence, { path: '.github/workflows/test.yml', line: 6 });
  assert.deepEqual(comparison.events, ['pull_request']);
  assert.equal(await readFile(join(root, '.github/workflows/test.yml'), 'utf8'), workflow);
});

test('classic protection preserves context and app constraints without double counting contexts', async (t) => {
  const root = await fixture(t);
  const { get } = mock({ classic: { ...protection, required_status_checks: {
    contexts: ['Tests', 'other'], checks: [{ context: 'Tests', app_id: 99 }],
  } } });
  const context = await verifyGitHub(options(root), get);
  assert.equal(context.comparisons[0].matches[0].appId, 99);
  assert.equal(context.policies[1].checks.length, 2);
  const legacy = await verifyGitHub(options(root), mock({ classic: { ...protection,
    required_status_checks: { contexts: ['Tests'] } } }).get);
  assert.equal(legacy.comparisons[0].matches[0].appId, null);
});

test('no applicable required check and disabled/evaluate rulesets remain separate from local WARN', async (t) => {
  const root = await fixture(t);
  const inventory = ['disabled', 'evaluate', 'active'].map((enforcement, i) => ({
    id: i + 1, name: `${enforcement} policy`, source: 'example/project', enforcement,
  }));
  const context = await verifyGitHub(options(root), mock({ inventory, rules: [required('other')] }).get);
  assert.equal(context.status, 'remote-verified');
  assert.deepEqual(context.rulesets, inventory);
  assert.equal(context.comparisons[0].conclusion, 'no-matching-required-check');
  assert.equal((await runAudit(root)).findings.find((f) => f.ruleId === 'ci.path-filter-safety').status, 'WARN');
});

test('disabled ruleset plus denied branch protection never proves no required checks', async (t) => {
  const root = await fixture(t);
  const context = await verifyGitHub(options(root), mock({ inventory: [
    { id: 42, name: 'main', source: 'example/project', enforcement: 'disabled' },
  ], classic: { status: 'inaccessible/unknown', reason: 'HTTP 403: insufficient Administration permission' } }).get);
  assert.equal(context.status, 'inaccessible/unknown');
  assert.equal(context.requiredCheckConfigurationComplete, false);
  assert.equal(context.comparisons[0].conclusion, 'required-check-configuration-unknown');
  assert.match(context.policies[1].reason, /403/);
  const partial = await verifyGitHub(options(root), mock({ rules: [required()],
    classic: { status: 'inaccessible/unknown', reason: 'HTTP 404' } }).get);
  assert.equal(partial.status, 'inaccessible/unknown');
  assert.equal(partial.comparisons[0].status, 'remote-verified');
  assert.equal(partial.requiredCheckConfigurationComplete, false);
});

test('malformed, unsupported and inaccessible policy responses retain uncertainty', async (t) => {
  const root = await fixture(t);
  for (const data of [
    { rules: {} }, { rules: [{ type: 'required_status_checks', ruleset_id: 42, parameters: {} }] },
    { rules: [{ type: 'workflows', parameters: { workflows: [] } }] }, { classic: {} },
    { classic: { ...protection, required_status_checks: { contexts: ['Tests'], checks: [{}] } } },
    { inventory: [{ id: 1, name: 'policy', enforcement: 'unexpected', source: 'example/project' }] },
    { rules: { status: 'inaccessible/unknown', reason: 'Endpoint unavailable' } },
  ]) {
    const context = await verifyGitHub(options(root), mock(data).get);
    assert.equal(context.status, 'inaccessible/unknown', JSON.stringify(data));
  }
});

test('matrix, expressions and reusable workflows are unresolved; malformed local files remain visible', async (t) => {
  const root = await fixture(t, workflow + `  matrix:
    strategy: {matrix: {os: [ubuntu-latest]}}
    runs-on: ubuntu-latest
  dynamic:
    name: Test \${{ github.ref }}
    runs-on: ubuntu-latest
  reusable:
    uses: ./.github/workflows/reuse.yml
`);
  await writeFile(join(root, '.github/workflows/broken.yml'), 'on: [\n');
  const context = await verifyGitHub(options(root), mock().get);
  assert.equal(context.comparisons[0].conclusion, 'no-matching-required-check');
  assert(context.comparisons.slice(1).every((c) => c.status === 'not verified' && c.conclusion === 'check-name-unresolved'));
  assert.match(context.localProblems[0], /broken.yml/);
});

test('invalid repo and branch inputs are rejected before any API call', async (t) => {
  const root = await fixture(t);
  for (const extra of [{ repo: '../project' }, { repo: 'https://github.com/a/b' }, { branch: '' },
    { branch: 'main?x=y' }, { branch: 'refs/*' }, { branch: 'main\nother' }]) {
    await assert.rejects(verifyGitHub(options(root, extra), () => assert.fail('Invalid input sent remotely')));
  }
});

test('CLI uses only paginated GETs, sanitizes failures, and works without gh', async (t) => {
  const root = await fixture(t);
  const bin = join(root, 'bin');
  await mkdir(bin);
  const log = join(root, 'requests.jsonl');
  const gh = join(bin, 'gh');
  await writeFile(gh, `#!${process.execPath}
const fs = require('node:fs');
fs.appendFileSync(process.env.REQUEST_LOG, JSON.stringify(process.argv.slice(2)) + '\\n');
const endpoint = process.argv.at(-1);
if (process.env.FAIL_HTTP) {
  process.stderr.write('secret-must-not-leak (HTTP ' + process.env.FAIL_HTTP + ')');
  process.exit(1);
}
if (process.env.NO_AUTH) {
  process.stderr.write('Run gh auth login or set GH_TOKEN secret-must-not-leak');
  process.exit(1);
}
if (process.env.BAD_JSON) { process.stdout.write('{'); process.exit(0); }
process.stdout.write(JSON.stringify(endpoint.includes('/protection') ? ${JSON.stringify(protection)}
  : endpoint.includes('/rules/branches/') ? [[], [${JSON.stringify(required())}]] : [[]]));
`);
  await chmod(gh, 0o755);
  const cli = resolve('skills/repotend/scripts/verify-github.mjs');
  const env = { ...process.env, PATH: bin, REQUEST_LOG: log };
  const run = (args, extraEnv = {}) => spawnSync(process.execPath, [cli, '--root', root,
    '--repo', 'example/project', '--branch', 'main', ...args], { env: { ...env, ...extraEnv }, encoding: 'utf8', timeout: 30000 });
  const offline = run([]);
  assert.equal(offline.status, 0, offline.stderr);
  assert.equal(JSON.parse(offline.stdout).status, 'not verified');
  await assert.rejects(readFile(log), { code: 'ENOENT' });
  // The normal audit never invokes gh even when a connection is present.
  const audit = spawnSync(process.execPath, [resolve('skills/repotend/scripts/audit.mjs'), '--root', root, '--format', 'json'],
    { env, encoding: 'utf8', timeout: 30000 });
  assert.equal(audit.status, 0, audit.stderr);
  await assert.rejects(readFile(log), { code: 'ENOENT' });
  const verified = run(['--allow-remote']);
  assert.equal(verified.status, 0, verified.stderr);
  assert.equal(JSON.parse(verified.stdout).comparisons[0].matches.length, 1);
  const requests = (await readFile(log, 'utf8')).trim().split('\n').map(JSON.parse);
  assert.equal(requests.length, 3);
  for (const request of requests) {
    assert.deepEqual(request.slice(0, 6), ['api', '--hostname', 'github.com', '--method', 'GET', '-H']);
    assert(!request.some((arg) => ['--input', '--field', '-f', '-F'].includes(arg)));
    assert.equal(request.includes('--paginate'), !request.at(-1).endsWith('/protection'));
    assert.equal(request.includes('--slurp'), request.includes('--paginate'));
  }
  for (const code of ['401', '403', '404', '429', '500']) {
    const denied = run(['--allow-remote'], { FAIL_HTTP: code });
    assert.equal(denied.status, 0, denied.stderr);
    const context = JSON.parse(denied.stdout);
    assert.equal(context.status, 'inaccessible/unknown');
    assert.equal(context.requiredCheckConfigurationComplete, false);
    assert.match(context.policies[0].reason, new RegExp(code));
    assert(!denied.stdout.includes('secret-must-not-leak'));
  }
  const bad = run(['--allow-remote'], { BAD_JSON: '1' });
  assert.equal(JSON.parse(bad.stdout).status, 'inaccessible/unknown');
  for (const extraEnv of [{ PATH: join(root, 'absent-bin') }, { NO_AUTH: '1' }]) {
    const missing = run(['--allow-remote'], extraEnv);
    assert.equal(missing.status, 0, missing.stderr);
    assert.equal(JSON.parse(missing.stdout).status, 'not verified');
    assert(!missing.stdout.includes('secret-must-not-leak'));
  }
  assert.equal(run(['--apply']).status, 2);
  assert.equal(await readFile(join(root, '.github/workflows/test.yml'), 'utf8'), workflow);
});
