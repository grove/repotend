import { readFile, lstat } from 'node:fs/promises';
import { join, relative, isAbsolute, resolve } from 'node:path';

export type RuleSetting = Readonly<{ enabled: boolean; enforce: boolean }>;
export type Config = Readonly<{ schema: 1; profile: 'small-oss'; rules: Readonly<Record<string, RuleSetting>> }>;
export const DEFAULT_CONFIG: Config = { schema: 1, profile: 'small-oss', rules: {} };
const MAX_CONFIG_BYTES = 32 * 1024;

export class ConfigurationError extends Error {
  constructor(message: string) { super(message); this.name = 'ConfigurationError'; }
}

// This is deliberately a small, documented YAML subset: nested mappings with unquoted
// keys and boolean/scalar values. Unsupported YAML is rejected, never silently ignored.
export function parseConfig(text: string, knownRules: ReadonlySet<string>, enforceable: ReadonlySet<string>): Config {
  const document: Record<string, unknown> = Object.create(null);
  const settings: Record<string, RuleSetting> = Object.create(null);
  const pending: Record<string, Record<string, boolean>> = Object.create(null);
  let insideRules = false;
  let currentRule: string | null = null;
  let sawSchema = false;
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
      insideRules = key === 'rules';
      currentRule = null;
      if (Object.hasOwn(document, key)) throw new ConfigurationError(`Duplicate top-level key: ${key}`);
      if (!['schema', 'profile', 'rules'].includes(key)) throw new ConfigurationError(`Unknown top-level key: ${key}`);
      if (insideRules && raw !== undefined) throw new ConfigurationError('rules must contain nested mappings');
      if (!insideRules && raw === undefined) throw new ConfigurationError(`${key} requires a value`);
      document[key] = raw ?? null;
      if (key === 'schema') sawSchema = true;
    } else if (indent === 2 && insideRules) {
      if (!knownRules.has(key)) throw new ConfigurationError(`Unknown rule ID: ${key}`);
      if (Object.hasOwn(pending, key)) throw new ConfigurationError(`Duplicate rule ID: ${key}`);
      if (raw !== undefined) throw new ConfigurationError(`Rule ${key} requires a mapping`);
      pending[key] = Object.create(null);
      currentRule = key;
    } else if (indent === 4 && insideRules && currentRule !== null) {
      if (!['enabled', 'enforce'].includes(key)) throw new ConfigurationError(`Unknown setting ${currentRule}.${key}`);
      if (Object.hasOwn(pending[currentRule], key)) throw new ConfigurationError(`Duplicate setting: ${currentRule}.${key}`);
      if (raw !== 'true' && raw !== 'false') throw new ConfigurationError(`${currentRule}.${key} must be true or false`);
      pending[currentRule][key] = raw === 'true';
    } else {
      throw new ConfigurationError(`Line ${index + 1}: unexpected indentation or mapping`);
    }
  }
  if (!sawSchema || document.schema !== '1') throw new ConfigurationError('schema: 1 is required');
  if (document.profile !== undefined && document.profile !== 'small-oss') throw new ConfigurationError('Only profile: small-oss is supported');
  for (const [id, rule] of Object.entries(pending)) {
    if (rule.enforce && !enforceable.has(id)) throw new ConfigurationError(`Rule ${id} is heuristic and cannot be enforced`);
    if (rule.enabled === false && rule.enforce === true) throw new ConfigurationError(`Rule ${id} cannot be disabled and enforced`);
    settings[id] = { enabled: rule.enabled ?? true, enforce: rule.enforce ?? false };
  }
  return { schema: 1, profile: 'small-oss', rules: settings };
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
