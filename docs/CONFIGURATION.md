# RepoTend configuration (experimental)

RepoTend works with **no configuration file**. The default `small-oss` profile enables all 13 checks as **advisory only**.

The optional `.repotend.yml` allows project-specific rule toggles, objective-rule enforcement, and **documented exceptions**:

```yaml
schema: 1
profile: small-oss
rules:
  repo.license-present:
    enforce: true
  repo.issue-templates:
    enabled: false
suppressions:
  repo.code-of-conduct:
    reason: Organization-wide community guidelines are inherited
    expires: 2027-01-31
  ci.duplicate-triggers:
    reason: Main pushes and feature PRs intentionally both run tests
```

A missing license now becomes `FAIL` and exits 1. A disabled issue-template rule is omitted from reports. An active suppression turns a corresponding would-be WARN/FAIL into **SUPPRESSED**, without erasing the finding or its evidence. No audit or exception mutates repository files.

## Exception semantics

- Every suppression must have an explicit, nonempty **plain-scalar reason** (up to 240 characters).
- `expires` is optional and, when present, must be a real `YYYY-MM-DD` UTC calendar date. It applies **through** that date; on the following UTC day the exception expires and its underlying rule resumes ordinary WARN/FAIL behavior.
- Expired exceptions remain visible in report metadata as `active: false`, with their original reason and expiry. Review and remove them when obsolete.
- A suppression does **not** convert PASS, UNKNOWN, or NOT_APPLICABLE into SUPPRESSED or PASS.
- Suppressions for unknown rule IDs, blank reasons, malformed dates, and disabled rules are configuration errors (exit 2). An enforced rule can be suppressed, but the policy is no longer blocking while its exception is active.
- `enabled: false` simply omits a rule; **prefer a suppression** when you want to preserve the finding and explain a deliberate exception. Suppressed findings are not automatically fixed.

## Supported syntax (intentional limitation)

This parser supports a deliberately small **subset of YAML**, not general YAML 1.2: `schema: 1`, optional `profile: small-oss`, `rules:` and `suppressions:` maps with 2-space nesting. Rule settings accept boolean `enabled` and `enforce`. Suppressions accept `reason` and optional `expires`, both **unquoted plain scalars**. Blank lines and full-line `#` comments are accepted. Quotes, aliases, inline maps/comments, arrays, tabs, duplicate keys, and unknown fields are rejected rather than silently ignored; avoid `#` in reason text. The file is limited to 32 KiB.

Configuration for a heuristic/non-enforceable rule may suppress a warning, but **cannot** set `enforce: true`. To see which rules can be enforced, consult the [rule catalog](RULE_CATALOG.md). This format may be extended in later releases only with documented compatibility decisions.

## Findings and exit codes

| Result | Meaning |
| --- | --- |
| `PASS` | The narrow condition was verified |
| `WARN` | Unenforced deviation or heuristic recommendation |
| `FAIL` | Verified deviation with explicit `enforce: true` and no active exception |
| `SUPPRESSED` | A visible, justified deviation covered by an active exception |
| `UNKNOWN` | The check could not establish a reliable result |
| `NOT_APPLICABLE` | The check does not apply, such as workflow analysis when no workflows exist |

`severity` is independent of enforcement; `confidence` is `verified` or `heuristic`; `errors[]` contains tool failures rather than policy violations. Exit codes are `0` for no enforced failures (including warnings and suppressed results), `1` for enforced failures, and `2` for execution or configuration errors.

The JSON audit report uses `schemaVersion: "0.1"`, stable rule IDs and versions, the applied profile, evidence, and optional suppression metadata. See the [v0.1 report contract](REPORT_CONTRACT.md) and checked-in JSON Schemas.

```sh
node skills/repotend/scripts/audit.mjs --root . --format markdown
node skills/repotend/scripts/audit.mjs --root . --format json
```

## Limits and safety

The validator requires Node.js 22.16+, uses built-in TypeScript stripping and a pinned YAML parser, and **does not execute scripts from audited repositories**. Symlinked file paths are not followed and workflow/configuration size bounds apply. GitHub Actions checks use YAML-aware parsing and line-numbered evidence, but passing does not prove least-privilege security or complete workflow validity. See [workflow checks](WORKFLOW_CHECKS.md).
