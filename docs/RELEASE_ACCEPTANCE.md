# RepoTend v0.1.0 release acceptance evidence

**State: v0.1.0 published on October 18, 2026 (Europe/Oslo).** [GitHub Release](https://github.com/grove/repotend/releases/tag/v0.1.0). The annotated tag points to the reviewed PR #10 merge commit `37fd2e2f8b525e24d4e6ac26a0e8f021c3bf4f6e`. This record preserves the acceptance and publication evidence.

## Evidence carried forward

| Gate | Evidence | What it supports |
| --- | --- | --- |
| Core validation and CI | [Main CI after PR #9](https://github.com/grove/repotend/actions/runs/39077529191) | Formatting, linting, type-checking, automated tests and self-audit passed on the preceding merged commit |
| Real Copilot interaction | [Agent validation](AGENT_VALIDATION.md) | Skill discovery, read-only audit and preview, explicit denial, human-approved same-plan apply, and verification on one constrained host |
| External consumer checks | [External validation](EXTERNAL_VALIDATION.md) | Read-only audits of pinned JavaScript and Python repositories; no target code executed |
| Policy and result semantics | [Configuration](CONFIGURATION.md), [report contract](REPORT_CONTRACT.md) | Advisory defaults, opt-in enforcement, suppressions, v0.1 result shape, and separate execution errors |
| Narrow remediation | [Remediation](REMEDIATION.md) | Two fixed missing-file templates, explicit approval, exclusive file creation, and re-audit |

These records do not establish behavior on every platform or host. See their documented limitations.

## Release-candidate checks

The release PR introduces `npm run release:check`. It performs a **read-only local** pre-tag check:

- `package.json` and the lockfile both declare stable version `0.1.0`.
- Audit JSON reports the same `toolVersion`, 13 narrowly scoped `PASS` findings, and no execution errors.
- The self-remediation preview has no proposals.
- The report/remediation JSON Schemas use Draft 2020-12 with matching intended `v0.1.0` raw GitHub URLs.

Run these checks on the candidate PR:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run format:check
npm run lint
npm test
npm run release:check
npm run audit
npm run remediate
npm run validate:external
```

**PR acceptance:** review the candidate PR's `self-audit` and PR-only `external-validation` GitHub Actions jobs. The public external GitHub smoke test requires network access; this is intentionally not replaced by fixture-only assertions. Confirm copied-skill installation tests run and pass through `npm test`.

## Completed release-owner gates

- [x] The reviewed PR #10 merge commit passed [main CI](https://github.com/grove/repotend/actions/runs/39078605451).
- [x] A [one-time release workflow](https://github.com/grove/repotend/actions/runs/39079089764) checked out the approved commit and passed formatting, linting, tests, release preflight, self-audit, read-only remediation preview, pinned external audits, and a copied-skill installation smoke test before tagging.
- [x] The annotated tag `v0.1.0` points to `37fd2e2f8b525e24d4e6ac26a0e8f021c3bf4f6e`, verified through GitHub's Git tag object.
- [x] Both tagged [audit report](https://raw.githubusercontent.com/grove/repotend/v0.1.0/schemas/report.schema.json) and [remediation](https://raw.githubusercontent.com/grove/repotend/v0.1.0/schemas/remediation.schema.json) JSON Schema URLs were verified; their `$id` values match the published tag.
- [x] A [tagged-source installation workflow](https://github.com/grove/repotend/actions/runs/39079213537) checked out `v0.1.0`, installed a copied skill from the tagged source, and verified audit and remediation-preview JSON in a disposable consumer workspace.
- [x] [GitHub Release v0.1.0](https://github.com/grove/repotend/releases/tag/v0.1.0) was published using `docs/RELEASE_NOTES_V0.1.0.md` and verified as neither draft nor prerelease.

The temporary release workflows were removed after publication. Their run URLs remain accessible as evidence. These results do not imply comprehensive security certification or portability to every agent host.

## Post-v0.1 direction

Gather feedback on false positives and maintainer time saved before expanding the rules. Future opportunities include test-pyramid analysis, dependency-aware CI job skipping and cost measurements, language-specific policies, additional AI hosts, and GitHub API/organization context. A passing advisory audit is **not** a security certification or an assertion of overall project quality.
