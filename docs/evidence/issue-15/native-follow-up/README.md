# Issue 15: native Proofline follow-up

**Behavioral verification: EXECUTION UNAVAILABLE.** The GitHub-hosted macOS native boundary passed its canaries, but Node exited during startup before either selected test produced TAP output or ran its assertions. The actual Proofline reports say **CHECKS FAILED**; their command failures are runtime diagnostics, not demonstrated RepoTend defects. No selected behavior is claimed to pass. `coverage_completeness: UNKNOWN` remains unchanged.

- Completed observation [Actions run 39122062389](https://github.com/grove/repotend/actions/runs/39122062389), attempt 1, 2026-10-18. The green Actions job means the experiment collected its expected records, including failed commands; it does not mean `CHECKS PASSED`.
- [Immutable workflow revision `050962029e6b980e305afe67be683b5d254542c2`](https://github.com/grove/repotend/blob/050962029e6b980e305afe67be683b5d254542c2/.github/workflows/issue-15-native.yml). The temporary push workflow is removed from the final branch.
- [Raw Actions artifact](https://github.com/grove/repotend/actions/runs/39122062389/artifacts/12133978699), retention seven days, expires **2026-10-25 11:09:31 UTC**. Its exact inner archive is also retained as [records.tar.gz](records.tar.gz), with a [SHA-256 manifest](manifest.json), so expiry does not discard this evidence.
- Separately started [independent review](independent-review.md). This follow-up changes evidence only; the merged CLI features are untouched.

## Frozen inputs and actual runner

Candidate: [`ead77fde6a5a7ba33e54cc81deb76fced8dbc333`](https://github.com/grove/repotend/commit/ead77fde6a5a7ba33e54cc81deb76fced8dbc333), tree **`544421686de4112ca1ac8bfb118cde750821e3ef`**. Both native records snapshot that tree as commit `9d1060391fffd0466688b628ed605406613814eb`; this local snapshot identity is distinct from the published candidate SHA. The source checkout was clean before and after the checks. Evidence documentation is outside that frozen tree.

The runner used `macos-15`, macOS **15.7.9 / 24G830**, arm64, Python **3.12.10**, Node **22.16.0**, Codex CLI **exactly 0.162.1**, and unmodified Proofline [`8e117fff4de2459637fe7f74f47ab17fc3341d84`](https://github.com/grove/proofline/tree/8e117fff4de2459637fe7f74f47ab17fc3341d84). GitHub permissions were `contents: read`; all checkouts disabled credential persistence. The native Codex optional-dependency Mach-O binary was selected using the [previous successful setup](https://github.com/grove/foundryline/blob/951bf4bf2f81c2ab1afdb347191b71bea4ede301/.github/workflows/deliver-native-probe.yml), without changing the Proofline sandbox. Its binary SHA-256 is `74c6a6d263f40d65f99c27a815275f5b4ed0bcc2baecc396b4cf3255498bdfc0`.

The original `../records.tar.gz` archive SHA-256, **`095e3cb9ee5ecd8de040fb9938fd3bc5fd811fe7f64a76d23b29ac1f715cbaa9`**, and every archived file were verified against `../manifest.json` **before extraction**. Extraction used a private directory outside the product checkout, rejected unsafe paths/nonregular files, and preserved the original acceptance/export bytes. No acceptance was regenerated or adopted.

| Original exported input | SHA-256, unchanged after both selections |
| --- | --- |
| `source-S1.txt` (complete issue body, 7,650 bytes) | `e1d61d83be03e8c442d05d1953bd2de47cd3a5a17a755c87d81826c56cb163f8` |
| `contract.json` | `d03db622308869e6bd6010d8ddf97d95fa1e0f3680ff710d9e3668c604a6987b` |
| `source-manifest.json` | `e332914e1408cb65dd7596f5e47f729def4d8b4665abec01f5f59fce0f19c5d0` |
| `export-manifest.json` | `9e40d693ca7a815eb82166d9ea73dccdfbd19714a90e4e6bf78723c3af3c7cce` |

The original Intentline advisory remains an **unapproved draft** with its original constraints, exclusions and host-qualification gap. Successful structural import supplies no human approval or completeness guarantee.

## Exact selected checks and observations

Fresh checks/maps used the actual resolved Node executable on this runner:

```json
[
  ["/Users/runner/hostedtoolcache/node/22.16.0/arm64/bin/node", "--test", "--test-name-pattern=^R1", "test/audit-cli.test.mjs"],
  ["/Users/runner/hostedtoolcache/node/22.16.0/arm64/bin/node", "--test", "--test-name-pattern=^R2", "test/audit-cli.test.mjs"]
]
```

R1-only selected the first array and linked R1 to index **0** with that complete argv; R2 was unlinked. R1+R2 selected both arrays and linked R1 to **0**, R2 to **1**, each with its complete argv. The archived historical Homebrew Node paths were not reused.

| Source requirement → existing implementation/test | R1-only actual record | R1+R2 actual record |
| --- | --- | --- |
| **R1**, S1:15: useful help, stdout/defaults/exit 0, no audit. `cli.ts:9`, `audit.mjs` compatibility child; `audit-cli.test.mjs:39`, exact `^R1` argv above. | Index 0: Node exit **1**, raw row **CHECK FAILED**, no behavioral assertions executed. | Index 0: Node exit **1**, raw row **CHECK FAILED**, no behavioral assertions executed. |
| **R2**, S1:23: invalid `xml`, supported formats on stderr, exit 2, no report/audit. `cli.ts:22`; `audit-cli.test.mjs:55`, exact `^R2` argv above. | **NOT DEMONSTRATED**, no selected/linked R2 command. | Index 1: Node exit **1**, raw row **CHECK FAILED**, no behavioral assertions executed. |

Both `proofline.py check` invocations exited **2**, with report status **CHECKS FAILED**, zero model dispatches and native boundary assessment **OBSERVED**. Canary writes to source/input/candidate/Git/receipts, private reads, mode changes and network access were denied; scratch writes were allowed and frozen inputs remained unchanged. This is bounded native process evidence, not broad sandbox qualification.

Each selected command's bounded receipt has empty stdout, no timeout/truncation, exit **1**, and this startup diagnostic:

```text
node: OpenSSL configuration error:
system library:BIO_new_file:Operation not permitted:
calling fopen(/System/Library/OpenSSL//openssl.cnf, rb)
```

The raw receipts preserve complete stderr including process-specific OpenSSL details. No test assertion failure or CLI behavior was observed. No sandbox permission, runtime configuration or product code was changed to get around this denial. Further native execution stopped after collecting the two requested selections.

The safe negative used a separate `invalid-map-links.json`: R1 index 0 deliberately contained the R2 argv while only the R1 command was selected. Actual refusal: exit **1**, `Intentline R check index/argv differs from the selected command`. No negative record directory was created; refusal occurred before native execution. The original export and good mappings remained unchanged.

## Raw record navigation and limits

The durable archive is byte-identical to the artifact's `raw-records.tar.gz`, SHA-256 **`c8de5c9895c6204234f5449eb5f4455fbb63d3b4b0b9568e4b18b4bedb22e692`**. It extracts beneath `records/`. The manifest maps paths relative to that directory and includes the runner-generated inventory itself. The complete runner inventory, evidence/report hashes and bounded receipt hashes were checked after download.

- `identity.json`, `macos.txt`, native Codex path/version/install logs: actual host, runtimes, workflow/run, candidate and input hashes.
- `original/export/`: original source, contract and completion manifests; `export-integrity-after.json`: unchanged final hashes. Historical local attempts are retained under `original/` as historical evidence.
- `{r1-only,r1-r2,invalid-map}-{checks,links,invocation,outcome}.json`: exact selected arrays, zero-based links, complete CLI invocations, cwd, elapsed time and exit statuses; matching `.stdout`/`.stderr` files.
- `{r1-only,r1-r2}-record/`: actual `report.json`, `evidence.json`, frozen candidate/input snapshots, native preflight/private canaries and `receipts/check-000.json` (plus `check-001.json` for R2). Matching `*-status*` files retain actual `status --show-source` readback.

The CLI invocations used the runner's absolute Python path, the pinned `tool/proofline.py check`, `--repo /Users/runner/work/repotend/repotend/source`, `--source /Users/runner/work/_temp/repotend-15-native/records/original/export/source-S1.txt`, `--intentline-export` pointing to that same export, fresh `--checks`/`--intentline-links`, **200 seconds** cumulative / **40 seconds** per check, and separate scenario output directories. Exact arrays are in the invocation files; relocated extraction does not recreate the runner or requalify its boundary.

Earlier workflow attempts are preserved by immutable Actions revisions: [39121916417](https://github.com/grove/repotend/actions/runs/39121916417) was rejected before jobs started (runner context placed at job scope); [39121953541](https://github.com/grove/repotend/actions/runs/39121953541) observed the same R1 runtime failure, then stopped on an overly strict pass-only workflow assertion. The final revision collects actual failed outcomes and both selections with identical sandbox permissions, runtime pins, candidate and export. No historical failure is rewritten as a pass.

The 67 ordinary tests from the merged implementation remain separate historical evidence. This follow-up establishes genuine native canary observations and safe map refusal, while **R1/R2 behavioral execution remains unavailable** on the unchanged boundary/runtime combination. Coverage completeness remains **UNKNOWN**; no complete product-correctness, maintainer approval, merge, deployment or Foundryline tracker action is implied.
