import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, mkdir, open, realpath, rmdir } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RepositoryReader, runAudit, type Finding, type Report } from './engine.ts';

/** Only explicitly registered, fixed-content files may be created. */
const FIXES = Object.freeze([
  {
    ruleId: 'repo.pr-template',
    path: '.github/pull_request_template.md',
    reason: 'Add a small PR template for motivation, changes, and verification.',
    content: `## Summary\n\n<!-- What changed? -->\n\n## Motivation\n\n<!-- Why is this needed? -->\n\n## Testing\n\n<!-- Commands and results, or why tests were not run. -->\n\n## Related issues\n\n<!-- Closes #123 / Refs #123, when applicable. -->\n`,
  },
  {
    ruleId: 'dx.editorconfig',
    path: '.editorconfig',
    reason: 'Add basic portable editor conventions without choosing an indentation style.',
    content: `root = true\n\n[*]\ncharset = utf-8\nend_of_line = lf\ninsert_final_newline = true\n`,
  },
] as const);

export type FixProposal = {
  ruleId: string;
  path: string;
  reason: string;
  content: string;
  diff: string;
};
export type FixPlan = {
  schemaVersion: '0.1';
  mode: 'remediate';
  planId: string;
  proposals: FixProposal[];
};
export type FixOutcome = {
  schemaVersion: '0.1';
  mode: 'apply';
  planId: string;
  changed: string[];
  verified: { ruleId: string; status: Finding['status'] }[];
};

export class RemediationError extends Error {
  constructor(message: string) { super(message); this.name = 'RemediationError'; }
}

function patchFor(path: string, content: string): string {
  const lines = content.endsWith('\n') ? content.slice(0, -1).split('\n') : content.split('\n');
  return [`--- /dev/null`, `+++ b/${path}`, `@@ -0,0 +1,${lines.length} @@`, ...lines.map((line) => `+${line}`)].join('\n') + '\n';
}

function planDigest(proposals: readonly FixProposal[]): string {
  const stable = proposals.map(({ ruleId, path, content }) => ({ ruleId, path, content }));
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

function isMissing(finding: Finding | undefined): boolean {
  // These two rules currently only produce WARN/FAIL for a verified absent file.
  // Do not propose changes for UNKNOWN, heuristic findings, or disabled checks.
  return finding !== undefined && (finding.status === 'WARN' || finding.status === 'FAIL')
    && finding.confidence === 'verified';
}

export async function planRemediation(repositoryRoot = process.cwd()): Promise<FixPlan> {
  const root = await realpath(resolve(repositoryRoot));
  const report: Report = await runAudit(root);
  if (report.errors.length) throw new RemediationError('Audit reported execution errors; refusing to propose fixes');
  const reader = new RepositoryReader(root);
  const proposals: FixProposal[] = [];
  for (const fix of FIXES) {
    const finding = report.findings.find((item) => item.ruleId === fix.ruleId);
    if (!isMissing(finding)) continue;
    const target = await reader.probe(fix.path);
    if (target.kind !== 'missing') continue;
    proposals.push({ ruleId: fix.ruleId, path: fix.path, reason: fix.reason,
      content: fix.content, diff: patchFor(fix.path, fix.content) });
  }
  return { schemaVersion: '0.1', mode: 'remediate', planId: planDigest(proposals), proposals };
}

function safePath(root: string, filePath: string): string {
  const path = resolve(root, filePath);
  const remainder = relative(root, path);
  if (!remainder || isAbsolute(remainder) || remainder === '..' || remainder.startsWith('..' + sep)) {
    throw new RemediationError('Destination escapes the repository root');
  }
  return path;
}

async function inspectDestination(root: string, path: string): Promise<'absent' | 'directory-missing'> {
  const absolute = safePath(root, path);
  const parent = dirname(absolute);
  if (parent !== root) {
    const relativeParent = relative(root, parent);
    // Only one allowed nested destination: .github/pull_request_template.md.
    if (relativeParent !== '.github') throw new RemediationError('Unexpected destination directory');
    try {
      const stat = await lstat(parent);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new RemediationError('Destination parent is not a real directory');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'directory-missing';
      throw error;
    }
  }
  try {
    await lstat(absolute);
    throw new RemediationError(`Refusing to overwrite existing destination: ${path}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return 'absent';
}

/** Caller supplies an identifier from a reviewed dry run. No writes occur for a stale plan. */
export async function applyRemediation(repositoryRoot: string, reviewedPlanId: string): Promise<FixOutcome> {
  if (!/^[a-f0-9]{64}$/.test(reviewedPlanId)) throw new RemediationError('An exact 64-character reviewed plan ID is required');
  const root = await realpath(resolve(repositoryRoot));
  const plan = await planRemediation(root);
  if (plan.planId !== reviewedPlanId) throw new RemediationError('Stale plan: rerun preview and review the new changes');
  // Preflight every path before making *any* change. All paths are a fixed allowlist.
  for (const change of plan.proposals) {
    if (!FIXES.some((fix) => fix.path === change.path && fix.ruleId === change.ruleId && fix.content === change.content)) {
      throw new RemediationError('Unrecognized fix destination or content');
    }
    await inspectDestination(root, change.path);
  }
  const changed: string[] = [];
  for (const change of plan.proposals) {
    const path = safePath(root, change.path);
    const parent = dirname(path);
    let createdParent = false;
    if (parent !== root) {
      try {
        await mkdir(parent);
        createdParent = true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
    }
    try {
      // Recheck the parent after directory creation to reject symlinks.
      await inspectDestination(root, change.path);
      // Exclusive create + no-follow where supported: never overwrite an existing file.
      const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0);
      const handle = await open(path, flags, 0o644);
      try { await handle.writeFile(change.content, 'utf8'); }
      finally { await handle.close(); }
      changed.push(change.path);
    } catch (error) {
      // Don't remove files from an interrupted write: that could delete data
      // changed by another process. Surface the error, never report success.
      if (createdParent) { try { await rmdir(parent); } catch { /* may contain data */ } }
      throw new RemediationError(`Could not safely create ${change.path}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
  const final = await runAudit(root);
  if (final.errors.length) throw new RemediationError('Audit after applying changes reported an execution error');
  const verified = plan.proposals.map((proposal) => ({
    ruleId: proposal.ruleId,
    status: final.findings.find((item) => item.ruleId === proposal.ruleId)?.status ?? 'UNKNOWN' as const,
  }));
  if (verified.some((item) => item.status !== 'PASS')) {
    throw new RemediationError('A proposed change was written but did not pass verification; inspect the repository');
  }
  return { schemaVersion: '0.1', mode: 'apply', planId: plan.planId, changed, verified };
}

function shellQuote(value: string): string { return "'" + value.replaceAll("'", "'\\''") + "'"; }

export function renderRemediationMarkdown(result: FixPlan | FixOutcome, repositoryRoot: string): string {
  if (result.mode === 'apply') {
    return ['## RepoTend remediation results', '',
      `Created ${result.changed.length} file(s).`, '',
      ...result.verified.map((item) => `- ${item.ruleId}: ${item.status}`),
      ...(result.changed.length ? ['','Changed: ' + result.changed.join(', ')] : []), ''].join('\n');
  }
  return ['## RepoTend remediation preview', '',
    '**Read-only preview. No files were changed.**', '',
    `Plan ID: \`${result.planId}\``, '',
    result.proposals.length ? `${result.proposals.length} proposed new file(s):` : 'No supported missing-file fixes are currently needed.', '',
    ...result.proposals.flatMap((item) => [`### ${item.path}`, '', item.reason, '', '```diff', item.diff.trimEnd(), '```', '']),
    ...(result.proposals.length ? [
      'To apply exactly this reviewed plan, run:', '',
      '```sh',
      `node ${shellQuote(fileURLToPath(new URL('./remediate.mjs', import.meta.url)))} --root ${shellQuote(resolve(repositoryRoot))} --apply ${result.planId}`,
      '```', '',
      'This command requires explicit approval and rechecks repository state before writing.', '',
    ] : []),
  ].join('\n');
}
