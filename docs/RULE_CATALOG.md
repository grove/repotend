# RepoTend v0.1 rule catalog

RepoTend is a **small-project-first, advisory-by-default** static repository auditor. These 13 rules describe narrow, inspectable properties—not a comprehensive security audit, a CI cost model, or an objective repository-health score. A `PASS` only confirms the specific condition described below.

## Local repository conventions

| Rule ID | What is actually checked | Enforceable? | Common limitations |
| --- | --- | --- | --- |
| `repo.license-present` | Recognizable license file at the repository root | Yes | File presence is not license validity or compatibility |
| `repo.contributing` | Recognized CONTRIBUTING file at the root, `.github/`, or `docs/` | Yes | Organization-wide defaults and content quality are not checked |
| `repo.code-of-conduct` | Recognized local code-of-conduct file | Yes | Organization-wide community health defaults are not checked |
| `repo.security-policy` | Recognized local SECURITY file | Yes | Does not verify a working private vulnerability reporting channel |
| `repo.pr-template` | Recognized PR template location | Yes | Presence does not prove the questions are useful |
| `repo.issue-templates` | One or more GitHub issue templates or forms, excluding config-only files | Yes | Does not validate form content or native GitHub issue types |
| `dx.editorconfig` | Presence of `.editorconfig` | Yes | Does not assess formatting conventions or detect conflicts with other formatters |

## GitHub Actions

| Rule ID | What is actually checked | Enforceable? | Common limitations |
| --- | --- | --- | --- |
| `ci.workflow-validity` | YAML 1.2 parse/duplicate-key errors and core workflow structure | Yes | Not full `actionlint` or Actions expression validation |
| `security.workflow-permissions` | Configured token permissions at workflow/job level, including possible broad write scopes | No | Contextual heuristic; write permissions can be intentional for releases |
| `ci.concurrency` | PR concurrency/cancellation settings | No | Cancellation may be unsafe for some deployment/release jobs |
| `ci.duplicate-triggers` | Possible overlapping `push` and `pull_request` triggers | No | Does not measure duplicate runner minutes |
| `ci.path-filter-safety` | Event-level path filters that might skip required checks | No | Branch protections and rulesets are not inspected |
| `security.action-pinning` | Mutable external action and reusable-workflow references | No | A pinned SHA is not proof that the action is safe |

See [workflow checks](WORKFLOW_CHECKS.md) for examples, detailed caveats, and YAML line-evidence behavior.

## Statuses and exceptions

- **PASS:** The narrow verified condition is satisfied.
- **WARN:** An actionable observation or heuristic recommendation is not enforced.
- **FAIL:** A verified violation with explicitly enabled enforcement.
- **SUPPRESSED:** A would-be WARN or FAIL is covered by an active, documented local exception. Suppressed findings remain in the report.
- **UNKNOWN:** Not enough evidence to produce a reliable result (including unreadable files or syntax that cannot be interpreted safely).
- **NOT_APPLICABLE:** The check does not apply to this repository.

Rules can be disabled or enforced per ID via [configuration](CONFIGURATION.md). Suppressions require a reason; an optional UTC expiration date returns the finding to WARN/FAIL after that day. Exceptions never turn UNKNOWN into PASS. **No rules are enforced by default.** Tool/config errors are separate from findings and return exit status 2.

The first two safe remediation templates address only `repo.pr-template` and `dx.editorconfig`; they require explicit approval before writing, and suppressed findings are not offered for remediation. See [remediation](REMEDIATION.md).

## Adding or revising a rule

Every rule needs an explicit applicability decision, stable ID/version, documented evidence, tests for healthy and unhealthy repositories, tests for missing/unsafe data, and an accurate confidence label. Where a result depends on maintainer intent (such as intentional write permissions), default to a contextual recommendation rather than CI enforcement. See [CONTRIBUTING](../CONTRIBUTING.md) and [dogfooding](DOGFOODING.md).
