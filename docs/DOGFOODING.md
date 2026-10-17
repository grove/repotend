# RepoTend dogfooding policy

RepoTend is its own initial reference repository. Every implemented check should run against RepoTend and remain inexpensive enough for a small open-source maintainer.

## Current setup (experimental)

The Node.js 22.16+ TypeScript rules engine, invoked through `skills/repotend/scripts/audit.mjs`, checks **thirteen** repository and workflow properties. Install pinned dependencies with `npm ci`. The same script is bundled with `skills/repotend/SKILL.md` and runs in `.github/workflows/repo-health.yml` on PRs and default-branch pushes. `npm test` exercises the auditor with fixture repositories.

Run locally:

```sh
npm ci
npm run typecheck
npm test
node skills/repotend/scripts/audit.mjs --format markdown
node skills/repotend/scripts/audit.mjs --format json
node skills/repotend/scripts/remediate.mjs # read-only plan preview
```

The workflow appends a summary to GitHub Actions. **Warnings do not block merges.** A runtime or configuration error fails the job, but an advisory finding does not. The workflow does not skip required checks based on changed-file filters.

## What we currently measure

| Rule | Check | Limits |
| --- | --- | --- |
| `repo.license-present` | Top-level LICENSE exists | Not a license compatibility analysis |
| `repo.contributing` | CONTRIBUTING.md exists | Does not validate its usefulness |
| `repo.code-of-conduct` | CODE_OF_CONDUCT.md exists | Does not prove enforcement quality |
| `repo.security-policy` | SECURITY.md exists | Does not verify a private reporting channel |
| `repo.pr-template` | Recognized PR template exists | Does not assess review quality |
| `repo.issue-templates` | Issue forms/templates exist | Does not validate field structure |
| `dx.editorconfig` | .editorconfig exists | Does not verify formatter consistency |
| `security.workflow-permissions` | YAML-aware workflow- and job-level permissions | Contextual heuristic; not a least-privilege/security verdict |
| `ci.workflow-validity` | YAML syntax and basic structure | Not a complete GitHub Actions validator |
| `ci.concurrency` | PR cancellation opportunities | Heuristic; cancellations can be harmful |
| `ci.duplicate-triggers` | Potentially overlapping push/PR triggers | Heuristic; not observed runner usage |
| `ci.path-filter-safety` | Event-level path filtering | Required-check status is not available offline |
| `security.action-pinning` | Floating external action references | Pinning does not prove action safety |

For detailed workflow check behavior, see [WORKFLOW_CHECKS.md](WORKFLOW_CHECKS.md). The rules engine only inspects local, regular files and never runs target-repository commands. Symlinks and unreadable files are treated as unknown where detectable. No GitHub API or LLM is needed for validation.

## Dogfooding contract

1. **Each new rule must run on this repository.** Add fixtures for passing, warning, unknown, not-applicable, and hostile inputs as relevant.
2. **Do not hide warnings.** Address genuinely useful findings or document why the recommendation is not applicable. Enforcement is opt-in for verified rules; an explicit suppression format remains a later milestone.
3. **Do not reward empty checklists.** A check must show evidence; a PASS is limited to what it actually tested.
4. **Don't weaken CI to improve the score.** Never skip required workflows via risky path filters or remove tests to achieve faster builds.
5. **Measure before claiming improvements.** Estimated CI savings or test-quality improvements must be distinguished from observed results.
6. **Keep it lightweight.** Audit remains read-only and limited to a pinned YAML parser and development tools unless more dependencies demonstrably help.

## Known gaps and next steps

This first engine slice now supports a small, strictly validated [`.repotend.yml` subset](CONFIGURATION.md), deterministic reports, and rule-level opt-in enforcement for objective checks. It now implements a limited YAML-aware GitHub Actions analysis, but does **not** implement full actionlint expression validation, generic autofixes, API-based checks, or the full rule catalog from [DESIGN.md](DESIGN.md). A [narrow remediation feature](REMEDIATION.md) can preview and, only with a reviewed plan ID, add two missing files. Default results remain informational. Track these gaps through the [implementation plan](IMPLEMENTATION_PLAN.md), not through misleading PASS statuses.

The default self-audit CI also generates the **read-only remediation preview**, ensuring RepoTend does not write into itself during automated checks.

The original bootstrap checks have been migrated into a shared typed rule registry; the compatibility entrypoint runs this single implementation. New checks must join that registry rather than introducing a competing auditor.

## External validation

In addition to our own self-audit, RepoTend tests two public projects at pinned commits using `npm run validate:external` on pull requests. These are **advisory, static audits** of temporary checkouts and do not execute the projects under review. See [EXTERNAL_VALIDATION.md](EXTERNAL_VALIDATION.md) for the exact commits, expectations, and remaining limitations.
