import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { runAudit } from '../skills/repotend/scripts/engine.ts';
import { planRemediation, applyRemediation } from '../skills/repotend/scripts/remediation.ts';

const schema = JSON.parse(await readFile(new URL('../schemas/report.schema.json', import.meta.url), 'utf8'));
const remediationSchema = JSON.parse(await readFile(new URL('../schemas/remediation.schema.json', import.meta.url), 'utf8'));

// Intentionally supports only the JSON Schema keywords used by the published
// v0.1 contract. A non-schema-validation dependency is not introduced for CI.
// An independent Draft 2020-12 implementation should also validate the schema.
function matches(rule, value, root = schema) {
  if (rule.$ref) {
    const location = rule.$ref.split('/').slice(1).map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'));
    let resolved = root;
    for (const part of location) resolved = resolved[part];
    return matches(resolved, value, root);
  }
  if ('const' in rule && !Object.is(rule.const, value)) return false;
  if (rule.enum && !rule.enum.includes(value)) return false;
  if (rule.type) {
    const kinds = Array.isArray(rule.type) ? rule.type : [rule.type];
    if (!kinds.some((kind) => kind === 'null' ? value === null
      : kind === 'array' ? Array.isArray(value)
      : kind === 'integer' ? Number.isInteger(value)
      : kind === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
      : typeof value === kind)) return false;
  }
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) return false;
    if (rule.maxLength !== undefined && value.length > rule.maxLength) return false;
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) return false;
  }
  if (typeof value === 'number' && rule.minimum !== undefined && value < rule.minimum) return false;
  if (Array.isArray(value) && rule.items && !value.every((entry) => matches(rule.items, entry, root))) return false;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    if (rule.required && !rule.required.every((key) => Object.hasOwn(value, key))) return false;
    for (const [key, entry] of Object.entries(value)) {
      if (rule.properties?.[key]) {
        if (!matches(rule.properties[key], entry, root)) return false;
      } else if (rule.additionalProperties === false) return false;
    }
  }
  if (rule.allOf && !rule.allOf.every((sub) => matches(sub, value, root))) return false;
  if (rule.oneOf && rule.oneOf.filter((sub) => matches(sub, value, root)).length !== 1) return false;
  if (rule.if && matches(rule.if, value, root) && rule.then && !matches(rule.then, value, root)) return false;
  return true;
}

function verifySchemaUsesSupportedKeywords(value) {
  const supported = new Set(['$schema', '$id', '$defs', '$ref', 'title', 'description', 'type', 'required',
    'properties', 'additionalProperties', 'items', 'const', 'enum', 'minLength', 'maxLength',
    'minimum', 'pattern', 'allOf', 'oneOf', 'if', 'then']);
  const visit = (schemaNode) => {
    for (const [key, item] of Object.entries(schemaNode)) {
      assert(supported.has(key), `Unsupported keyword in the contract test: ${key}`);
      if (key === 'properties' || key === '$defs') Object.values(item).forEach(visit);
      if (key === 'items' || key === 'if' || key === 'then') visit(item);
      if (key === 'allOf' || key === 'oneOf') item.forEach(visit);
    }
  };
  visit(value);
}

test('v0.1 JSON Schema declares a stable version and only tested constraints', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.deepEqual(schema.properties.schemaVersion, { const: '0.1' });
  verifySchemaUsesSupportedKeywords(schema);
});

test('real self-audits and suppressed findings satisfy the published report contract', async (t) => {
  const report = await runAudit(process.cwd());
  assert(matches(schema, report));
  const root = await mkdtemp(join(tmpdir(), 'repotend-schema-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, '.repotend.yml'), 'schema: 1\nsuppressions:\n  repo.pr-template:\n    reason: Company PR template is inherited\n    expires: 2027-06-01\n');
  for (const date of ['2027-06-01', '2027-06-02']) {
    const result = await runAudit(root, undefined, date);
    assert(matches(schema, result));
    assert.equal(result.findings.find((f) => f.ruleId === 'repo.pr-template').status,
      date === '2027-06-01' ? 'SUPPRESSED' : 'WARN');
  }
});

test('schema rejects missing fields, unknown values, and invalid suppression metadata', async () => {
  const report = await runAudit(process.cwd());
  const mutate = (fn) => { const item = structuredClone(report); fn(item); return item; };
  assert(!matches(schema, mutate((r) => { delete r.schemaVersion; })));
  assert(!matches(schema, mutate((r) => { r.extra = 'unexpected'; })));
  assert(!matches(schema, mutate((r) => { r.findings[0].status = 'GREAT'; })));
  assert(!matches(schema, mutate((r) => { r.findings[0].evidence = [{ path: 'readme', line: 0 }]; })));
  assert(!matches(schema, mutate((r) => { r.findings[0].status = 'SUPPRESSED'; })));
  assert(!matches(schema, mutate((r) => { r.findings[0].status = 'SUPPRESSED'; r.findings[0].suppression = { active: false, reason: 'Not applicable' }; })));
  assert(matches(schema, mutate((r) => { r.findings[0].status = 'SUPPRESSED'; r.findings[0].suppression = { active: true, reason: 'Shared default' }; })));
});


test('remediation preview/apply results satisfy a separate versioned JSON contract', async (t) => {
  verifySchemaUsesSupportedKeywords(remediationSchema);
  const root = await mkdtemp(join(tmpdir(), 'repotend-remediation-schema-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const plan = await planRemediation(root);
  assert(matches(remediationSchema, plan, remediationSchema));
  const applied = await applyRemediation(root, plan.planId);
  assert(matches(remediationSchema, applied, remediationSchema));
  assert.equal(applied.verified.length, 2);
  assert(applied.verified.every((result) => result.status === 'PASS'));
  assert(!matches(remediationSchema, { ...plan, mode: 'unknown' }, remediationSchema));
  assert(!matches(remediationSchema, { ...plan, planId: 'short' }, remediationSchema));
});
