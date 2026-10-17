import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import test from 'node:test';
import { normalized, styleIssues } from '../scripts/check-style.mjs';
import { yamlDiagnostics } from '../scripts/lint.mjs';

test('EditorConfig-aligned formatting handles CRLF, trailing whitespace and final newline', () => {
  assert.deepEqual(styleIssues('example.ts', 'const a = 1;  \r\n'), ['non-LF line endings', 'trailing whitespace']);
  assert.equal(normalized('example.ts', 'const a = 1;  \r\n'), 'const a = 1;\n');
  assert(styleIssues('example.yml', 'a: value').includes('missing final newline'));
  assert(styleIssues('broken.json', '{ nope }').some((item) => item.startsWith('invalid JSON')));
  assert.equal(normalized('sample.json', '{"a":1}'), '{\n  "a": 1\n}\n');
});

test('Markdown hard line-break spaces remain permitted', () => {
  const markdown = 'Line with two spaces  \nNext line\n';
  assert.equal(normalized('docs/EXAMPLE.md', markdown), markdown);
  assert.deepEqual(styleIssues('docs/EXAMPLE.md', markdown), []);
});

test('YAML linter rejects malformed documents and duplicate keys', () => {
  assert.deepEqual(yamlDiagnostics('on:\n  push:\npermissions: {}\n'), []);
  assert(yamlDiagnostics('jobs: 1\njobs: 2\n').length > 0);
  assert(yamlDiagnostics('steps: [\n').length > 0);
});

test('repository formatter and syntax checker run in check-only mode', () => {
  const root = process.cwd();
  for (const script of ['check-style.mjs', 'lint.mjs']) {
    const result = spawnSync(process.execPath, [join(root, 'scripts', script)], { cwd: root, encoding: 'utf8', timeout: 20000 });
    assert.equal(result.status, 0, `${script}: ${result.stderr}`);
  }
});
