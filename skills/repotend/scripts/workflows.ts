/** Read-only, YAML-aware GitHub Actions checks.
 * These checks inspect static workflow configuration only; they never execute steps.
 * Full GitHub Actions expression/schema validation remains delegated to actionlint.
 */
// Vendored yaml@2.8.1: works directly from a copied skill, without npm setup.
import { LineCounter } from '../vendor/yaml/src/parse/line-counter.ts';
import { isNode } from '../vendor/yaml/src/nodes/identity.ts';
import { parseDocument } from '../vendor/yaml/src/public-api.ts';
import type { RepositoryReader, Rule, Observed, Evidence, Confidence } from './engine.ts';

type Mapping = Record<string, unknown>;
type PathPart = string | number;
type Workflow = Readonly<{
  path: string;
  data: Mapping;
  line: (...path: PathPart[]) => number | undefined;
}>;
type WorkflowProblem = Readonly<{ path: string; line?: number; reason: string; kind: 'invalid' | 'unknown' }>;
type Scan = Readonly<{ workflows: Workflow[]; problems: WorkflowProblem[]; hasFiles: boolean; unavailable?: string }>;
const scans = new WeakMap<RepositoryReader, Promise<Scan>>();

function map(value: unknown): Mapping | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Mapping : undefined;
}
function evidence(path: string, line?: number): Evidence { return line ? { path, line } : { path }; }
function observation(status: Observed['status'], summary: string, refs: Evidence[] = [], recommendation?: string, confidence: Confidence = 'verified'): Observed {
  return { status, summary, evidence: refs, recommendation, confidence };
}
function unique(refs: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  return refs.filter((r) => { const key = `${r.path}:${r.line ?? 0}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
function eventMap(data: Mapping): Mapping {
  const value = data.on;
  if (typeof value === 'string') return { [value]: null };
  if (Array.isArray(value)) return Object.fromEntries(value.filter((x): x is string => typeof x === 'string').map((x) => [x, null]));
  return map(value) ?? {};
}
function jobs(data: Mapping): Mapping { return map(data.jobs) ?? {}; }
function entries(data: Mapping): Array<[string, Mapping]> {
  return Object.entries(jobs(data)).flatMap(([key, value]) => {
    const item = map(value);
    return item ? [[key, item] as [string, Mapping]] : [];
  });
}
function workflowRef(w: Workflow, ...parts: PathPart[]): Evidence { return evidence(w.path, w.line(...parts)); }

async function collect(reader: RepositoryReader): Promise<Scan> {
  const listing = await reader.list('.github/workflows', /\.ya?ml$/i);
  if (listing.kind === 'unknown') return { workflows: [], problems: [], hasFiles: false, unavailable: listing.reason };
  const paths = listing.paths;
  const workflows: Workflow[] = [];
  const problems: WorkflowProblem[] = [];
  for (const path of paths) {
    const source = await reader.read(path); // enforces file bounds, symlink policy, and read-only access
    if (source.kind !== 'present') {
      problems.push({ path, kind: 'unknown', reason: source.kind === 'unknown' ? source.reason : 'File disappeared while scanning' });
      continue;
    }
    try {
      const counter = new LineCounter();
      const doc = parseDocument(source.text, { lineCounter: counter, uniqueKeys: true, version: '1.2', strict: true });
      if (doc.errors.length) {
        const error = doc.errors[0];
        const offset = typeof error.pos?.[0] === 'number' ? error.pos[0] : 0;
        problems.push({ path, kind: 'invalid', line: counter.linePos(offset).line || 1,
          reason: `Invalid YAML: ${error.message.split('\n')[0]}` });
        continue;
      }
      // Untrusted YAML is data. Do not follow anchors or expand arbitrary aliases.
      const data: unknown = doc.toJS({ maxAliasCount: 0 });
      const object = map(data);
      if (!object) {
        problems.push({ path, kind: 'invalid', reason: 'Workflow root must be a mapping', line: 1 });
        continue;
      }
      const line = (...parts: PathPart[]): number | undefined => {
        const node: unknown = doc.getIn(parts, true);
        if (!isNode(node) || !node.range) return undefined;
        return counter.linePos(node.range[0]).line || undefined;
      };
      workflows.push({ path, data: object, line });
    } catch {
      // Includes malicious/oversized aliases and parser failures; do not claim PASS.
      problems.push({ path, kind: 'invalid', reason: 'YAML could not be safely interpreted' });
    }
  }
  return { workflows, problems, hasFiles: paths.length > 0 };
}
function scan(reader: RepositoryReader): Promise<Scan> {
  let current = scans.get(reader);
  if (!current) { current = collect(reader); scans.set(reader, current); }
  return current;
}
function priorProblem(result: Scan): Observed | undefined {
  if (result.unavailable) return observation('UNKNOWN', 'Workflow directory could not be inspected', [], result.unavailable);
  if (!result.hasFiles) return observation('NOT_APPLICABLE', 'No GitHub Actions workflows found');
  if (result.problems.length) return observation('UNKNOWN', 'Some workflow files could not be fully analyzed',
    result.problems.map((p) => evidence(p.path, p.line)), 'Resolve workflow parsing or access issues before relying on other CI findings.');
  return undefined;
}

const workflowValidity: Rule = {
  id: 'ci.workflow-validity', version: '1', category: 'ci', severity: 'warning', enforceable: true,
  async check(reader) {
    const result = await scan(reader);
    if (result.unavailable) return observation('UNKNOWN', 'Workflow directory could not be inspected', [], result.unavailable);
    if (!result.hasFiles) return observation('NOT_APPLICABLE', 'No GitHub Actions workflows found');
    const issues = result.problems.filter((p) => p.kind === 'invalid');
    for (const w of result.workflows) {
      const triggers = eventMap(w.data);
      if (Object.keys(triggers).length === 0) issues.push({ path: w.path, kind: 'invalid', line: w.line('on'), reason: 'Missing or invalid on: trigger' });
      const tasks = map(w.data.jobs);
      if (!tasks || Object.keys(tasks).length === 0) issues.push({ path: w.path, kind: 'invalid', line: w.line('jobs'), reason: 'Missing or invalid jobs: mapping' });
      for (const [id, body] of Object.entries(tasks ?? {})) {
        if (!map(body)) issues.push({ path: w.path, kind: 'invalid', line: w.line('jobs', id), reason: `Job ${id} must be a mapping` });
      }
    }
    if (issues.length) return observation('WARN', `${issues.length} workflow YAML or basic-structure problem(s) detected`,
      unique(issues.map((p) => evidence(p.path, p.line))),
      'Correct the indicated workflow YAML/structure. Use actionlint for full GitHub Actions expression and schema validation.');
    if (result.problems.length) return observation('UNKNOWN', 'Some workflow files could not be read', result.problems.map((p) => evidence(p.path, p.line)));
    return observation('PASS', 'Workflow YAML and basic required structure are valid', result.workflows.map((w) => evidence(w.path)),
      'This is not a full GitHub Actions semantic check; consider actionlint.');
  },
};

function scopePermissions(value: unknown): 'broad' | 'configured' | 'absent' | 'unrecognized' {
  if (value === undefined || value === null) return 'absent';
  if (value === 'write-all') return 'broad';
  if (value === 'read-all') return 'configured';
  const permissions = map(value);
  if (!permissions) return 'unrecognized';
  if (Object.values(permissions).some((scope) => scope === 'write')) return 'broad';
  return 'configured';
}
const permissionsRule: Rule = {
  id: 'security.workflow-permissions', version: '2', category: 'security', severity: 'warning', enforceable: false,
  async check(reader) {
    const result = await scan(reader);
    const problem = priorProblem(result); if (problem) return problem;
    const missing: Evidence[] = []; const broad: Evidence[] = []; const invalid: Evidence[] = [];
    for (const w of result.workflows) {
      const workflow = scopePermissions(w.data.permissions);
      if (workflow === 'broad') broad.push(workflowRef(w, 'permissions'));
      if (workflow === 'unrecognized') invalid.push(workflowRef(w, 'permissions'));
      const taskEntries = entries(w.data);
      const noDefault = workflow === 'absent';
      if (noDefault && taskEntries.length === 0) missing.push(evidence(w.path));
      for (const [name, job] of taskEntries) {
        const scope = scopePermissions(job.permissions);
        if (scope === 'broad') broad.push(workflowRef(w, 'jobs', name, 'permissions'));
        if (scope === 'unrecognized') invalid.push(workflowRef(w, 'jobs', name, 'permissions'));
        if (noDefault && scope === 'absent') missing.push(workflowRef(w, 'jobs', name));
      }
    }
    if (invalid.length) return observation('UNKNOWN', 'Unrecognized permissions syntax prevents a reliable assessment', unique(invalid));
    if (broad.length) return observation('WARN', 'Workflow or job requests broad write-capable token permissions', unique(broad),
      'Review required scopes and reduce permissions to the minimum. A write permission is not automatically a vulnerability.', 'heuristic');
    if (missing.length) return observation('WARN', 'Token permissions are not explicitly configured for some jobs', unique(missing),
      'Consider explicit workflow/job permissions. Effective defaults may be controlled by repository or organization settings.', 'heuristic');
    return observation('PASS', 'An explicit token permissions policy applies to each job', result.workflows.map((w) => evidence(w.path)),
      'This establishes configuration presence, not that every scope is least-privilege.', 'heuristic');
  },
};

function prEvent(w: Workflow): boolean { const t = eventMap(w.data); return 'pull_request' in t || 'pull_request_target' in t; }
function effectiveConcurrency(value: unknown): boolean {
  const obj = map(value);
  return !!obj && typeof obj.group === 'string' && obj.group.length > 0 &&
    (obj['cancel-in-progress'] === true || (typeof obj['cancel-in-progress'] === 'string' && obj['cancel-in-progress'].includes('pull_request')));
}
const concurrency: Rule = {
  id: 'ci.concurrency', version: '1', category: 'ci', severity: 'warning', enforceable: false,
  async check(reader) {
    const result = await scan(reader); const problem = priorProblem(result); if (problem) return problem;
    const relevant = result.workflows.filter(prEvent);
    if (!relevant.length) return observation('NOT_APPLICABLE', 'No pull request workflows detected');
    const missing: Evidence[] = [];
    for (const w of relevant) {
      if (effectiveConcurrency(w.data.concurrency)) continue;
      const work = entries(w.data);
      if (!work.length || work.some(([, job]) => !effectiveConcurrency(job.concurrency))) missing.push(workflowRef(w, 'on'));
    }
    if (missing.length) return observation('WARN', 'PR workflows may run superseded jobs without cancellation', unique(missing),
      'Consider a PR-scoped concurrency group and cancel-in-progress; ensure release/deployment jobs are not unintentionally cancelled.', 'heuristic');
    return observation('PASS', 'PR workflows configure concurrency cancellation', relevant.map((w) => evidence(w.path)),
      'Review concurrency group expressions for collisions before changing them.', 'heuristic');
  },
};

function pushMayOverlap(trigger: unknown): boolean {
  if (trigger === null || trigger === undefined) return true;
  const filters = map(trigger);
  if (!filters) return true;
  if (filters.tags || filters['tags-ignore']) return !filters.tags && !filters.branches && !filters['branches-ignore'];
  if (!filters.branches && !filters['branches-ignore']) return true;
  if (filters['branches-ignore']) return true;
  const branches = filters.branches;
  if (Array.isArray(branches) && branches.length > 0) {
    return branches.some((b) => typeof b !== 'string' || b.includes('*') || b.startsWith('!') || b.includes('feature') || b.includes('dev'));
  }
  return true;
}
const duplicateTriggers: Rule = {
  id: 'ci.duplicate-triggers', version: '1', category: 'ci', severity: 'warning', enforceable: false,
  async check(reader) {
    const result = await scan(reader); const problem = priorProblem(result); if (problem) return problem;
    const overlapping = result.workflows.filter((w) => {
      const e = eventMap(w.data);
      return 'push' in e && 'pull_request' in e && pushMayOverlap(e.push);
    });
    if (overlapping.length) return observation('WARN', 'Some workflows may run twice for pushes to open PR branches',
      overlapping.map((w) => workflowRef(w, 'on')), 'Review push branch filters and PR events. Pushes to main and PRs may legitimately both be needed.', 'heuristic');
    return observation('PASS', 'No obvious overlapping push and pull_request triggers found', result.workflows.map((w) => evidence(w.path)),
      'This is a static heuristic, not a measurement of duplicated CI minutes.', 'heuristic');
  },
};

const pathFilterSafety: Rule = {
  id: 'ci.path-filter-safety', version: '1', category: 'ci', severity: 'warning', enforceable: false,
  async check(reader) {
    const result = await scan(reader); const problem = priorProblem(result); if (problem) return problem;
    const refs: Evidence[] = [];
    for (const w of result.workflows) {
      const on = eventMap(w.data);
      for (const key of ['push', 'pull_request', 'pull_request_target']) {
        const conf = map(on[key]);
        if (conf && ('paths' in conf || 'paths-ignore' in conf)) refs.push(workflowRef(w, 'on', key));
      }
    }
    if (refs.length) return observation('WARN', 'Event-level path filters could skip a required status check', unique(refs),
      'Confirm whether any affected workflow is a required check; a skipped required workflow may remain pending. Consider conditional jobs with a reliable final gate.', 'heuristic');
    return observation('PASS', 'No event-level workflow path filters detected', result.workflows.map((w) => evidence(w.path)),
      'Absence of path filters does not prove optimal CI efficiency.', 'heuristic');
  },
};

const fullSha = /^[a-f\d]{40}$/i;
function isPinned(uses: string): boolean | undefined {
  if (uses.startsWith('./') || uses.startsWith('$/')) return true;
  if (uses.startsWith('docker://')) return /@sha256:[a-f\d]{64}$/i.test(uses);
  if (uses.includes('${{')) return undefined;
  const at = uses.lastIndexOf('@');
  if (at < 1) return false;
  return fullSha.test(uses.slice(at + 1));
}
const actionPinning: Rule = {
  id: 'security.action-pinning', version: '1', category: 'security', severity: 'warning', enforceable: false,
  async check(reader) {
    const result = await scan(reader); const problem = priorProblem(result); if (problem) return problem;
    const unpinned: Evidence[] = []; const unclear: Evidence[] = [];
    for (const w of result.workflows) {
      for (const [id, job] of entries(w.data)) {
        const called = job.uses;
        if (typeof called === 'string') {
          const result = isPinned(called);
          if (result === false) unpinned.push(workflowRef(w, 'jobs', id, 'uses'));
          if (result === undefined) unclear.push(workflowRef(w, 'jobs', id, 'uses'));
        }
        if (!Array.isArray(job.steps)) continue;
        job.steps.forEach((step, idx) => {
          const uses = map(step)?.uses;
          if (typeof uses !== 'string') return;
          const result = isPinned(uses);
          if (result === false) unpinned.push(workflowRef(w, 'jobs', id, 'steps', idx, 'uses'));
          if (result === undefined) unclear.push(workflowRef(w, 'jobs', id, 'steps', idx, 'uses'));
        });
      }
    }
    if (unclear.length) return observation('UNKNOWN', 'Some action references cannot be evaluated statically', unique(unclear));
    if (unpinned.length) return observation('WARN', 'Some external action or reusable-workflow references use mutable refs', unique(unpinned),
      'Consider pinning external actions and reusable workflows to reviewed full commit SHAs; update SHA references deliberately.', 'verified');
    return observation('PASS', 'External action references are pinned to full SHAs or use local paths', result.workflows.map((w) => evidence(w.path)),
      'Pinning reduces ref-mutation risks, but does not establish that a particular action is safe.');
  },
};

export const workflowRules: readonly Rule[] = Object.freeze([
  workflowValidity, permissionsRule, concurrency, duplicateTriggers, pathFilterSafety, actionPinning,
]);
