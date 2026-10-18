# Machine-readable reports — v0.1 contract

RepoTend provides versioned JSON contracts that an agent, CI integration, or other tool can consume independently of Markdown presentation:

- [`schemas/report.schema.json`](../schemas/report.schema.json): outputs from `audit.mjs --format json` (`mode: audit`).
- [`schemas/remediation.schema.json`](../schemas/remediation.schema.json): preview (`mode: remediate`) and approved apply (`mode: apply`) outputs from `remediate.mjs --format json`.

The schemas target **JSON Schema Draft 2020-12**. The checked-in tests cover the structural constraints and use real audit/preview/apply outputs; before publication they are also reviewed with an independent JSON Schema validator. These schemas identify the future `v0.1.0` release artifact; they are **not published release URLs until that tag is created**. They should be treated as stable within v0.1 once tagged.

The optional [GitHub settings verifier](GITHUB_VERIFICATION.md) emits separate experimental `mode: "github-context"` JSON. It is outside these stable v0.1 contracts and never adds fields or changes statuses in the local audit report.

## Audit format

The top-level report contains `schemaVersion`, `toolVersion`, `repository`, `mode`, `profile`, `findings`, and `errors`. Each finding has a stable `ruleId`, a rule-specific `ruleVersion`, `status`, impact `severity`, evidence `confidence`, a concise `summary`, `evidence` paths with optional line numbers, nullable `recommendation`, and `enforced`.

A configured suppression adds optional metadata:

```json
{
  "suppression": {
    "reason": "Organization-wide PR template is already configured",
    "expires": "2027-01-31",
    "active": true
  }
}
```

`expires` is optional. When a suppressed rule would otherwise WARN or FAIL, `status` becomes `SUPPRESSED`. An expired suppression remains visible with `active: false`, and the result reverts to its regular status. Passing, unknown, and non-applicable outcomes are **not** rewritten by suppressions.

**Important:** `severity` is independent of enforcement, and `confidence: heuristic` must not be described as a verified defect. A `SUPPRESSED` rule is a documented exception, not a PASS or a successful fix.

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Audit completed without enforced policy failures; ordinary warnings and suppressions remain visible |
| `1` | One or more explicitly enforced verified policy violations |
| `2` | Configuration or execution error; results should not be represented as successful |

The remediation preview is always read-only; applying requires the reviewed full plan ID and explicit approval. These operations report actual created files and post-apply statuses. Existing file changes, remote GitHub setting mutations, and arbitrary workflow fixes remain out of scope.

## Compatibility promises for v0.1

Rule IDs and reported outcomes should not change silently. A new rule or additional optional evidence field must come with schema and tests. Changes to `schemaVersion`, required fields, exit semantics, or suppression interpretation require release notes and an explicit compatibility decision. Reports are deterministically ordered and must not leak credentials or large source content as evidence.
