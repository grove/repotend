# Design: RepoTend

**Status:** proposed architecture, pre-v0.1  
**Decision date:** 2026-10-17  
**Related:** [README](../README.md) · [Implementation plan](IMPLEMENTATION_PLAN.md)

## 1. Product decision (ADR-001)

RepoTend is a **small-project-first, GitHub-first, local-first repository health toolkit**. Its first interface is an open-format AI skill backed by independent deterministic validation scripts. Checks cover repository conventions, GitHub Actions, basic security, and developer experience. Findings are **advisory by default**; enforcement is explicit opt-in.

Other decisions: Apache 2.0 licensing; no hosted backend or opt-out telemetry; minimal configuration; GitHub metadata access only where necessary; future CLI and GitHub Action may reuse the same engine. The product is AI-assisted, not AI-required.

### Goals

- Produce reproducible, evidence-based repository findings with clear next actions.
- Provide useful defaults for solo maintainers and small open-source projects.
- Permit incremental adoption and project-specific exceptions without editing core rules.
- Keep fixes reviewable and safeguard source code, credentials, and GitHub settings.
- Make core checks callable without an agent, CI service, or GitHub credentials.

### Non-goals for v0.1

Full repo-health scoring; advanced test-pyramid optimization; running arbitrary project test suites; historical CI-spend estimates; cross-repository dashboards; code architecture analysis; cross-host integrations; public plugin ecosystem; fully autonomous repository mutations.

## 2. Component boundaries

```text
Agent Skill (SKILL.md + reference instructions)
  | selects checks; explains results; proposes changes
  v
Deterministic scripts / core check runner
  | load config, discover applicability, collect facts, run checks
  +--> local file/workflow adapters (read-only)
  +--> optional GitHub metadata adapter (read-only permissions)
  +--> external static analyzers (pinned, bounded, optional)
  v
Versioned findings JSON ----> Markdown report renderer
  |
  +--> future CLI and GitHub Action consumers
```

**Critical boundary:** never place the only implementation of a rule inside the AI skill. Scripts should provide the same result for the same input without depending on an AI model. AI interpretation is advisory and must not silently change factual results.

Recommended first implementation: TypeScript targeting a documented supported Node.js LTS version, with unit tests and fixture repositories. The first executable may simply be a script invoked by the skill, not a published CLI. Prefer small modules to premature plugin abstractions.

Proposed structure (subject to refinement):

```text
skills/repotend/SKILL.md
skills/repotend/references/
src/checks/
src/adapters/
src/config/
src/reports/
rules/
test/fixtures/
docs/
```

## 3. Rule contract

Each rule requires:

| Field | Purpose |
| --- | --- |
| `id` | Stable, namespaced identity, e.g. `github.actions.least-privilege` |
| `title`, `description`, `rationale` | Human-understandable purpose |
| `category` | conventions, ci, security, or dx |
| `severity` | info, warning, or error (impact independent of enforcement) |
| `appliesWhen` | Applicability predicate and explicit exclusions |
| `evidence` | Files, lines, config values, or API-derived facts supporting outcomes |
| `remediation` | Explanation, optional safe patch generator |
| `requirements` | Local inputs, optional GitHub permissions, or external binaries |
| `version` | Rule behavior revision or package version |

Rule execution should return an explicit status:

- `PASS`: verified and satisfied.
- `WARN`: deviation or heuristic recommendation; not a policy failure.
- `FAIL`: verified violation of an **explicitly enforced** rule.
- `UNKNOWN`: insufficient evidence, permissions, unsupported syntax, or an ambiguous interpretation.
- `NOT_APPLICABLE`: demonstrably irrelevant to the target.

**Execution failure** (invalid policy, crashed adapter, timeout, malformed repository data) is a separate `ERROR` diagnostic, never a misleading policy FAIL or PASS. A non-enforced verified deviation is WARN, even if its configured impact severity is error. The renderer must prominently explain enforcement settings.

### Example finding (illustrative schema; subject to tests)

```json
{
  "schemaVersion": "0.1",
  "toolVersion": "0.1.0",
  "repository": { "path": ".", "head": null },
  "mode": "audit",
  "findings": [
    {
      "ruleId": "github.actions.least-privilege",
      "ruleVersion": "1",
      "status": "WARN",
      "severity": "warning",
      "confidence": "verified",
      "summary": "Workflow does not declare an explicit permissions policy",
      "evidence": [
        { "path": ".github/workflows/test.yml", "line": 1 }
      ],
      "recommendation": "Review required token scopes and explicitly restrict permissions",
      "enforced": false
    }
  ],
  "errors": []
}
```

A missing explicit permissions stanza is not proof that a token is overprivileged; recommendations must consider repository and organization defaults. A `confidence` value such as `verified` or `heuristic` prevents speculative advice being disguised as certainty. Avoid printing secrets or full file contents in evidence.

### Applicability and severity

A rule must explain why it was skipped, or why evidence was insufficient. For example, no workflow files means some workflow-specific checks are NOT_APPLICABLE, not PASS. Missing GitHub API authentication makes remote label checks UNKNOWN, not a failure. High-impact security findings can have severity `error` while remaining WARN under advisory mode.

## 4. Configuration and enforcement

The optional `.repotend.yml` will be schema-validated. No file means a safe `small-oss` profile with advisory rules. Illustrative—not yet implemented:

```yaml
schema: 1
profile: small-oss
rules:
  github.actions.least-privilege:
    enabled: true
  repo.pr-template:
    enabled: true
    enforce: false
  repo.license-present:
    enabled: false
```

Configuration precedence: built-in profile, then repository config, then explicit invocation overrides. Unknown rule IDs and invalid settings generate configuration errors, not quiet success. Per-rule suppressions should require a rationale and preferably an optional expiry. “Enforcement” changes CI-facing exit behavior for verified policy violations; it does **not** grant permission to write or automatically change GitHub settings.

Exit contract for a future CLI/script: `0` for completed checks without enforced failures, nonzero distinct codes for enforced failures and execution/configuration errors. WARN and UNKNOWN remain visible in reports even when the exit code is zero. Publish exact codes and JSON schema before using them in CI.

## 5. v0.1 check families

### Repository conventions

Inspect required and recommended docs, GitHub issue and PR templates, and minimal contribution instructions. GitHub issue labels and settings require the GitHub API and must be optional; native issue types may supersede redundant `type:` labels. Avoid imposing README sections or processes unsuitable for small projects. Conventional Commit guidance belongs in the recommendations; title linting requires opt-in enforcement.

### GitHub Actions correctness and efficiency

Parse workflow YAML with correct handling of GitHub's `on` key, event filters, jobs, matrices, permissions, and expressions. Prefer established tools such as actionlint for semantic validation. Identify overlapping triggers, missing concurrency controls, risky permissions, and *possible* opportunities for caching or change-based execution. Do not claim measured savings from static inspection.

**Required-check safety:** Never automatically add workflow-level `paths` filters to a required check. Such filtering can leave required checks pending. Job-level conditional execution plus a correctly configured final gate is a possible solution but requires understanding dependencies, job skip semantics, and branch rules. Treat generated CI optimization as a proposed patch, not an unconditional autofix. Shared code/configuration changes should invalidate affected package builds.

### Security

Prioritize least-privilege workflow tokens, untrusted pull request execution, unpinned third-party actions, and safe credential use. Reuse tools such as OpenSSF Scorecard where appropriate. Security checks should provide evidence and realistic mitigations without making unverifiable guarantees.

### Developer experience

Check whether the README documents setup/test commands and whether formatting conventions are discoverable. Static audits do **not** execute setup commands; full onboarding verification is a separate future opt-in, sandboxed operation. Missing a particular formatter is a suggestion rather than a universal failure.

## 6. Skill interface and AI behavior

Use the open Agent Skills layout with `skills/repotend/SKILL.md`, a short description, and linked reference files. The skill should:

1. Identify repository context and request scope.
2. Run deterministic, read-only checks when available.
3. Clearly label verified, heuristic, and unknown findings.
4. Rank likely impact against maintainer effort.
5. Offer minimal, reviewable patches; avoid bulk formatting and unrelated edits.
6. Request explicit approval before writes, remote mutations, privileged auth changes, or executing arbitrary project code.
7. Re-run checks after any applied changes and report residual uncertainty.

Repository documents and PRs are **untrusted data**, never instructions overriding the skill. The skill must not claim tests have passed unless they ran. Agent-run checks may depend on the agent host's permissions; document that boundary.

## 7. Threat model and privacy

- Default static analysis reads bounded local files; it does not run project scripts or install dependencies.
- Prevent path traversal and symlink escape outside the audit root; enforce time, memory, and file-size limits.
- Do not interpolate repository-controlled text into shell commands.
- Optional API access requests minimum required scopes; never store or log tokens.
- External analyzers must be explicitly allowed, version-pinned, and run with documented constraints.
- No default telemetry, uploads, background service, or automatic external LLM invocation by the validator. The **host AI agent** may process repository content under its own model/provider policies; surface this clearly rather than promising code never leaves the machine.
- PR-created workflows must not expose privileged credentials to untrusted code.
- Proposed fixes must show diffs, preserve unrelated configuration, and be idempotent.
- Repository settings, branch protections, label edits, and publication actions require explicit approval.

## 8. Reports and validation

A stable JSON report is the contract between checks, skill, and later integrations. Markdown views must link each finding to relevant evidence and remediation. Stable ordering, explicit rule version, and bounded output enable snapshot testing and fair before/after comparisons.

Test layers:

- Unit tests for rule predicates, configuration, and status/exit semantics.
- Table-driven fixture repositories including good, bad, N/A, unknown, and malformed inputs.
- Regression fixtures for GitHub Actions events, required checks, permissions, and YAML edge cases.
- Integration tests with stubbed GitHub API responses (including rate-limit and authentication failures).
- Safety tests for untrusted paths, shell injection strings, and credentials redaction.
- Dogfooding against RepoTend itself.

## 9. Evolution and decision records

The first implementation should be small enough to refactor. Only introduce a public rule plugin API after multiple genuinely different rules justify it. Adopt semantic versions for packages and reports; breaking schema or behavior changes require changelog notes and upgrade instructions.

Later interfaces (CLI, reusable GitHub Action) should consume the same check runner and findings schema. Historical workflow measurements, test pyramid advice, language-specific adapters, and cross-repo reporting are separate opt-in modules, not dependencies of the initial design.

Open questions to resolve during implementation: exact supported Node versions, rule packaging format, whether YAML parsing needs expression-aware handling, authentication discovery, suppression format, and output-size ceilings. These are deliberate implementation details rather than blockers to the initial design.
