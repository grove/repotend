# v0.1.0 release checklist (pre-release)

This is an **acceptance checklist**, not a claim that v0.1.0 has been released. The release itself belongs in a separate reviewable release PR. Do not create a tag or GitHub Release until the checklist is satisfied.

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
npm run audit
npm run remediate   # read-only preview
npm run validate:external  # requires GitHub network access
```

- [ ] All checks pass from a fresh checkout on a supported Node.js 22.16+ runtime.
- [ ] Self-audit produces no unexplained warnings or errors and read-only remediation proposes no edits to RepoTend itself.
- [ ] External pinned JavaScript and Python repository audits pass without running target project code.
- [ ] Install a copied skill in a disposable consumer workspace, remove the tool checkout, and verify audit, preview, stale-plan refusal, and approved apply. Do not put authenticated Copilot sessions into default CI.
- [ ] Review dependency lockfile, license notices, secret handling, and workflow permissions.

## Release material

- [ ] Update README status from *experimental / pre-v0.1* only after final acceptance.
- [ ] Confirm `package.json` and audit `toolVersion` reflect the intended tag, not `0.1.0-dev`.
- [ ] Add a release changelog entry including supported host/platform limitations, major rules, report semantics, and upgrade notes.
- [ ] Confirm the versioned JSON Schema `$id` URLs resolve after tagging.
- [ ] Tag `v0.1.0` and publish release notes only after reviewed CI and acceptance.
- [ ] Record what remains post-v0.1: test-pyramid analysis, deeper CI dependency/cost analysis, language-specific rules, package distribution, additional agent hosts, and API-based GitHub settings checks.

**Do not mistake an advisory PASS for certification.** Post-release feedback should prioritize actionable, low-false-positive findings over adding broad scoring features.
