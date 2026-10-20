# GitHub Actions workflow analysis (experimental)

RepoTend performs **read-only static analysis** of `.github/workflows/*.yml` and `*.yaml` using a YAML 1.2 parser with duplicate-key detection and line-numbered evidence. The parser does not run workflows, download action code, or access GitHub metadata. YAML documents are interpreted with bounded alias expansion, and files above 256 KiB are treated as unknown.

## Rules

| Rule | Observation | Interpretation |
| --- | --- | --- |
| `ci.workflow-validity` | Parse errors, duplicate keys, missing `on:` and `jobs:` mappings | Verified **basic** YAML/structural checks; **not** a full Actions validator |
| `security.workflow-permissions` | Workflow- and job-level `permissions:`; broad `write` permissions and inherited defaults | Contextual heuristic; cannot infer effective org/repo permissions or whether write access is justified |
| `ci.concurrency` | PR workflows without recognizable cancellation groups | Advisory opportunity; cancellation can be inappropriate for deploy jobs |
| `ci.duplicate-triggers` | Push and PR triggers likely to overlap for feature branches | Heuristic only, not an estimate of duplicate runner minutes |
| `ci.path-filter-safety` | Event-level `paths` or `paths-ignore` filters | Potential risk **if** affected checks are required by branch/ruleset policies (not inspected by the local validator) |
| `security.action-pinning` | External steps/actions, Docker images, and reusable workflow references using mutable refs | Checks references, not trustworthiness of the reviewed SHA; local repository paths are excluded |

All six rules use the same registered engine and output statuses as convention checks. Only `ci.workflow-validity` is eligible for explicit opt-in enforcement in this version. The other checks remain advisory by design. Ambiguous or unreadable workflows yield `UNKNOWN` rather than a misleading `PASS`.

Line-level evidence is attached where the YAML parser exposes source locations. `PASS` means the narrow static property was verified, **not** that the workflow is valid in every GitHub Actions context or safe to run.

After the local audit, maintainers may explicitly opt in to [separate read-only GitHub required-check context](GITHUB_VERIFICATION.md). It uses an existing authorized `gh` connection, keeps inaccessible policies uncertain, and never changes the local findings or v0.1 report.

## Why not automatically fix CI?

Skipping unnecessary jobs safely may require dependency graphs, default-branch rulesets, monorepo semantics, and real execution data. A generated path filter might accidentally leave required checks pending or skip affected builds. RepoTend only *recommends* such changes; it does not rewrite workflow triggers, token permissions, or action versions. For maintainers who separately approve a proposed workflow change and have access to original Actions evidence, the [manual CI impact evaluation](CI_IMPACT_EVALUATION.md) and [worksheet](CI_IMPACT_WORKSHEET.md) document a bounded before/after study, including an honest insufficient-data outcome.

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

## Evidence in agent reports

Use the existing JSON `ruleId`, `evidence[].path`, and optional `evidence[].line` in agent explanations. Each distinct evidence location appears once; a linked label already supplies the path. The validator remains local and offline. Remote/revision verification is optional host-side, read-only work; if unavailable, keep plain text. Follow the full [skill guidance](https://github.com/grove/repotend/blob/main/skills/repotend/SKILL.md#cite-rule-ids-and-evidence) before linking.

### Real-workflow sample

On October 18, 2026, a fresh read-only audit of the existing public fixture `sindresorhus/escape-string-regexp` at `a7f7dabaf336bda98d2166848af15d9168b10bcf` returned 5 PASS, 8 advisory WARN, and no errors (exit 0). The checkout's remote and full `HEAD` were verified, its worktree was clean before and after the audit, and GitHub's read-only contents API confirmed this exact file's public URL at that commit. No target code was executed or repository content uploaded. Relevant JSON fields:

```json
{
  "ruleId": "security.action-pinning",
  "status": "WARN",
  "confidence": "verified",
  "evidence": [
    { "path": ".github/workflows/main.yml", "line": 16 },
    { "path": ".github/workflows/main.yml", "line": 17 }
  ]
}
```

An agent can present this finding as:

> **WARN — `security.action-pinning` (verified):** External actions use mutable refs at [.github/workflows/main.yml:16–17](https://github.com/sindresorhus/escape-string-regexp/blob/a7f7dabaf336bda98d2166848af15d9168b10bcf/.github/workflows/main.yml#L16-L17). Consider reviewed full-SHA pins after confirming the intended action versions and update process. Pinning alone does not establish action safety.

The two consecutive evidence entries are combined into one linked range without repeating the path. The link targets the audited commit, not today's default branch. This is an observed validator result with a manually reviewed presentation example, not a live agent-host acceptance claim. The fixture and pinned revision are already used by `npm run validate:external`; that opt-in integration command requires network access, while the audit itself does not.

### Fallback review cases

Replay these scenarios when reviewing an agent response. They specify presentation expectations, not new validator behavior or automated host coverage.

| Available evidence/context | Expected presentation |
| --- | --- |
| Local-only repository; `.github/workflows/test.yml`, line 6 | `ci.path-filter-safety` — `.github/workflows/test.yml:6`; no URL. |
| Unknown remote, non-GitHub remote, multiple unresolved remotes, or a private/inaccessible GitHub repository | Keep the same local reference and state that a public repository/revision link could not be verified. Do not guess or probe for credentials. |
| Verified public checkout; audit root is `packages/widget`, evidence is `docs/contributing.md` without a line | `repo.contributing` — `docs/contributing.md`; no line or URL is invented. |
| Same nested root; evidence is `.github/workflows/test.yml:6` and a matching committed file/line is verified | Label stays `.github/workflows/test.yml:6`; URL path includes the verified `packages/widget/` prefix. Never link the repository-root workflow by mistake. |
| Missing local template, or file renamed/deleted since the audit | Keep the original evidence path and explain the absence/change. Do not link a replacement or nonexistent file; rerun the audit if current evidence is needed. |
| Local edits differ from `HEAD`, or a local commit is not confirmed on GitHub | Keep local evidence; neither a remote URL nor a local SHA proves matching published bytes. |
| Only a verified matching branch/ref is available | Link only to that established ref, labeled **nonpermanent; branch may move**. An unknown ref means plain text. |
| Several findings cite the same file/line | Keep each finding's rule ID; within each finding render that location once, without a redundant parenthesized copy. |

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
