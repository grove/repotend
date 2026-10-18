What this change does: Adds beginner-friendly audit help and a useful unsupported-format error before the audit engine loads. Separate entrypoint tests check stdout, stderr, exit status, engine-loading prevention and unchanged target fixtures.

**No unresolved product findings.** The initial review found a P2 compatibility defect: Node 22.16 emitted an experimental type-stripping warning during help. Actual Node 22.16 execution reproduced it (`node22-red-r1.json`, `node22-observed-warning.json`). The final change suppresses `ExperimentalWarning` only in the compatibility entrypoint's typed child process; the test harness remains unchanged. Both focused tests and all 67 tests now pass on Node 22.16 and Node 26.12.

Reviewed implementation: commit `ead77fde6a5a7ba33e54cc81deb76fced8dbc333`, tree `544421686de4112ca1ac8bfb118cde750821e3ef`.

| Original source | Implementation | Exact selected argv and ordinary evidence | Final native R1-only | Final native both |
|---|---|---|---|---|
| **R1**, S1 line 15: useful help, exit 0, empty stderr, no audit | `cli.ts:9–20`, compatibility child flag; `audit-cli.test.mjs:39` | `["/opt/homebrew/Cellar/node/26.12.0/bin/node","--test","--test-name-pattern=^R1","test/audit-cli.test.mjs"]`; `final-green-r1.json`, `node22-green-r1.json`, unguarded `final-observed-help.json` and `node22-help.json` | **CHECK UNAVAILABLE**; index 0 not executed | **CHECK UNAVAILABLE**; index 0 not executed |
| **R2**, S1 line 23: reject xml, actionable stderr, exit 2, empty stdout, no audit | `cli.ts:22–27`; `audit-cli.test.mjs:55` | `["/opt/homebrew/Cellar/node/26.12.0/bin/node","--test","--test-name-pattern=^R2","test/audit-cli.test.mjs"]`; `final-green-r2.json`, `node22-green-r2.json`, unguarded `final-observed-invalid.json` and `node22-invalid.json` | **NOT DEMONSTRATED**; unlinked | **CHECK UNAVAILABLE**; index 1 not executed |

Evidence review:

- Original issue JSON body, frozen source and exported S1 match exactly. All export hashes and requirement, constraint and exclusion citations validate. The real export remains an **unapproved advisory draft**.
- Final native reports use snapshot commit `9d1060391fffd0466688b628ed605406613814eb`, with the exact implementation tree above. I verified both evidence hashes, all 60 copied product files against the implementation commit, unchanged export bytes and exact selected argv mappings.
- Both final attempts report **EXECUTION UNAVAILABLE**. Codex version receipts show **0.162.1**; sandbox preflight exits **71** with `sandbox_apply: Operation not permitted`. There are no executed product checks or observations, and `snapshot_sha256` is null. **Coverage completeness remains UNKNOWN.**
- The final mismatched-map negative genuinely refuses with exit 1: `Intentline R check index/argv differs from the selected command`. This is refusal evidence, not a product failure.
- Final formatting, lint and release checks pass. `final-tests.json` and `node22-tests.json` each report **67 passed, 0 failed**. Existing tests cover valid JSON audits, advisory WARN exit semantics and unchanged engine behavior.

Verdict: Ship the product fix for ordinary review. The broader native Deliver qualification remains incomplete; this review supplies no merge or publication authorization.

Not checked: successful native isolation, every supported Node version, remote CI or publication. This separately started reviewer shares the operator, provider and environment; it is not independent human approval.
