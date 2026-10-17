# v0.1.0 release checklist (archived)

This is the historical acceptance checklist for the experimental [v0.1.0 release](https://github.com/grove/repotend/releases/tag/v0.1.0), published on October 18, 2026 (Europe/Oslo). The verified release gates and run URLs are in [release acceptance](RELEASE_ACCEPTANCE.md). Unchecked items are preserved for follow-up rather than represented as completed.

## Product readiness

- [ ] Confirm the 13-rule catalog, limitations, severity and confidence labels against actual code and fixture output.
- [ ] Verify the `small-oss` profile is advisory by default, including explicit enforcement, justified suppressions and expiration behavior.
- [ ] Check the audit and remediation v0.1 JSON outputs against the published schemas and review any intended compatibility guarantees.
- [ ] Verify the skill explains WARN, UNKNOWN, SUPPRESSED, and heuristic findings without claiming an overall security verdict.
- [ ] Verify preview/denial/human approval/same-plan apply/post-apply verification; the tested real Copilot host and limitations are recorded in [agent validation](AGENT_VALIDATION.md).
- [ ] Keep no-write static audits and least-privilege CI defaults; any requested write must be explicitly approved.

## Clean-install and CI acceptance

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run format:check
npm run lint
npm test
npm run release:check  # read-only pre-tag validation
npm run audit
npm run remediate   # read-only preview
npm run validate:external  # requires GitHub network access
```

- [x] All checks pass from a fresh checkout on a supported Node.js 22.16+ runtime.
- [x] Self-audit produces no unexplained warnings or errors and read-only remediation proposes no edits to RepoTend itself.
- [x] External pinned JavaScript and Python repository audits pass without running target project code.
- [x] Install a copied skill in a disposable consumer workspace, remove the tool checkout, and verify audit, preview, stale-plan refusal, and approved apply. Do not put authenticated Copilot sessions into default CI.
- [ ] Review dependency lockfile, license notices, secret handling, and workflow permissions.

## Release material

- [ ] Confirm README accurately describes the release candidate and its experimental limitations; mark publication only after the tag and GitHub Release exist.
- [x] Set `package.json`, package-lock root versions, and audit `toolVersion` to `0.1.0`; the read-only pre-tag script verifies alignment.
- [x] Add a v0.1.0 candidate changelog entry and [release notes](RELEASE_NOTES_V0.1.0.md) documenting host/platform limitations, rules, report semantics, and upgrades.
- [x] After tagging, confirm the versioned JSON Schema `$id` URLs resolve. The pre-tag gate only checks their intended targets.
- [x] Tag `v0.1.0` on the reviewed merge commit and publish GitHub Release only after PR CI, clean-install acceptance, and owner approval.
- [ ] Record what remains post-v0.1: test-pyramid analysis, deeper CI dependency/cost analysis, language-specific rules, package distribution, additional agent hosts, and API-based GitHub settings checks.

**Do not mistake an advisory PASS for certification.** Post-release feedback should prioritize actionable, low-false-positive findings over adding broad scoring features.
