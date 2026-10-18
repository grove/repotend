# RepoTend #15: Deliver evidence handoff

Later [GitHub-hosted macOS native follow-up](native-follow-up/README.md): native boundary canaries succeeded, but Node startup was denied before behavioral tests ran. The records below remain the historical local attempts.

The CLI improvement is implemented and ordinarily tested. **The native Deliver demonstration is BLOCKED**, because the actual native sandbox preflight failed. No native product test passed or failed; none ran. Overall requirement coverage remains **UNKNOWN**.

This handoff is for [Foundryline #18](https://github.com/grove/foundryline/issues/18) and [#21](https://github.com/grove/foundryline/issues/21). It does not modify Foundryline or close its issues. An unmerged RepoTend PR is authorized; merge, deployment and applying remediation are not.

## Original source, authority and frozen candidate

- Original: [RepoTend issue #15](https://github.com/grove/repotend/issues/15), node ID `I_kwDOVNwFFM8AAAABYC7IKQ`, created/updated `2026-10-18T10:38:32Z`. Its complete body is S1, not a rewritten request. The discussion API returned `[]`.
- Exact UTF-8 issue body: 7,650 bytes; SHA-256 `e1d61d83be03e8c442d05d1953bd2de47cd3a5a17a755c87d81826c56cb163f8`.
- Baseline: [`2d69cce901475380775f674b9cc5755f1f89f82e`](https://github.com/grove/repotend/commit/2d69cce901475380775f674b9cc5755f1f89f82e).
- Frozen implementation: [`ead77fde6a5a7ba33e54cc81deb76fced8dbc333`](https://github.com/grove/repotend/commit/ead77fde6a5a7ba33e54cc81deb76fced8dbc333); tree `544421686de4112ca1ac8bfb118cde750821e3ef`. The parser, compatibility entrypoint and two behavioral tests changed. The working tree was clean before both Proofline attempts.
- Proofline copied that exact tree into its own snapshot commit `9d1060391fffd0466688b628ed605406613814eb`. Both attempts have identical selection manifests. The snapshot commit is local evidence, not the published implementation commit.
- The user explicitly launched this implementation, checks, independent review and unmerged RepoTend PR. Neither the issue nor an Intentline draft independently grants those effects.
- Evidence documentation is appended after the frozen implementation. The native records do not attest to the later evidence appendix.

## Retained records

[Download the original records](records.tar.gz); [SHA-256 inventory](manifest.json). The archive preserves bytes rather than reformatting canonical Intentline JSON. It contains the full issue/discussion responses, issue body, retrieved Deliver recipe and revision, original producer work and export, command invocations and exit statuses, ordinary test output, and both complete Proofline record directories, including candidate snapshots, native preflight receipts and integrity evidence. Local paths and filesystem identities are provenance labels, not authenticated authorship.

Extract into a fresh private directory for inspection:

```sh
mkdir -m 700 /private/tmp/repotend-15-review
tar -xzf docs/evidence/issue-15/records.tar.gz -C /private/tmp/repotend-15-review
```

Original absolute paths are retained in receipts. Extraction does not reproduce host qualification or change the historical results. No credentials or authentication records are included.

## Genuine Intentline draft/export

The actual CLI from [Intentline `25e926f57e69395193fc0ac258f9e6dd2332cb18`](https://github.com/grove/intentline/tree/25e926f57e69395193fc0ac258f9e6dd2332cb18) ran `prepare`, `propose`, `check`, `review` and `export --format json`. This is initial acceptance schema 1, revision 1, one original request S1, no context/amendment/slice/lineage and no open decisions. R1 cites S1 line 15; R2 cites line 23. Regression, clarity, experiment and authority constraints remain in the draft and imported records.

- Source bundle: `e332914e1408cb65dd7596f5e47f729def4d8b4665abec01f5f59fce0f19c5d0`.
- Contract: `d03db622308869e6bd6010d8ddf97d95fa1e0f3680ff710d9e3668c604a6987b`.
- Export completion manifest: `9e40d693ca7a815eb82166d9ea73dccdfbd19714a90e4e6bf78723c3af3c7cce`.

The actual `export/` contains `contract.json`, `source-manifest.json`, `source-S1.txt` and the producer-written `export-manifest.json`. Structural checks succeeded, but authority is **unapproved**, status **DRAFT / STRUCTURALLY_VALID**, with no adoption or audit records. It is not independent human approval, semantic validation or a completeness certificate. The initial plan's native-host evidence gap is retained unchanged; exact Codex version was subsequently observed, but its sandbox failed.

## Selected checks and actual results

| Requirement | Implementation | Selected test | Actual evidence |
| --- | --- | --- | --- |
| R1 (S1:15) | Prints usage, options/defaults and Node requirement; returns before loading the engine. | `node --test --test-name-pattern=^R1 test/audit-cli.test.mjs` | Ordinary check passed. R1-only and both-linked native records: **CHECK UNAVAILABLE**. |
| R2 (S1:23) | Rejects `xml`, names Markdown/JSON on stderr, exits 2 before loading the engine. | `node --test --test-name-pattern=^R2 test/audit-cli.test.mjs` | Ordinary check passed. R1-only record: **NOT DEMONSTRATED**; both-linked record: **CHECK UNAVAILABLE**. |

The exact executable in the selected arrays is `/opt/homebrew/Cellar/node/26.12.0/bin/node`. See `checks-r1.json`, `checks-both.json`, `links-r1.json` and `links-both.json` in the archive for complete argv and zero-based indexes. Each independently selected test invokes the real `audit.mjs`, observes exit/stdout/stderr, refuses engine loading, checks unchanged target contents, and also exercises a nonexistent target. Both failed before the implementation (`red-r1.json`, `red-r2.json`) and passed afterward (`final-green-r1.json`, `final-green-r2.json`). Unguarded CLI observations are retained separately (`final-observed-help.json`, `final-observed-invalid.json`).

Ordinary checks, all exit 0: `npm run format:check`, `npm run lint` (including TypeScript), `npm test` (**67/67 passed on Node 26.12.0**), the full suite on **Node 22.16.0 (67/67 passed)**, `npm run release:check`, and read-only Markdown/JSON self-audits (**13 PASS** each). Existing tests cover advisory warnings, target-code nonexecution, unchanged targets and copied installation. The release check executes only a read-only remediation preview. These are ordinary checks, not native Proofline evidence.

## Native attempt 1: R1 selected and linked

The actual pinned [Proofline `8e117fff4de2459637fe7f74f47ab17fc3341d84`](https://github.com/grove/proofline/tree/8e117fff4de2459637fe7f74f47ab17fc3341d84) received the genuine export using `--intentline-export`, exact `--source export/source-S1.txt`, `--checks checks-r1.json` and `--intentline-links links-r1.json`. `final-proofline-r1-invocation.json` retains the complete invocation (120-second cumulative budget, 30-second check budget).

`final-native-r1/report.json` and `evidence.json` record **EXECUTION UNAVAILABLE**, process exit 2. The exact version probe observed `codex-cli 0.162.1`; the native sandbox probe exited **71** with `sandbox-exec: sandbox_apply: Operation not permitted`. Boundary assessment: **NOT VERIFIED**, network control unavailable. No selected product command executed. R1 is **CHECK UNAVAILABLE**; unlinked R2 is **NOT DEMONSTRATED**. `final-proofline-r1-status.json` retains actual status readback.

## Native attempt 2: both selected and linked

The same frozen implementation and export were supplied with `checks-both.json` and `links-both.json`. Full invocation is in `final-proofline-both-invocation.json`; raw report/evidence and preflight receipts are under `final-native-both/`.

Result: **EXECUTION UNAVAILABLE**, process exit 2, exact Codex version observed, native probe exit **71**, boundary **NOT VERIFIED**. Each requirement separately reports **CHECK UNAVAILABLE**. No product-check exit statuses exist because preflight stopped execution. `final-proofline-both-status.json` preserves status readback. Both records have zero model dispatches, zero product observations and `coverage_completeness: UNKNOWN`.

The host was macOS 26.6.2 / Darwin 25.6.0, arm64, Python 3.15.0 and Node 26.12.0. System Codex was 0.163.0; the required 0.162.1 was installed separately in the temporary task directory and selected via PATH. No tool source was patched, managed restriction disabled, failed sandbox bypassed or unprotected check substituted as native evidence.

## Genuine negative control

`links-invalid.json` deliberately associates R1 index 0 with the R2 argv while only R1 is selected. The actual CLI refused it with exit **1**, stderr `Intentline R check index/argv differs from the selected command`. See `final-proofline-negative-invocation.json`. No negative output directory or native report was created: refusal happened during import, before sandbox execution. This is a mapping refusal, not a failed product test. The good export, candidate and mappings were unchanged.

## Independent review and remaining gaps

See [the separately started review](independent-review.md). Its first review found an experimental type-stripping warning on supported Node 22.16/22.17. Actual Node 22.16 reproduced the failed R1 assertion and noisy help (`node22-red-r1.json`, `node22-observed-warning.json`). The compatibility child now disables `ExperimentalWarning`; neither the tests nor the caller environment globally suppress warnings. Both focused tests then passed on Node 22.16. The first candidate and its original native records are retained as historical evidence; final records use the later frozen candidate above. It uses a fresh agent context but shares the operator, provider and host; it is not independent human or maintainer approval.

Native execution remains blocked. A qualified host must run fresh records against the same implementation/export, first selecting R1 and then both exact commands. Do not rewrite these historical unavailable records as passes. Even successful future checks leave overall requirement coverage **UNKNOWN**.

Not verified: native product behavior or other platforms, a new live external-repository validation run, remote release schemas/tag ancestry/assets/publication, maintainer approval, merge or deployment. No Foundryline tracker writes were made. Its maintainers must evaluate this blocked pilot before changing #18/#21.
