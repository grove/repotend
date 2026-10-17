# External validation: first consumer milestone

**Scope:** read-only, pinned-commit audits of public repositories plus synthetic regression fixtures and copied-skill installation tests. RepoTend is still experimental. These deterministic tests do **not** establish AI-host discovery or recommendation quality; live host observations are recorded separately in [agent validation](AGENT_VALIDATION.md).

## Projects and rationale

| Project | Pinned Git revision | Why it was chosen |
| --- | --- | --- |
| [sindresorhus/escape-string-regexp](https://github.com/sindresorhus/escape-string-regexp) | `a7f7dabaf336bda98d2166848af15d9168b10bcf` | Tiny JavaScript repository, single workflow, lowercase license filename, security policy under `.github/` |
| [pallets/click](https://github.com/pallets/click) | `2247b35ea1c47c727d7a06e51fa280e12a863ff6` | Python repository with a substantial test matrix, publish/nightly workflows, `LICENSE.txt`, and `docs/contributing.md` |

These are **third-party projects** included as test subjects, not endorsements or alleged quality failures. Workflow warnings often represent reasonable project-specific decisions.

## Findings from initial inspection

Initial static inspection of the projects revealed that RepoTend's file-presence checks were overly restrictive:

| Existing check | Valid alternate layout | Correction in this PR |
| --- | --- | --- |
| `repo.license-present` | `license` (escape-string-regexp), `LICENSE.txt` (Click) | Accept common license filename variants |
| `repo.security-policy` | `.github/security.md` (escape-string-regexp) | Check recognized `.github/` and docs locations |
| `repo.contributing` | `docs/contributing.md` (Click) | Support standard documentation directories |

The fixes retain symlink-safe, read-only verification and emit evidence pointing at the **actual** recognized path. Automated fixtures prevent these regressions. A syntactic file-presence PASS does not assert the file's content is adequate.

## Observed results (GitHub Actions, October 17, 2026)

[Successful PR integration run](https://github.com/grove/repotend/actions/runs/39071525371) audited both pinned revisions. The external job completed successfully and no audit execution errors or unknown results were reported.

| Repository | PASS | WARN | UNKNOWN | Expectations |
| --- | ---: | ---: | ---: | --- |
| escape-string-regexp | 5 | 8 | 0 | All met |
| Click | 9 | 4 | 0 | All met |

**Escape-string-regexp warnings:** no repository-local contribution guide, code of conduct, PR template, or issue forms; token permissions are not explicitly configured; overlapping PR/push triggers, no PR cancellation, and floating action references were detected. Some repository documentation may be inherited from another GitHub location, so these absence warnings are *not* verified community-health deficiencies.

**Click warnings:** no repository-local code of conduct or security policy; write-capable permissions in workflow/job configuration; and path filters that *could* affect required checks. The inspected publish workflow intentionally requests write privileges for release publishing, so a write-capable token is **not automatically a vulnerability**. Branch protection and inherited organization policies were not inspected.

These outcomes are evidence of the current **static rules**, not proof of overall repository security, testing quality, or CI cost efficiency. Do not categorize every advisory WARN as a false positive or a defect without maintainer context. No target project code was executed, and the integration runner confirmed clean working trees after auditing.

## Live reproducible integration test

`npm run validate:external` checks out the exact commits above into temporary directories using `git fetch --depth=1`, runs the existing RepoTend JSON entrypoint, and verifies known statuses. A mismatch fails the integration test; ordinary advisory warnings do not. After auditing, the script verifies a clean working tree and deletes its temporary workspace.

The integration test runs as a **separate PR-only CI job**, keeping normal `main` pushes lightweight. Unlike checked-in fixtures, it requires GitHub availability and network access. Pinning prevents drift when upstream `main` changes. The test installs no dependencies from either external repository and runs none of their build/test scripts.

The report includes complete rule statuses and notes. `ci.workflow-validity` is **not** full actionlint validation, and issues such as path filters or write permissions require project-specific interpretation. See [workflow rules](WORKFLOW_CHECKS.md).

## Installation and agent integration

The [installer](INSTALLATION.md) now copies the skill, scripts, docs, and pinned runtime dependency into a self-contained directory. Tests run it from a separate consumer workspace and delete its source checkout before exercising audit and remediation. These tests validate script behavior; [agent validation](AGENT_VALIDATION.md) separately records actual Copilot CLI discovery, validator calls, denial, human-approved same-ID apply, and post-apply verification.

## Known gaps

- Results from two projects are illustrative, not statistically representative; additional user projects are needed to estimate false-positive rates.
- CI findings are currently static; no workflow run-time/cost measurements or branch-protection API access.
- Existing repo-health recommendations may be inherited via organization-wide community files, which the local-only auditor cannot inspect.
- Installation starts from a source checkout; no published package or release archive is provided.
- Live acceptance covers one constrained Copilot CLI configuration and disposable fixture; personal-directory discovery and other host/platform configurations remain unverified.

## Follow-up

Expand validation to a third project from a different ecosystem, capture reviewer feedback on warnings, and broaden opt-in real-host coverage. Keep every reported uncertainty visible rather than declaring a repository fully compliant based on a handful of static checks.
