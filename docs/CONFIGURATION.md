# RepoTend configuration (experimental)

RepoTend works with **no configuration file**. Its default `small-oss` profile enables all thirteen current checks as **advisory only**.

To disable a check or enforce an objective rule, create `.repotend.yml` at the target repository root:

```yaml
schema: 1
profile: small-oss
rules:
  repo.license-present:
    enforce: true
  repo.issue-templates:
    enabled: false
```

In this example, a missing license becomes `FAIL` and causes exit status 1; the issue-template rule is omitted; all other deviations remain advisory warnings. Nothing is ever automatically modified.

## Accepted syntax (intentional limitation)

**This implementation deliberately supports only a small YAML subset**, not general YAML 1.2: `schema: 1`, optional `profile: small-oss`, and optional `rules:` mapping with 2-space indentation. Rule entries have `enabled` and/or `enforce` boolean fields (`true` or `false`). Blank lines and full-line `#` comments are allowed. Aliases, quoted keys, inline maps, inline comments, tabs, arrays, and non-boolean rule settings are rejected. Duplicate, unknown, and malformed entries fail with an explicit configuration error. Configuration files are limited to 32 KiB. A complete YAML parser may replace this subset later.

Existing IDs are listed in [DOGFOODING.md](DOGFOODING.md). `security.workflow-permissions` is a textual heuristic and **cannot** be enforced. Disabled rules do not appear in reports. A future release may add suppressions with rationale and expiry; they are not accepted yet.

## Results and exit codes

| Result | Meaning |
| --- | --- |
| `PASS` | The narrow condition checked by this rule was satisfied |
| `WARN` | An unenforced deviation or heuristic recommendation |
| `FAIL` | A **verified** rule deviation with explicit `enforce: true` |
| `UNKNOWN` | The rule could not establish a finding |
| `NOT_APPLICABLE` | The rule does not apply, e.g. no workflows to inspect |

`severity` describes importance independent of enforcement. `confidence` is either `verified` or `heuristic`. `errors[]` reports rule-engine failures rather than policy violations.

The script exits with `0` when no enforced failures or tool errors occur, `1` when an enforced rule fails, and `2` for configuration or execution errors. Warnings, unknown findings, and N/A findings do not fail a default audit. JSON reports include `schemaVersion: "0.1"`, stable rule IDs and versions, a profile, findings, and errors. Output ordering is deterministic.

```sh
node skills/repotend/scripts/audit.mjs --root . --format markdown
node skills/repotend/scripts/audit.mjs --root . --format json
```

## Limitations and safety

The validator uses Node.js 22.16+ built-in TypeScript stripping via a compatibility launcher, with a pinned YAML parser dependency. Static checks inspect repository files read-only; they do **not** run untrusted test/build scripts. Symlinked paths are not followed, and file-size bounds apply to workflow/configuration reads. Workflow rules use YAML 1.2 parsing and line-numbered evidence, but a PASS does not imply least-privilege permissions or a security audit. See [WORKFLOW_CHECKS.md](WORKFLOW_CHECKS.md).
