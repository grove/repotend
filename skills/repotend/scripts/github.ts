import { spawnSync } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RepositoryReader } from './engine.ts';
import { pathFilteredJobs } from './workflows.ts';

type Verification = 'remote-verified' | 'not verified' | 'inaccessible/unknown';
type ApiResult = { data: unknown } | { status: Exclude<Verification, 'remote-verified'>; reason: string };
type Get = (endpoint: string, paginated: boolean) => ApiResult;
type Check = { context: string; appId: number | null; policy: string };
type Policy = { endpoint: string; status: Verification; reason?: string; checks: Check[] };
type ObjectValue = Record<string, unknown>;
function object(value: unknown): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object');
  return value as ObjectValue;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Expected an array');
  return value;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.length) throw new Error('Expected a nonempty string');
  return value;
}
function appId(value: unknown): number | null {
  if (value === undefined || value === null || value === -1) return null;
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error('Invalid app ID');
  return value as number;
}

/** Fixed GET requests only. Never print gh output/errors, which may contain secrets. */
const githubGet: Get = (endpoint, paginated) => {
  const result = spawnSync('gh', ['api', '--hostname', 'github.com', '--method', 'GET',
    '-H', 'Accept: application/vnd.github+json', '-H', 'X-GitHub-Api-Version: 2022-11-28',
    ...(paginated ? ['--paginate', '--slurp'] : []), endpoint], {
    cwd: fileURLToPath(new URL('.', import.meta.url)), encoding: 'utf8', shell: false,
    timeout: 20_000, maxBuffer: 4 * 1024 * 1024,
  });
  if ((result.error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') return { status: 'not verified', reason: 'No GitHub CLI connection is available.' };
  if (result.error || result.status !== 0) {
    const code = result.stderr?.match(/\(HTTP (\d{3})\)/)?.[1];
    if (!code && /gh auth login|GH_TOKEN/.test(result.stderr ?? ''))
      return { status: 'not verified', reason: 'No authenticated GitHub CLI connection is available.' };
    return { status: 'inaccessible/unknown', reason: code
      ? `GitHub returned HTTP ${code}; absence of required checks is not established.`
      : 'GitHub request failed, timed out, or exceeded the response limit.' };
  }
  try {
    const data: unknown = JSON.parse(result.stdout);
    return { data: paginated ? array(data).flatMap((page) => array(page)) : data };
  } catch { return { status: 'inaccessible/unknown', reason: 'GitHub returned an invalid or incomplete JSON response.' }; }
};

function rulesChecks(data: unknown): Check[] {
  return array(data).flatMap((value) => {
    const rule = object(value);
    const type = text(rule.type);
    // Required-workflow policies cannot be resolved by check-name comparison.
    if (type === 'workflows') throw new Error('Unsupported required workflow policy');
    if (type !== 'required_status_checks') return [];
    if (!Number.isSafeInteger(rule.ruleset_id)) throw new Error('Invalid ruleset ID');
    const policy = `ruleset:${rule.ruleset_id}`;
    return array(object(rule.parameters).required_status_checks).map((item) => {
      const check = object(item);
      return { context: text(check.context), appId: appId(check.integration_id), policy };
    });
  });
}
function protectionChecks(data: unknown): Check[] {
  const protection = object(data);
  text(protection.url);
  if (protection.required_status_checks == null) return [];
  const setting = object(protection.required_status_checks);
  const contexts = array(setting.contexts).map(text);
  const checks = setting.checks === undefined ? [] : array(setting.checks).map((item) => {
    const check = object(item);
    return { context: text(check.context), appId: appId(check.app_id), policy: 'branch-protection' };
  });
  return [...checks, ...contexts.filter((context) => !checks.some((check) => check.context === context))
    .map((context) => ({ context, appId: null, policy: 'branch-protection' }))];
}
function inspect(endpoint: string, paginated: boolean, parse: (data: unknown) => Check[], get: Get): Policy {
  const response = get(endpoint, paginated);
  if (!('data' in response)) return { endpoint, ...response, checks: [] };
  try { return { endpoint, status: 'remote-verified', checks: parse(response.data) }; }
  catch { return { endpoint, status: 'inaccessible/unknown', reason: 'Malformed response or unsupported required-workflow policy; configuration remains uncertain.', checks: [] }; }
}

export async function verifyGitHub(options: { root: string; repo: string; branch: string; allowRemote: boolean }, get: Get = githubGet) {
  const { repo, branch, allowRemote } = options;
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repo) || repo.split('/').some((part) => part === '.' || part === '..'))
    throw new Error('Expected --repo OWNER/REPO on github.com');
  if (!branch || /[\s\x00-\x1f\x7f~^:?*\[\\]/.test(branch) || branch.startsWith('-') || branch.includes('..') || branch.includes('@{'))
    throw new Error('Expected a literal --branch name');
  const startedAt = new Date().toISOString();
  const local = await pathFilteredJobs(new RepositoryReader(await realpath(resolve(options.root))));
  const prefix = `repos/${repo}`;
  const encoded = encodeURIComponent(branch);
  const disabledGet: Get = () => ({ status: 'not verified', reason: 'Remote verification was not explicitly enabled with --allow-remote.' });
  const connection = allowRemote ? get : disabledGet;
  const policies = [
    inspect(`${prefix}/rules/branches/${encoded}?per_page=100`, true, rulesChecks, connection),
    inspect(`${prefix}/branches/${encoded}/protection`, false, protectionChecks, connection),
  ];
  const inventoryEndpoint = `${prefix}/rulesets?includes_parents=true&per_page=100`;
  const inventoryResponse = connection(inventoryEndpoint, true);
  let rulesets: Array<{ id: number; name: string; source: string; enforcement: string }> = [];
  let inventory: { endpoint: string; status: Verification; reason?: string };
  if ('data' in inventoryResponse) {
    try {
      rulesets = array(inventoryResponse.data).map((value) => {
        const r = object(value);
        if (!Number.isSafeInteger(r.id)) throw new Error('Invalid ruleset ID');
        const enforcement = text(r.enforcement);
        if (!['active', 'disabled', 'evaluate'].includes(enforcement)) throw new Error('Unknown enforcement');
        return { id: r.id as number, name: text(r.name), source: text(r.source), enforcement };
      });
      inventory = { endpoint: inventoryEndpoint, status: 'remote-verified' };
    } catch {
      inventory = { endpoint: inventoryEndpoint, status: 'inaccessible/unknown', reason: 'Ruleset inventory could not be interpreted.' };
    }
  } else inventory = { endpoint: inventoryEndpoint, ...inventoryResponse };
  const complete = policies.every((p) => p.status === 'remote-verified');
  const notVerified = policies.every((p) => p.status === 'not verified');
  const checks = policies.flatMap((p) => p.checks);
  const comparisons = local.jobs.map((job) => {
    const matches = checks.filter((check) => check.context === job.checkName);
    const status: Verification = matches.length ? 'remote-verified' : notVerified ? 'not verified' : !complete ? 'inaccessible/unknown'
      : job.checkName === null ? 'not verified' : 'remote-verified';
    return { ...job, status, matches, conclusion: matches.length ? 'required-check-name-matches-filtered-job'
      : !complete ? 'required-check-configuration-unknown' : job.checkName === null ? 'check-name-unresolved' : 'no-matching-required-check' };
  });
  const sources = [...policies, inventory];
  const status: Verification = sources.every((p) => p.status === 'not verified') ? 'not verified'
    : !complete || inventory.status !== 'remote-verified' ? 'inaccessible/unknown' : 'remote-verified';
  return {
    mode: 'github-context', experimental: true, repository: repo, branch, startedAt, completedAt: new Date().toISOString(),
    status, requiredCheckConfigurationComplete: complete, policies, inventory, rulesets, comparisons,
    localProblems: local.problems,
    limitations: [
      'Separate context only: the offline audit and all local WARN/SUPPRESSED/UNKNOWN statuses remain unchanged.',
      'Rulesets inventory is repository-wide; disabled/evaluate entries are not enforced. GitHub evaluates branch targeting for the active-rules endpoint.',
      'Exact static names only: matrix, dynamic, and reusable-workflow names remain unresolved. App IDs are retained; check producers and actual runs are not verified.',
      'Local files are caller-selected and are not verified against this remote repository or branch. Event branch/tag filters and bypass actors are not evaluated.',
      'A name match establishes policy context, not certain merge blockage or overall security. Policies can change after inspection.',
    ],
  };
}
