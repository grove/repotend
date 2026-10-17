#!/usr/bin/env node
/** Lean syntax and safety lint for the current Node-focused repository. */
import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { parseDocument } from 'yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
const excluded = new Set(['.git', 'node_modules', 'dist', 'coverage']);

async function files(folder = '') {
  const found = [];
  for (const entry of await readdir(join(root, folder), { withFileTypes: true })) {
    const rel = folder ? folder + '/' + entry.name : entry.name;
    if (entry.isDirectory() && !excluded.has(entry.name)) found.push(...await files(rel));
    else if (entry.isFile() && /\.(?:ts|mjs|js|cjs|ya?ml)$/i.test(rel)) found.push(rel);
  }
  return found.sort();
}

export function yamlDiagnostics(contents) {
  const doc = parseDocument(contents, { uniqueKeys: true, strict: true, version: '1.2' });
  return doc.errors.map((e) => e.message);
}

async function main() {
  const problems = [];
  for (const path of await files()) {
    if (/\.(?:mjs|js|cjs)$/i.test(path)) {
      const result = spawnSync(process.execPath, ['--check', join(root, path)], { encoding: 'utf8', timeout: 10000 });
      if (result.status !== 0) problems.push(`${path}: JavaScript syntax error: ${result.stderr.slice(0, 250)}`);
    }
    if (/\.ya?ml$/i.test(path)) {
      const content = await readFile(join(root, path), 'utf8');
      for (const error of yamlDiagnostics(content)) problems.push(`${path}: YAML: ${error}`);
    }
  }
  if (problems.length) {
    process.stderr.write(problems.join('\n') + '\n');
    process.exitCode = 1;
  } else process.stdout.write('JavaScript and YAML syntax checks passed.\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Lint failed: ${error instanceof Error ? error.message : 'unknown error'}\n`);
    process.exitCode = 2;
  });
}
