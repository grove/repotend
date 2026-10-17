# RepoTend Implementation Plan

**Status:** implementation underway — initial self-audit and a typed rules engine are implemented; v0.1 is not complete  
**Target:** a useful, auditable v0.1 rather than a broad rules framework  
**References:** [README](../README.md) · [Design](DESIGN.md)

## Delivery principles

- Ship working vertical slices, not framework-first milestones.
- A check only counts as done when it has fixtures, reproducible results, useful explanations, and documented limitations.
- Defaults are advisory; never change user repositories or remote settings implicitly.
- Treat GitHub metadata as optional and untrusted repository content as data.
- Develop RepoTend against its own repository alongside at least two differently structured example repos.

## Milestones

**Progress note:** Initial contributor files, an advisory self-audit, and a TypeScript rules registry are in place. The engine uses Node.js built-in TypeScript stripping to avoid runtime dependencies. Full M0 tooling (format/lint/typecheck in CI) and M1/M2 acceptance criteria still require work. The current config reader intentionally accepts a documented subset of YAML rather than all YAML features; see [configuration](CONFIGURATION.md).


### M0 — Repository foundation

**Goal:** make this repository easy to contribute to and establish a small, consistent build.

Deliver:
- Project README, design document, implementation plan, Apache 2.0 license.
- CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, PR template, issue forms.
- Agree on an actively supported Node.js LTS baseline and package manager; document both.
- Minimal TypeScript project, formatter, linter, test runner, and one required CI check.
- Initial architecture decision record capturing the skill-first, advisory-first approach (may start as the design document).

**Acceptance:** a fresh contributor can install dependencies, run format/lint/tests, and make a PR following the repository's instructions. CI passes on a documentation-only change without unnecessary expensive work. Nothing advertised as functional until tested.

### M1 — Deterministic audit slice

**Goal:** independently execute the first rules and emit a trustworthy report.

Deliver:
- Local root discovery and bounded, read-only file inspection.
- Versioned JSON findings structure and Markdown renderer.
- Config loader with schema validation, default `small-oss` profile, and clear precedence.
- Rule registry and applicability handling; severity separate from enforcement.
- Explicit statuses PASS / WARN / FAIL / UNKNOWN / NOT_APPLICABLE and distinct execution errors.
- Initial checks: license presence, PR template presence, contribution instructions presence, and workflow permissions configuration (with accurate caveats).
- A script entrypoint with a stable, documented invocation usable by the future skill.

**Acceptance:** same fixtures yield deterministic JSON; missing optional API access is UNKNOWN; N/A is not PASS; invalid configuration produces an error; all default policy deviations remain advisory. No repository code is executed, files remain unchanged, and tests cover malicious paths and malformed data.

### M2 — Portable Agent Skill

**Goal:** deliver the first actual user-facing interface.

Deliver:
- `skills/repotend/SKILL.md` and supporting usage/reference material aligned with Agent Skills.
- Instructions to invoke scripts, avoid inventing findings, explain evidence, and surface uncertainty.
- Example prompts: audit repository, prioritize findings, prepare proposed safe fix, verify proposed fix.
- Small, repeatable installation instructions for at least one compatible agent host; document host limitations.
- Smoke tests in a clean example repository using the actual instructions.

**Acceptance:** a maintainer can install the skill, request a read-only audit, and receive a prioritized explanation derived from a real JSON report; the skill never represents unexecuted checks as passing or silently modifies repository state.

### M3 — v0.1 rule coverage

**Goal:** cover four intended areas with high-signal checks, not an exhaustive catalog.

Initial candidate backlog, subject to fixture-driven refinement:

| Rule ID | What it checks | Evidence | Default |
| --- | --- | --- | --- |
| `repo.license-present` | Recognizable top-level license | repository path | Advisory |
| `repo.pr-template` | Recognizable PR template path | file path | Advisory |
| `repo.contributing` | Contribution instructions are discoverable | file path / doc reference | Advisory |
| `repo.issue-templates` | Issue templates/forms are discoverable | file paths | Advisory |
| `ci.workflow-validity` | Workflow syntax/semantics using an existing validator where available | workflow path, diagnostics | Advisory |
| `ci.duplicate-triggers` | Suspected redundant push/PR executions | workflow events | Heuristic advisory |
| `ci.concurrency` | Unconfigured cancellation opportunity | event/job configuration | Heuristic advisory |
| `security.workflow-permissions` | Explicit token permission posture | workflow/job permissions | Advisory, contextual |
| `security.untrusted-pr-context` | Risky privileged workflow usage | workflow trigger and steps | Advisory with security priority |
| `dx.setup-instructions` | Documented basic setup and tests | README and linked docs | Heuristic advisory |
| `dx.formatting` | Recognizable formatting policy/config | config files | Advisory |

Some checks require careful semantics: missing explicit token permissions does not prove overprivilege; duplicate events are not always duplicates; the optimal formatter and CI shape are project-specific. Only promote checks after false-positive tests.

Deliver:
- At least one meaningful tested rule in **each** of conventions, CI, security, and DX.
- Per-finding rationale, remediation instructions, evidence, and applicability rationale.
- No indiscriminate AI-only assertions disguised as deterministic results.
- Report-size and execution-time bounds; graceful degradation if optional analyzers are absent.

**Acceptance:** >= 8 stable, independently executable rules with positive, negative, N/A, and failure/unknown fixture cases where relevant. Every finding has an actionable explanation. Validate at least three representative repositories (including RepoTend) without mutating them.

### M4 — Conservative remediation and opt-in enforcement

**Goal:** progress from diagnosis to controlled improvement.

Deliver:
- Safe local patch suggestions for at least two deterministic rules (e.g. adding a missing standard template), with clear diff output.
- Explicit confirmation gates before writes; do not automate branch-protection, label, or permissions changes.
- Re-run affected checks after applying a proposed fix; capture before/after status.
- Per-rule `enforce` configuration and distinct exit behavior for enforced failures vs tool failures.
- Suppression mechanism with reasons; documentation showing how to opt out.
- Regression tests for idempotent fixes, conflict detection, and safe paths.

**Acceptance:** default audit does not write or fail CI for findings; opted-in enforcement fails on verified policy violations; fixes are small, reviewable, idempotent, and require approval. An ambiguous workflow rewrite remains a recommendation rather than an automatic fix.

### M5 — v0.1 release readiness

**Goal:** establish confidence that the skill and validators are useful and safe.

Deliver:
- End-to-end installation and audit walkthrough, tested from a clean environment.
- JSON schema/examples, rule catalog, configuration reference, limitations, and security model documentation.
- Release notes, tagged v0.1 version, and a prioritized post-v0.1 backlog.
- Dogfood RepoTend's audit and record findings; test at least two additional small repositories representing different stacks.
- Verify license notices, dependency security, and minimal GitHub permissions.

**Acceptance:** a new maintainer can follow the instructions, generate a truthful audit, understand at least one actionable recommendation, and safely prepare a proposed fix. All deterministic tests pass, known limitations are documented, and no hosted service or LLM credentials are required for scripts.

## Initial GitHub issue breakdown

Suggested issue order; create only when ready to execute, and keep each PR narrowly scoped:

1. `docs: establish contributor and security guidance` (M0)
2. `build: initialize TypeScript checks and CI` (M0)
3. `feat(core): define config and findings schema` (M1)
4. `feat(core): add read-only repository adapter and rule runner` (M1)
5. `feat(rules): add repository convention checks` (M1/M3)
6. `feat(skill): create portable Agent Skill` (M2)
7. `feat(rules): add workflow validation and efficiency checks` (M3)
8. `feat(rules): add security and onboarding checks` (M3)
9. `feat(reports): render prioritized Markdown findings` (M1/M3)
10. `feat(remediation): generate reviewable local proposals` (M4)
11. `feat(policy): support explicit enforcement and suppressions` (M4)
12. `test: validate v0.1 across representative repositories` (M5)
13. `docs: publish installation, examples, and release notes` (M5)

Dependencies: M0 precedes executable CI; M1's schema and runner precede reliable skill integration; the first skill can be exercised before all M3 rules exist; M4 follows tested checks; M5 requires the complete minimal flow. Avoid creating a large backlog of speculative checks before the core contracts stabilize.

## Quality bar for every rule

A rule PR must document:

- What user problem it addresses and why it belongs in a small project.
- Applicability criteria, required inputs, and what counts as UNKNOWN or N/A.
- Exact verification logic, uncertainty, and likely false positives.
- Example compliant and non-compliant fixtures.
- Severity, advisory default, and rationale for any optional enforcement.
- Safe remediation instructions; whether auto-remediation is intentionally unavailable.
- Tests of missing/malformed/untrusted input and stable JSON output.

Prefer simpler rules that provide high signal. Reject rules that cannot be explained or tested without a large subjective scoring model.

## Explicitly deferred

- “Optimal” test pyramid, mutation coverage, flaky-test instrumentation.
- Dependency-graph-driven CI job skipping, historical cost savings, and build-time baselines.
- Fully automated GitHub label and ruleset mutation; GitHub App installation.
- Hosted dashboard, database, telemetry, organization-wide fleet orchestration.
- Public plugin SDK, language-specific frameworks, GitLab support.
- A standalone packaged CLI and a reusable GitHub Action (the underlying validator should make these straightforward later).

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Rules become noisy or prescriptive | Applicability tests, advisory defaults, explicit exceptions, fixture validation |
| AI hallucinates compliance | Engine-generated evidence, clear UNKNOWN, scripted verification |
| CI “optimization” weakens checks | No automatic workflow path filtering; gated proposals and tests |
| Untrusted repository inputs compromise host | Read-only static scan, path bounds, no arbitrary shell execution |
| Skill portability varies by host | Open skill format; document tested agents and limitations |
| Scope expands without shipping | Eight-rule minimum, milestone acceptance gates, deferred backlog |
| External tools complicate installation | Optional integration, pinned dependencies, graceful UNKNOWN/diagnostic |

## Definition of done for v0.1

A working **Agent Skill + independently runnable read-only validators** with at least eight tested rules across four areas; predictable versioned JSON and useful Markdown output; optional config and opt-in enforcement; conservative reviewable fix proposals; clean install instructions; successful real-repository dogfooding; and explicit safety/privacy limitations.

Do **not** call the product production-ready solely because the documentation is complete.
