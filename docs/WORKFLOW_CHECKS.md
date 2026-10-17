# GitHub Actions workflow analysis (experimental)

RepoTend performs **read-only static analysis** of `.github/workflows/*.yml` and `*.yaml` using a YAML 1.2 parser with duplicate-key detection and line-numbered evidence. The parser does not run workflows, download action code, or access GitHub metadata. YAML documents are interpreted with bounded alias expansion, and files above 256 KiB are treated as unknown.

## Rules

| Rule | Observation | Interpretation |
| --- | --- | --- |
| `ci.workflow-validity` | Parse errors, duplicate keys, missing `on:` and `jobs:` mappings | Verified **basic** YAML/structural checks; **not** a full Actions validator |
| `security.workflow-permissions` | Workflow- and job-level `permissions:`; broad `write` permissions and inherited defaults | Contextual heuristic; cannot infer effective org/repo permissions or whether write access is justified |
| `ci.concurrency` | PR workflows without recognizable cancellation groups | Advisory opportunity; cancellation can be inappropriate for deploy jobs |
| `ci.duplicate-triggers` | Push and PR triggers likely to overlap for feature branches | Heuristic only, not an estimate of duplicate runner minutes |
| `ci.path-filter-safety` | Event-level `paths` or `paths-ignore` filters | Potential risk **if** affected checks are required by branch/ruleset policies (which are not inspected yet) |
| `security.action-pinning` | External steps/actions, Docker images, and reusable workflow references using mutable refs | Checks references, not trustworthiness of the reviewed SHA; local repository paths are excluded |

All six rules use the same registered engine and output statuses as convention checks. Only `ci.workflow-validity` is eligible for explicit opt-in enforcement in this version. The other checks remain advisory by design. Ambiguous or unreadable workflows yield `UNKNOWN` rather than a misleading `PASS`.

Line-level evidence is attached where the YAML parser exposes source locations. `PASS` means the narrow static property was verified, **not** that the workflow is valid in every GitHub Actions context or safe to run.

## Why not automatically fix CI?

Skipping unnecessary jobs safely may require dependency graphs, default-branch rulesets, monorepo semantics, and real execution data. A generated path filter might accidentally leave required checks pending or skip affected builds. RepoTend only *recommends* such changes; it does not rewrite workflow triggers, token permissions, or action versions.

## Deeper validation

For complete GitHub Actions semantics and expression validation, run [actionlint](https://github.com/rhysd/actionlint) separately. RepoTend's own `ci.workflow-validity` currently checks YAML plus a small set of core workflow structure rules. Integration with actionlint's diagnostics is a follow-up task, not a feature claimed by this PR.

## Development

Install dependencies once and run the complete suite:

```sh
npm ci
npm run typecheck
npm test
npm run audit
```

Add fixtures that cover YAML 1.2's `on` key, sequence and mapping event forms, job-scoped overrides, duplicate keys, malformed/unreadable files, short-lived PR branches, local actions, and floating external refs. Each new check must be run against RepoTend's own `.github/workflows/repo-health.yml`.
