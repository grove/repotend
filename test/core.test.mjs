import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import test from 'node:test';
import { runAudit, renderMarkdown } from '../skills/repotend/scripts/engine.ts';
import { parseConfig, ConfigurationError } from '../skills/repotend/scripts/config.ts';

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'repotend-config-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function configFile(root, data) { await writeFile(join(root, '.repotend.yml'), data); }
const get = (r, id) => r.findings.find((f) => f.ruleId === id);
const ids = new Set(['repo.license-present', 'security.workflow-permissions']);

test('parses the documented mapping subset and defaults', () => {
  const config = parseConfig('schema: 1\nprofile: small-oss\nrules:\n  repo.license-present:\n    enabled: true\n    enforce: true\n', ids, new Set(['repo.license-present']));
  assert.deepEqual(config.rules['repo.license-present'], { enabled: true, enforce: true });
});

test('invalid config is rejected rather than silently ignored', () => {
  for (const text of [
    'profile: small-oss\n', 'schema: 2\n', 'schema: 1\nrules:\n  unrecognized.rule:\n    enabled: true\n',
    'schema: 1\nschema: 1\n', 'schema: 1\nprofile: enterprise\n',
    'schema: 1\nrules:\n  repo.license-present:\n    enabled: yes\n',
    'schema: 1\nrules: {}\n', 'schema: 1\nother: true\n',
    'schema: 1\nrules:\n  security.workflow-permissions:\n    enforce: true\n',
    'schema: 1\nrules:\n  repo.license-present:\n    enabled: false\n    enforce: true\n',
  ]) assert.throws(() => parseConfig(text, ids, new Set(['repo.license-present'])), ConfigurationError);
});

test('advisory warnings do not become failures unless explicitly enforced', async (t) => {
  const root = await fixture(t);
  const initial = await runAudit(root);
  assert.equal(get(initial, 'repo.license-present').status, 'WARN');
  await configFile(root, 'schema: 1\nrules:\n  repo.license-present:\n    enforce: true\n');
  const enforced = await runAudit(root);
  assert.equal(get(enforced, 'repo.license-present').status, 'FAIL');
  assert.equal(get(enforced, 'repo.contributing').status, 'WARN');
  assert.equal(get(enforced, 'repo.license-present').enforced, true);
});

test('disabled rules are omitted, not silently marked as passing', async (t) => {
  const root = await fixture(t);
  await configFile(root, 'schema: 1\nrules:\n  repo.license-present:\n    enabled: false\n');
  const report = await runAudit(root);
  assert.equal(get(report, 'repo.license-present'), undefined);
  assert.equal(report.findings.length, 12);
});

test('symlinked configuration is refused', async (t) => {
  const root = await fixture(t);
  const external = await fixture(t);
  await configFile(external, 'schema: 1\n');
  await symlink(join(external, '.repotend.yml'), join(root, '.repotend.yml'));
  await assert.rejects(runAudit(root), ConfigurationError);
});

test('unexpected rule errors are distinct from policy failure', async (t) => {
  const root = await fixture(t);
  const report = await runAudit(root, [{
    id: 'custom.fail', version: '1', category: 'ci', severity: 'error', enforceable: true,
    async check() { throw new Error('secret details must not leak'); },
  }]);
  assert.equal(report.findings[0].status, 'UNKNOWN');
  assert.equal(report.errors[0].code, 'RULE_EXECUTION');
  assert.doesNotMatch(JSON.stringify(report), /secret details/);
});

test('CLI exits 0 for warnings, 1 for enforced failure, 2 for malformed config', async (t) => {
  const root = await fixture(t);
  const cli = join(process.cwd(), 'skills/repotend/scripts/audit.mjs');
  const call = () => spawnSync(process.execPath, [cli, '--root', root, '--format', 'json'], { encoding: 'utf8' });
  const advisory = call();
  assert.equal(advisory.status, 0, advisory.stderr);
  assert.equal(JSON.parse(advisory.stdout).schemaVersion, '0.1');
  await configFile(root, 'schema: 1\nrules:\n  repo.license-present:\n    enforce: true\n');
  const enforced = call();
  assert.equal(enforced.status, 1, enforced.stderr);
  assert.equal(get(JSON.parse(enforced.stdout), 'repo.license-present').status, 'FAIL');
  await configFile(root, 'schema: wrong\n');
  const error = call();
  assert.equal(error.status, 2);
  assert.match(error.stderr, /schema: 1 is required/);
});

test('report output is deterministic and Markdown escapes table delimiters', async (t) => {
  const root = await fixture(t);
  const report1 = await runAudit(root);
  const report2 = await runAudit(root);
  assert.deepEqual(report1, report2);
  const rendered = renderMarkdown({ ...report1, findings: [{...report1.findings[0], summary: 'value | bad\nnewline'}] });
  assert.match(rendered, /value \\\| bad newline/);
});
