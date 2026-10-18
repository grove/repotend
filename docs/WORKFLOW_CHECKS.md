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

## Worked example: prioritize decisions

Consider a synthetic Node library that invites external contributions, has the other contributor files and EditorConfig, and lacks a local PR template. Its test workflow runs on branch pushes and path-filtered PRs; a separate tag workflow publishes GitHub releases with job-scoped write access. These snippets are static audit input, not workflows executed during validation.

`.github/workflows/test.yml`:

```yaml
name: Tests
on:
  push:
    branches: ['**']
  pull_request:
    paths: ['src/**', 'test/**', 'package*.json']
permissions:
  contents: read
concurrency:
  group: tests-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: '22'
      - run: npm ci --ignore-scripts
      - run: npm test
```

`.github/workflows/release.yml`:

```yaml
name: Release
on:
  push:
    tags: ['v*']
permissions:
  contents: read
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - run: gh release create "$GITHUB_REF_NAME" --verify-tag --generate-notes
        env:
          GH_TOKEN: ${{ github.token }}
          GH_REPO: ${{ github.repository }}
```

The local audit returns four advisory WARNs, with no execution errors. A useful agent response separates the evidence and ranks the next decisions as follows. This order reflects potential merge blockage, caution around releases, a cheap contributor improvement, and finally an unquantified efficiency opportunity; it is not a universal rule ranking.

**Heuristic workflow concerns — first establish context:**

| Priority | Finding and local evidence | Recommended decision, prerequisite, and possible outcome |
| --- | --- | --- |
| 1 | `ci.path-filter-safety`: PR path filters in `test.yml` | **Verify externally.** Check applicable branch protection/rulesets and the exact required check names: skipping a required workflow can leave a merge pending. If Tests is required, review an always-reporting gate and its coverage before changing filters. If it is optional and the coverage is intentional, accept/document the filter with no change. GitHub settings have not been inspected. |
| 2 | `security.workflow-permissions`: `publish` requests `contents: write` in `release.yml` | **Review intent.** Confirm the release command's required scopes and the trusted tag/release process before reducing access. Creating a GitHub release can justify this job-scoped write permission; removing it blindly could break publishing. If confirmed appropriate, accept/document it with no change. The warning alone does not establish a vulnerability or effective token permissions. |
| 4 | `ci.duplicate-triggers`: branch pushes and PR events in `test.yml` | **Quantify before changing.** Compare jobs and actual run history for the same commit, including branch-only coverage, durations, and required-check dependencies. No runner waste has been measured. Only consider restricting push triggers if the overlap is redundant and coverage remains intact; intentional dual runs can be accepted/documented. Do not cancel jobs just because this warning exists. |

**Verified local absence — a separate, low-effort consideration:**

| Priority | Finding and local evidence | Recommended decision, prerequisite, and possible outcome |
| --- | --- | --- |
| 3 | `repo.pr-template`: no recognized local PR template | **Consider locally.** Since this project welcomes contributors, a short motivation/testing template could help. First confirm that no shared organization template already meets the need. If one does, accept/document the local absence; otherwise offer a read-only preview of the supported addition. |

The bold decision phrases are explanatory prose, not report statuses or fields. Keep intentional WARNs visible with their rationale. A maintainer may instead approve a reasoned suppression, which retains the evidence as SUPPRESSED, not PASS; see [configuration](CONFIGURATION.md). Neither recommending a fix nor accepting an exception authorizes file, workflow, or configuration edits. The [remediation preview and explicit approval requirements](REMEDIATION.md) remain unchanged.

The automated fixture in `test/workflows.test.mjs` audits these exact snippets and checks the statuses, confidence, and evidence. It validates the static example, not a live agent response, GitHub policy inspection, release execution, or measured CI savings.

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
