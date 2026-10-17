import { readFile, lstat } from 'node:fs/promises';
import { join, relative, isAbsolute, resolve } from 'node:path';

export type RuleSetting = Readonly<{ enabled: boolean; enforce: boolean }>;
export type Suppression = Readonly<{ reason: string; expires?: string }>;
export type Config = Readonly<{
  schema: 1;
  profile: 'small-oss';
  rules: Readonly<Record<string, RuleSetting>>;
  suppressions: Readonly<Record<string, Suppression>>;
}>;
export const DEFAULT_CONFIG: Config = { schema: 1, profile: 'small-oss', rules: {}, suppressions: {} };
const MAX_CONFIG_BYTES = 32 * 1024;
const MAX_REASON_LENGTH = 240;

export class ConfigurationError extends Error {
  constructor(message: string) { super(message); this.name = 'ConfigurationError'; }
}

function validUtcDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
}

// Deliberately a small, documented YAML subset: nested mappings with unquoted
// keys and plain scalar/boolean values. Unsupported YAML is rejected explicitly.
export function parseConfig(text: string, knownRules: ReadonlySet<string>, enforceable: ReadonlySet<string>): Config {
  const document: Record<string, unknown> = Object.create(null);
  const settings: Record<string, RuleSetting> = Object.create(null);
  const suppressions: Record<string, Suppression> = Object.create(null);
  const pendingRules: Record<string, Record<string, boolean>> = Object.create(null);
  const pendingSuppressions: Record<string, Record<string, string>> = Object.create(null);
  let section: 'rules' | 'suppressions' | null = null;
  let currentRule: string | null = null;

  for (const [index, line] of text.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (line.includes('\t')) throw new ConfigurationError(`Line ${index + 1}: tabs are not supported`);
    const match = /^( *)([A-Za-z0-9_.-]+):(?: *([^#\s][^#]*?) *)?$/.exec(line);
    if (!match) throw new ConfigurationError(`Line ${index + 1}: unsupported YAML syntax`);
    const indent = match[1].length;
    const key = match[2];
    const raw = match[3]?.trim();

    if (indent === 0) {
      section = key === 'rules' || key === 'suppressions' ? key : null;
      currentRule = null;
      if (Object.hasOwn(document, key)) throw new ConfigurationError(`Duplicate top-level key: ${key}`);
      if (!['schema', 'profile', 'rules', 'suppressions'].includes(key)) throw new ConfigurationError(`Unknown top-level key: ${key}`);
      if (section && raw !== undefined) throw new ConfigurationError(`${section} must contain nested mappings`);
      if (!section && raw === undefined) throw new ConfigurationError(`${key} requires a value`);
      document[key] = raw ?? null;
    } else if (indent === 2 && section) {
      if (!knownRules.has(key)) throw new ConfigurationError(`Unknown rule ID: ${key}`);
      const pending = section === 'rules' ? pendingRules : pendingSuppressions;
      if (Object.hasOwn(pending, key)) throw new ConfigurationError(`Duplicate ${section} rule ID: ${key}`);
      if (raw !== undefined) throw new ConfigurationError(`Rule ${key} requires a mapping`);
      pending[key] = Object.create(null);
      currentRule = key;
    } else if (indent === 4 && section && currentRule !== null) {
      if (section === 'rules') {
        if (!['enabled', 'enforce'].includes(key)) throw new ConfigurationError(`Unknown setting ${currentRule}.${key}`);
        if (Object.hasOwn(pendingRules[currentRule], key)) throw new ConfigurationError(`Duplicate setting: ${currentRule}.${key}`);
        if (raw !== 'true' && raw !== 'false') throw new ConfigurationError(`${currentRule}.${key} must be true or false`);
        pendingRules[currentRule][key] = raw === 'true';
      } else {
        if (!['reason', 'expires'].includes(key)) throw new ConfigurationError(`Unknown suppression field ${currentRule}.${key}`);
        if (Object.hasOwn(pendingSuppressions[currentRule], key)) throw new ConfigurationError(`Duplicate suppression field: ${currentRule}.${key}`);
        if (raw === undefined || raw.startsWith('"') || raw.startsWith("'")) {
          throw new ConfigurationError(`${currentRule}.${key} requires a plain, unquoted value`);
        }
        pendingSuppressions[currentRule][key] = raw;
      }
    } else {
      throw new ConfigurationError(`Line ${index + 1}: unexpected indentation or mapping`);
    }
  }

  if (document.schema !== '1') throw new ConfigurationError('schema: 1 is required');
  if (document.profile !== undefined && document.profile !== 'small-oss') {
    throw new ConfigurationError('Only profile: small-oss is supported');
  }
  for (const [id, rule] of Object.entries(pendingRules)) {
    if (rule.enforce && !enforceable.has(id)) throw new ConfigurationError(`Rule ${id} is heuristic and cannot be enforced`);
    if (rule.enabled === false && rule.enforce === true) throw new ConfigurationError(`Rule ${id} cannot be disabled and enforced`);
    settings[id] = { enabled: rule.enabled ?? true, enforce: rule.enforce ?? false };
  }
  for (const [id, entry] of Object.entries(pendingSuppressions)) {
    if (!entry.reason || entry.reason.length > MAX_REASON_LENGTH) {
      throw new ConfigurationError(`Suppression ${id} requires a nonempty reason of at most ${MAX_REASON_LENGTH} characters`);
    }
    if (entry.expires !== undefined && !validUtcDate(entry.expires)) {
      throw new ConfigurationError(`Suppression ${id}.expires must be a valid YYYY-MM-DD date`);
    }
    if (settings[id]?.enabled === false) {
      throw new ConfigurationError(`Suppression ${id} conflicts with enabled: false; choose one`);
    }
    suppressions[id] = entry.expires ? { reason: entry.reason, expires: entry.expires } : { reason: entry.reason };
  }
  return { schema: 1, profile: 'small-oss', rules: settings, suppressions };
}

export async function loadConfig(root: string, knownRules: ReadonlySet<string>, enforceable: ReadonlySet<string>): Promise<Config> {
  const target = resolve(root, '.repotend.yml');
  const rel = relative(root, target);
  if (rel === '..' || rel.startsWith('../') || isAbsolute(rel)) throw new ConfigurationError('Config path escaped root');
  let st;
  try { st = await lstat(target); } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return DEFAULT_CONFIG;
    throw new ConfigurationError('Cannot inspect .repotend.yml');
  }
  if (!st.isFile() || st.isSymbolicLink()) throw new ConfigurationError('.repotend.yml must be a regular non-symlink file');
  if (st.size > MAX_CONFIG_BYTES) throw new ConfigurationError('.repotend.yml exceeds 32 KiB');
  let text;
  try { text = await readFile(join(root, '.repotend.yml'), 'utf8'); }
  catch { throw new ConfigurationError('Cannot read .repotend.yml'); }
  return parseConfig(text, knownRules, enforceable);
}
