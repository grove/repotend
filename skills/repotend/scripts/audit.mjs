#!/usr/bin/env node
/**
 * Experimental, dependency-free, read-only RepoTend bootstrap audit.
 * Not the general rules engine described in docs/DESIGN.md.
 */
import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const MAX_WORKFLOW_BYTES = 256 * 1024;
const RULE_VERSION = '1';

function withinRoot(root, filePath) {
  const candidate = resolve(root, filePath);
  const remainder = relative(root, candidate);
  if (isAbsolute(remainder) || remainder === '..' || remainder.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) {
    throw new Error(`Path escapes the audit root: ${filePath}`);
  }
  return candidate;
}

async function safeLstat(root, filePath) {
  const parts = relative(root, withinRoot(root, filePath)).split(/[\\/]/);
  let current = root;
  for (const part of parts) {
    current = join(current, part);
    const stats = await lstat(current);
    if (stats.isSymbolicLink()) return { kind: 'unknown', reason: 'Symlinked path segment is not followed' };
    if (part === parts.at(-1) && current === withinRoot(root, filePath)) return { kind: 'present', stats };
  }
  return { kind: 'unknown', reason: 'Cannot inspect path' };
}

async function probeFile(root, filePath) {
  try {
    const inspected = await safeLstat(root, filePath);
    if (inspected.kind === 'unknown') return inspected;
    const stats = inspected.stats;
    if (!stats.isFile()) return { kind: 'unknown', reason: 'Not a regular file' };
    return { kind: 'present', size: stats.size };
  } catch (error) {
    if (error?.code === 'ENOENT') return { kind: 'missing' };
    return { kind: 'unknown', reason: `Cannot inspect file: ${error.code ?? 'unknown error'}` };
  }
}

async function listFiles(root, folder, extensionPattern) {
  try {
    const inspected = await safeLstat(root, folder);
    if (inspected.kind === 'unknown') return inspected;
    if (!inspected.stats.isDirectory()) {
      return { kind: 'unknown', reason: 'Not a directory' };
    }
    const entries = await readdir(withinRoot(root, folder), { withFileTypes: true });
    if (entries.some((e) => e.isSymbolicLink() && extensionPattern.test(e.name))) {
      return { kind: 'unknown', reason: 'Matching symlinked file is not followed' };
    }
    return {
      kind: 'present',
      paths: entries.filter((e) => e.isFile() && extensionPattern.test(e.name))
        .map((e) => `${folder}/${e.name}`).sort(),
    };
  } catch (error) {
    if (error?.code === 'ENOENT') return { kind: 'missing', paths: [] };
    return { kind: 'unknown', reason: `Cannot list directory: ${error.code ?? 'unknown error'}` };
  }
}

function finding(ruleId, status, summary, evidence = [], note, confidence = 'verified') {
  return {
    ruleId, ruleVersion: RULE_VERSION, status, severity: 'warning', confidence,
    summary, evidence: evidence.map((path) => ({ path })),
    recommendation: note ?? null, enforced: false,
  };
}

async function requiredFile(root, ruleId, path, description) {
  const state = await probeFile(root, path);
  if (state.kind === 'present') return finding(ruleId, 'PASS', `${description} is present`, [path]);
  if (state.kind === 'unknown') return finding(ruleId, 'UNKNOWN', `${description} could not be checked`, [path], state.reason);
  return finding(ruleId, 'WARN', `${description} is missing`, [path], `Consider adding ${path} if relevant to this repository.`);
}

async function firstAvailable(root, ruleId, paths, description) {
  let uncertain = null;
  for (const candidate of paths) {
    const state = await probeFile(root, candidate);
    if (state.kind === 'present') return finding(ruleId, 'PASS', `${description} is present`, [candidate]);
    if (state.kind === 'unknown') uncertain = { path: candidate, reason: state.reason };
  }
  if (uncertain) return finding(ruleId, 'UNKNOWN', `${description} could not be fully checked`, [uncertain.path], uncertain.reason);
  return finding(ruleId, 'WARN', `${description} was not found`, paths, 'Add a concise PR template that explains why, what, and how changes were tested.');
}

async function issueForms(root) {
  const state = await listFiles(root, '.github/ISSUE_TEMPLATE', /\.(?:yml|yaml|md)$/i);
  if (state.kind === 'unknown') return finding('repo.issue-templates', 'UNKNOWN', 'Issue templates could not be inspected', [], state.reason);
  const forms = state.paths.filter((p) => !/\/config\.ya?ml$/i.test(p));
  if (forms.length) return finding('repo.issue-templates', 'PASS', 'Issue templates are present', forms);
  return finding('repo.issue-templates', 'WARN', 'No issue templates found', ['.github/ISSUE_TEMPLATE'], 'Start with lightweight bug and feature request forms.');
}

async function workflowPermissions(root) {
  const state = await listFiles(root, '.github/workflows', /\.ya?ml$/i);
  if (state.kind === 'unknown') return finding('security.workflow-permissions', 'UNKNOWN', 'Workflow files could not be inspected', [], state.reason);
  if (state.paths.length === 0) return finding('security.workflow-permissions', 'NOT_APPLICABLE', 'No GitHub Actions workflows found');

  const missing = [];
  const uncertain = [];
  for (const path of state.paths) {
    const file = await probeFile(root, path);
    if (file.kind !== 'present' || file.size > MAX_WORKFLOW_BYTES) {
      uncertain.push(path);
      continue;
    }
    try {
      const content = await readFile(withinRoot(root, path), 'utf8');
      // Intentionally heuristic: a permissions stanza may be workflow- or job-scoped.
      if (!/^[ \t]*permissions[ \t]*:/m.test(content.replace(/^\s*#.*$/gm, ''))) missing.push(path);
    } catch { uncertain.push(path); }
  }
  if (uncertain.length) return finding('security.workflow-permissions', 'UNKNOWN', 'One or more workflows could not be checked', uncertain, 'Check unreadable or unusually large workflow files.');
  if (missing.length) return finding('security.workflow-permissions', 'WARN', 'Explicit token permissions were not detected in some workflows', missing, 'Review GITHUB_TOKEN scopes and inherited repository defaults. This is a textual heuristic, not a security verdict.', 'heuristic');
  return finding('security.workflow-permissions', 'PASS', 'An explicit permissions stanza was detected in each workflow', state.paths, 'Presence does not prove that the requested permissions are least-privilege.', 'heuristic');
}

export async function runAudit(repositoryRoot = process.cwd()) {
  const root = await realpath(resolve(repositoryRoot));
  const findings = [
    await requiredFile(root, 'repo.license-present', 'LICENSE', 'License'),
    await requiredFile(root, 'repo.contributing', 'CONTRIBUTING.md', 'Contribution guide'),
    await requiredFile(root, 'repo.code-of-conduct', 'CODE_OF_CONDUCT.md', 'Code of conduct'),
    await requiredFile(root, 'repo.security-policy', 'SECURITY.md', 'Security policy'),
    await firstAvailable(root, 'repo.pr-template', [
      '.github/pull_request_template.md', '.github/PULL_REQUEST_TEMPLATE.md',
      'PULL_REQUEST_TEMPLATE.md', 'docs/PULL_REQUEST_TEMPLATE.md',
    ], 'Pull request template'),
    await issueForms(root),
    await requiredFile(root, 'dx.editorconfig', '.editorconfig', 'EditorConfig'),
    await workflowPermissions(root),
  ];
  return {
    schemaVersion: '0.1', toolVersion: '0.0.1-dogfood',
    repository: { path: '.' }, mode: 'audit', findings, errors: [],
  };
}

const escapeCell = (value) => String(value).replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ').replaceAll('`', '\\`');

export function renderMarkdown(report) {
  const counts = Object.fromEntries(['PASS', 'WARN', 'FAIL', 'UNKNOWN', 'NOT_APPLICABLE']
    .map((status) => [status, report.findings.filter((f) => f.status === status).length]));
  const header = [
    '## RepoTend self-audit (experimental)', '',
    '> Advisory only. A PASS indicates only that a narrow check was satisfied, not that the repository is secure or fully compliant.', '',
    `**${counts.PASS} passed · ${counts.WARN} warnings · ${counts.UNKNOWN} unknown · ${counts.NOT_APPLICABLE} not applicable**`, '',
    '| Status | Rule | Observation |', '| --- | --- | --- |',
  ];
  for (const f of report.findings) {
    header.push(`| ${f.status} | \`${escapeCell(f.ruleId)}\` | ${escapeCell(f.summary)} |`);
  }
  return [...header, '', 'This bootstrap auditor does not support enforcement or autofixes. See `docs/DOGFOODING.md`.', ''].join('\n');
}

async function main() {
  let format = 'markdown';
  let root = process.cwd();
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--format' && args[i + 1]) format = args[++i];
    else if (args[i] === '--root' && args[i + 1]) root = args[++i];
    else throw new Error(`Unknown/incomplete option: ${args[i]}`);
  }
  if (!['json', 'markdown'].includes(format)) throw new Error(`Unsupported format: ${format}`);
  const report = await runAudit(root);
  process.stdout.write(format === 'json' ? `${JSON.stringify(report, null, 2)}\n` : renderMarkdown(report));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    process.stderr.write(`RepoTend audit could not complete: ${error.message}\n`);
    process.exitCode = 2;
  });
}
