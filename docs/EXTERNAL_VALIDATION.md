# External validation: first consumer milestone

**Scope:** read-only, pinned-commit audits of public repositories plus synthetic regression fixtures and a local symlinked-skill smoke test. RepoTend is still experimental. These tests do **not** establish that an AI host automatically discovers the skill or that every recommendation is correct.

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

## Live reproducible integration test

`npm run validate:external` checks out the exact commits above into temporary directories using `git fetch --depth=1`, runs the existing RepoTend JSON entrypoint, and verifies known statuses. A mismatch fails the integration test; ordinary advisory warnings do not. After auditing, the script verifies a clean working tree and deletes its temporary workspace.

The integration test runs as a **separate PR-only CI job**, keeping normal `main` pushes lightweight. Unlike checked-in fixtures, it requires GitHub availability and network access. Pinning prevents drift when upstream `main` changes. The test installs no dependencies from either external repository and runs none of their build/test scripts.

The report includes complete rule statuses and notes. `ci.workflow-validity` is **not** full actionlint validation, and issues such as path filters or write permissions require project-specific interpretation. See [workflow rules](WORKFLOW_CHECKS.md).

## Installation and agent integration

The skill currently depends on the RepoTend source checkout and its pinned Node dependencies. We documented a local symlink installation for compatible agents in [INSTALLATION.md](INSTALLATION.md) and added a test that runs the skill's bundled auditor from a separate workspace. This validates its **script invocation**, not automatic skill discovery or language-model reasoning in a particular agent host. Until host-level testing is available, those capabilities remain unverified.

## Known gaps

- Results from two projects are illustrative, not statistically representative; additional user projects are needed to estimate false-positive rates.
- CI findings are currently static; no workflow run-time/cost measurements or branch-protection API access.
- Existing repo-health recommendations may be inherited via organization-wide community files, which the local-only auditor cannot inspect.
- Installation is source-based and not a standalone skill distribution.
- A live AI agent end-to-end user session has not been verified; do not claim it has.

## Follow-up

Expand validation to a third project from a different ecosystem, capture reviewer feedback on warnings, and add an integration test in one actual supported AI host. Keep every reported uncertainty visible rather than declaring a repository fully compliant based on a handful of static checks.
