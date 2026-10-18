import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const entrypoint = fileURLToPath(new URL('../skills/repotend/scripts/audit.mjs', import.meta.url));
// Refuse engine loading in both the entrypoint and its child, so an audit attempt cannot pass silently.
const guard = `import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('/engine.ts')) throw new Error('Audit engine must not load');
  return nextResolve(specifier, context);
} });`;

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'repotend-cli-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, '.repotend.yml'), 'invalid configuration: [\n');
  return root;
}

function run(root, args) {
  const result = spawnSync(process.execPath, [entrypoint, ...args], {
    cwd: root, encoding: 'utf8', timeout: 10_000,
    env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=data:text/javascript,${encodeURIComponent(guard)}` },
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}

async function unchanged(root) {
  assert.deepEqual(await readdir(root), ['.repotend.yml']);
  assert.equal(await readFile(join(root, '.repotend.yml'), 'utf8'), 'invalid configuration: [\n');
}

test('R1 help explains usage and defaults without loading the audit engine', async (t) => {
  const root = await fixture(t);
  for (const args of [['--help'], ['--root', join(root, 'missing'), '--help']]) {
    const result = run(root, args);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    assert.match(result.stdout, /Usage:.*audit\.mjs/);
    assert.match(result.stdout, /--root PATH.*default: current (?:working )?directory/i);
    assert.match(result.stdout, /--format markdown\|json.*default: markdown/i);
    assert.match(result.stdout, /--help/);
    assert.match(result.stdout, /Node\.js 22\.16\+/);
    assert.doesNotMatch(result.stdout, /"findings"|RepoTend audit report/);
  }
  await unchanged(root);
});

test('R2 invalid format names the supported formats without loading the audit engine', async (t) => {
  const root = await fixture(t);
  for (const args of [['--format', 'xml'], ['--root', join(root, 'missing'), '--format', 'xml']]) {
    const result = run(root, args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Invalid format.*xml/);
    assert.match(result.stderr, /Supported formats: markdown, json/);
    assert.doesNotMatch(result.stderr, /Audit engine must not load|ENOENT|configuration/);
  }
  await unchanged(root);
});
