# RepoTend v0.1.0 release acceptance evidence

**State:** release candidate; **not tagged or published**. This record separates previously observed acceptance evidence from checks that must run on the exact release commit.

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

## Release-owner gates (after PR merge)

- [ ] Review the exact merged `main` SHA and ensure its CI passed.
- [ ] Create annotated tag **`v0.1.0` pointing at that SHA**. Do not tag a branch before the release PR is accepted.
- [ ] Confirm both JSON Schema `$id` URLs resolve to the tagged versions. Pre-tag local checks only validate their *declared targets*, not remote availability.
- [ ] Run a source checkout/install smoke test using the tag rather than `main`.
- [ ] Publish GitHub Release `v0.1.0` using [release notes](RELEASE_NOTES_V0.1.0.md), with experimental limitations visible.
- [ ] Verify the published release/tag and installation links; then update release status in the repository as needed.

Example owner commands, executed **only after approval and merge**:

```sh
git fetch origin main --tags
git checkout main
git pull --ff-only origin main
git tag -a v0.1.0 <reviewed-merge-sha> -m 'RepoTend v0.1.0'
git push origin v0.1.0
# After verifying tag and schema URLs:
gh release create v0.1.0 --title 'RepoTend v0.1.0' --notes-file docs/RELEASE_NOTES_V0.1.0.md
```

Replace `<reviewed-merge-sha>` with the exact verified merge SHA. Tagging and publishing are intentionally **not automated** by the PR.

## Post-v0.1 direction

Gather feedback on false positives and maintainer time saved before expanding the rules. Future opportunities include test-pyramid analysis, dependency-aware CI job skipping and cost measurements, language-specific policies, additional AI hosts, and GitHub API/organization context. A passing advisory audit is **not** a security certification or an assertion of overall project quality.
