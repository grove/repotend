import { lstat, readdir, readFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute, join, sep } from 'node:path';
import { loadConfig, type Config } from './config.ts';
import { workflowRules } from './workflows.ts';

export type Status = 'PASS' | 'WARN' | 'FAIL' | 'UNKNOWN' | 'NOT_APPLICABLE' | 'SUPPRESSED';
export type Severity = 'info' | 'warning' | 'error';
export type Confidence = 'verified' | 'heuristic';
export type Evidence = { path: string; line?: number };
export type FindingSuppression = { reason: string; expires?: string; active: boolean };
export type Finding = {
  ruleId: string; ruleVersion: string; status: Status; severity: Severity;
  confidence: Confidence; summary: string; evidence: Evidence[];
  recommendation: string | null; enforced: boolean; suppression?: FindingSuppression;
};
export type AuditError = { code: string; ruleId?: string; message: string };
export type Report = {
  schemaVersion: '0.1'; toolVersion: string; repository: { path: '.' };
  mode: 'audit'; profile: 'small-oss'; findings: Finding[]; errors: AuditError[];
};
export type Observed = {
  status: 'PASS' | 'WARN' | 'UNKNOWN' | 'NOT_APPLICABLE'; summary: string;
  evidence?: Evidence[]; recommendation?: string | null; confidence?: Confidence;
};
export type Rule = Readonly<{
  id: string; version: string; category: 'conventions' | 'ci' | 'security' | 'dx';
  severity: Severity; enforceable: boolean;
  check: (reader: RepositoryReader) => Promise<Observed>;
}>;

const MAX_FILE_BYTES = 256 * 1024;
export type FileProbe =
  | { kind: 'present'; size: number }
  | { kind: 'missing' }
  | { kind: 'unknown'; reason: string };
export type ListResult = { kind: 'present'; paths: string[] } | { kind: 'unknown'; reason: string };
type InspectResult = { kind: 'present'; isFile: boolean; isDirectory: boolean; size: number } | { kind: 'missing' } | { kind: 'unknown'; reason: string };
type ReadResult = { kind: 'present'; text: string } | { kind: 'missing' } | { kind: 'unknown'; reason: string };

export class RepositoryReader {
  readonly root: string;
  constructor(root: string) { this.root = root; }

  private location(path: string): string {
    const full = resolve(this.root, path);
    const rel = relative(this.root, full);
    if (isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep) || rel === '') {
      throw new Error('Invalid repository-relative path');
    }
    return full;
  }

  private async inspect(path: string): Promise<InspectResult> {
    let current = this.root;
    try {
      for (const part of relative(this.root, this.location(path)).split(sep)) {
        current = join(current, part);
        const st = await lstat(current);
        if (st.isSymbolicLink()) return { kind: 'unknown', reason: 'Symlinked path is not followed' };
        if (current === this.location(path)) return { kind: 'present', isFile: st.isFile(), isDirectory: st.isDirectory(), size: st.size };
        if (!st.isDirectory()) return { kind: 'unknown', reason: 'Parent is not a directory' };
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { kind: 'missing' };
      return { kind: 'unknown', reason: 'Cannot inspect path' };
    }
    return { kind: 'unknown', reason: 'Cannot inspect path' };
  }

  async probe(path: string): Promise<FileProbe> {
    const state = await this.inspect(path);
    if (state.kind !== 'present') return state;
    return state.isFile ? { kind: 'present', size: state.size } : { kind: 'unknown', reason: 'Not a regular file' };
  }

  async list(folder: string, pattern: RegExp): Promise<ListResult> {
    const state = await this.inspect(folder);
    if (state.kind === 'missing') return { kind: 'present', paths: [] };
    if (state.kind === 'unknown') return state;
    if (!state.isDirectory) return { kind: 'unknown', reason: 'Not a directory' };
    try {
      const entries = await readdir(this.location(folder), { withFileTypes: true });
      const matched = entries.filter((item) => pattern.test(item.name));
      if (matched.some((item) => item.isSymbolicLink())) return { kind: 'unknown', reason: 'Matching symlink not followed' };
      if (matched.some((item) => !item.isFile())) return { kind: 'unknown', reason: 'Matching non-file directory entry' };
      return { kind: 'present', paths: matched.map((item) => folder + '/' + item.name).sort() };
    } catch { return { kind: 'unknown', reason: 'Cannot list directory' }; }
  }

  async read(path: string): Promise<ReadResult> {
    const state = await this.probe(path);
    if (state.kind !== 'present') return state;
    if (state.size > MAX_FILE_BYTES) return { kind: 'unknown', reason: 'File exceeds 256 KiB' };
    try { return { kind: 'present', text: await readFile(this.location(path), 'utf8') }; }
    catch { return { kind: 'unknown', reason: 'Cannot read file' }; }
  }
}

const evidence = (paths: string[]): Evidence[] => paths.map((path) => ({ path }));
const note = (status: Observed['status'], summary: string, paths: string[], recommendation?: string, confidence: Confidence = 'verified'): Observed =>
  ({ status, summary, evidence: evidence(paths), recommendation, confidence });

// A file may legitimately be stored under any of these common project layouts.
// Never follow symlinks. A failed probe remains UNKNOWN unless another candidate exists.
function requiredFile(id: string, filenames: readonly string[], label: string, recommendation?: string): Rule {
  return { id, version: '2', category: id.startsWith('dx.') ? 'dx' : 'conventions', severity: 'warning', enforceable: true,
    async check(reader) {
      let uncertain: string | undefined;
      for (const filename of filenames) {
        const state = await reader.probe(filename);
        if (state.kind === 'present') return note('PASS', label + ' is present', [filename]);
        if (state.kind === 'unknown') uncertain ??= filename;
      }
      if (uncertain) return note('UNKNOWN', label + ' could not be fully checked', [uncertain],
        'Check unreadable or symlinked candidate files.');
      return note('WARN', label + ' was not found', [...filenames],
        recommendation ?? ('Consider adding ' + filenames[0] + ' if appropriate.'));
    },
  };
}

const prTemplate: Rule = {
  id: 'repo.pr-template', version: '1', category: 'conventions', severity: 'warning', enforceable: true,
  async check(reader) {
    const paths = ['.github/pull_request_template.md', '.github/PULL_REQUEST_TEMPLATE.md', 'PULL_REQUEST_TEMPLATE.md', 'docs/PULL_REQUEST_TEMPLATE.md', 'docs/pull_request_template.md'];
    let unknown: string | undefined;
    for (const path of paths) {
      const state = await reader.probe(path);
      if (state.kind === 'present') return note('PASS', 'Pull request template is present', [path]);
      if (state.kind === 'unknown') unknown = unknown ?? path;
    }
    if (unknown) return note('UNKNOWN', 'Pull request template could not be fully checked', [unknown]);
    return note('WARN', 'Pull request template was not found', paths, 'Add a short PR template explaining motivation, changes, and testing.');
  },
};

const issueTemplates: Rule = {
  id: 'repo.issue-templates', version: '1', category: 'conventions', severity: 'warning', enforceable: true,
  async check(reader) {
    const listed = await reader.list('.github/ISSUE_TEMPLATE', /\.(?:yml|yaml|md)$/i);
    if (listed.kind === 'unknown') return note('UNKNOWN', 'Issue templates could not be inspected', [], listed.reason);
    const paths = listed.paths.filter((path) => !/\/config\.ya?ml$/i.test(path));
    return paths.length ? note('PASS', 'Issue templates are present', paths) :
      note('WARN', 'No issue templates found', ['.github/ISSUE_TEMPLATE'], 'Start with lightweight bug and feature forms.');
  },
};


export const rules: readonly Rule[] = Object.freeze([
  requiredFile('repo.license-present', [
    'LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'LICENCE.txt',
    'license', 'license.md', 'license.txt', 'COPYING', 'COPYING.md', 'COPYING.txt',
  ], 'License'),
  requiredFile('repo.contributing', [
    'CONTRIBUTING.md', '.github/CONTRIBUTING.md', 'docs/CONTRIBUTING.md',
    'docs/contributing.md', 'docs/contributing.rst', 'contributing.md',
  ], 'Contribution guide'),
  requiredFile('repo.code-of-conduct', [
    'CODE_OF_CONDUCT.md', '.github/CODE_OF_CONDUCT.md', 'docs/CODE_OF_CONDUCT.md',
    'code_of_conduct.md',
  ], 'Code of conduct'),
  requiredFile('repo.security-policy', [
    'SECURITY.md', '.github/SECURITY.md', '.github/security.md',
    'docs/SECURITY.md', 'security.md',
  ], 'Security policy'),
  prTemplate,
  issueTemplates,
  requiredFile('dx.editorconfig', ['.editorconfig'], 'EditorConfig'),
  ...workflowRules,
]);

export async function runAudit(repositoryRoot = process.cwd(), selected: readonly Rule[] = rules, asOfUtc = new Date().toISOString().slice(0, 10)): Promise<Report> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfUtc)) throw new Error('Expected a UTC YYYY-MM-DD audit date');
  const root = await realpath(resolve(repositoryRoot));
  const registry = new Map(selected.map((rule) => [rule.id, rule]));
  if (registry.size !== selected.length) throw new Error('Duplicate rule IDs in registry');
  const config: Config = await loadConfig(root, new Set(registry.keys()), new Set(selected.filter((r) => r.enforceable).map((r) => r.id)));
  const reader = new RepositoryReader(root);
  const findings: Finding[] = [];
  const errors: AuditError[] = [];
  for (const rule of selected) {
    const overrides = config.rules[rule.id];
    if (overrides?.enabled === false) continue;
    try {
      const observed = await rule.check(reader);
      const enforced = overrides?.enforce === true;
      const exception = config.suppressions[rule.id];
      // Expiry is inclusive, evaluated using UTC calendar days. An expired
      // exception is visible but no longer changes the finding or exit code.
      const suppression = exception ? {
        reason: exception.reason,
        ...(exception.expires ? { expires: exception.expires } : {}),
        active: !exception.expires || asOfUtc <= exception.expires,
      } : undefined;
      const status: Status = observed.status === 'WARN' && suppression?.active ? 'SUPPRESSED'
        : enforced && observed.status === 'WARN' ? 'FAIL' : observed.status;
      findings.push({
        ruleId: rule.id, ruleVersion: rule.version, status,
        severity: rule.severity, confidence: observed.confidence ?? 'verified',
        summary: observed.summary, evidence: observed.evidence ?? [],
        recommendation: observed.recommendation ?? null, enforced,
        ...(suppression ? { suppression } : {}),
      });
    } catch {
      errors.push({ code: 'RULE_EXECUTION', ruleId: rule.id, message: 'Rule execution failed' });
      findings.push({ ruleId: rule.id, ruleVersion: rule.version, status: 'UNKNOWN', severity: rule.severity,
        confidence: 'verified', summary: 'Rule could not complete', evidence: [], recommendation: null, enforced: false });
    }
  }
  return { schemaVersion: '0.1', toolVersion: '0.1.0', repository: { path: '.' }, mode: 'audit', profile: config.profile, findings, errors };
}

function safeTable(value: string): string { return value.replaceAll('|', '\\|').replace(/[\r\n]/g, ' '); }
export function renderMarkdown(report: Report): string {
  const counts = Object.fromEntries(['PASS', 'WARN', 'FAIL', 'UNKNOWN', 'NOT_APPLICABLE', 'SUPPRESSED'].map((status) =>
    [status, report.findings.filter((f) => f.status === status).length]));
  const exceptions = report.findings.filter((f) => f.suppression);
  return [
    '## RepoTend repository audit (experimental)', '',
    '> Checks are advisory unless explicitly enforced. A PASS is not a complete security or quality certification.', '',
    `**${counts.PASS} passed · ${counts.WARN} warnings · ${counts.FAIL} enforced failures · ${counts.SUPPRESSED} suppressed · ${counts.UNKNOWN} unknown · ${counts.NOT_APPLICABLE} not applicable**`, '',
    '| Status | Rule | Observation |', '| --- | --- | --- |',
    ...report.findings.map((f) => `| ${f.status} | \`${safeTable(f.ruleId)}\` | ${safeTable(f.summary)} |`),
    ...(exceptions.length ? ['', '### Configured exceptions', '',
      '| Rule | State | Expires (UTC) | Reason |', '| --- | --- | --- | --- |',
      ...exceptions.map((f) => `| \`${safeTable(f.ruleId)}\` | ${f.suppression?.active ? 'Active' : 'Expired'} | ${f.suppression?.expires ?? 'Never'} | ${safeTable(f.suppression?.reason ?? '')} |`),
    ] : []),
    '', ...report.errors.map((e) => `- ERROR ${safeTable(e.ruleId ?? e.code)}: ${safeTable(e.message)}`),
    'See docs/DOGFOODING.md for check limitations.', '',
  ].join('\n');
}
