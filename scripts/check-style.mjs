#!/usr/bin/env node
/** Small, dependency-free formatting gate guided by .editorconfig. */
import { spawnSync } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const root = fileURLToPath(new URL('../', import.meta.url));
const supported = /\.(?:ts|tsx|mjs|js|cjs|json|ya?ml|md)$/i;
const skipFolders = new Set(['.git', 'node_modules', 'dist', 'coverage']);

async function discover() {
  const git = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: root, encoding: 'utf8', timeout: 5000,
  });
  if (git.status === 0) return git.stdout.split('\0').filter((s) => s && supported.test(s)).sort();
  const found = [];
  async function walk(dir) {
    for (const item of await readdir(join(root, dir), { withFileTypes: true })) {
      const rel = dir ? dir + '/' + item.name : item.name;
      if (item.isDirectory() && !skipFolders.has(item.name)) await walk(rel);
      else if (item.isFile() && supported.test(rel)) found.push(rel);
    }
  }
  await walk('');
  return found.sort();
}

/** Pure formatter used by the checks. Deliberately does not reflow code/Markdown. */
export function normalized(path, original) {
  let value = original.replace(/\r\n/g, '\n');
  // Markdown explicitly permits trailing whitespace for hard line breaks.
  if (!path.toLowerCase().endsWith('.md')) value = value.replace(/[ \t]+(?=\n|$)/g, '');
  value = value.replace(/\n+$/, '') + '\n';
  if (/\.json$/i.test(path)) {
    const data = JSON.parse(value);
    value = JSON.stringify(data, null, 2) + '\n';
  }
  return value;
}

export function styleIssues(path, original) {
  const issues = [];
  if (original.includes('\r')) issues.push('non-LF line endings');
  if (!original.endsWith('\n')) issues.push('missing final newline');
  if (/\n\n+$/.test(original)) issues.push('extra trailing blank lines');
  if (!path.toLowerCase().endsWith('.md') && /[ \t]+(?=\r?\n|$)/m.test(original)) issues.push('trailing whitespace');
  if (/\.(?:ts|tsx|mjs|js|cjs|json|ya?ml)$/i.test(path) && /^\t/m.test(original)) issues.push('tab indentation');
  try {
    if (normalized(path, original) !== original && !issues.length) issues.push('noncanonical JSON/whitespace');
  } catch (error) {
    issues.push(`invalid JSON: ${error instanceof Error ? error.message : 'invalid value'}`);
  }
  return issues;
}

async function main() {
  const write = process.argv.slice(2).includes('--write');
  if (process.argv.slice(2).some((x) => x !== '--write')) throw new Error('Usage: node scripts/check-style.mjs [--write]');
  const issues = [];
  for (const path of await discover()) {
    const file = join(root, path);
    const value = await readFile(file, 'utf8');
    if (write) {
      const formatted = normalized(path, value);
      if (formatted !== value) await writeFile(file, formatted);
    } else {
      for (const issue of styleIssues(path, value)) issues.push(`${path}: ${issue}`);
    }
  }
  if (issues.length) {
    process.stderr.write(issues.join('\n') + '\nRun npm run format to fix safe whitespace/JSON differences.\n');
    process.exitCode = 1;
  } else process.stdout.write(write ? 'RepoTend basic formatting updated.\n' : 'RepoTend basic formatting is consistent.\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`Style check failed: ${error instanceof Error ? error.message : 'unknown error'}\n`);
    process.exitCode = 2;
  });
}
