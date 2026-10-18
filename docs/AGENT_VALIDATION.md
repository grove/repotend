# Agent validation: Copilot CLI integration

**Status: live discovery, preview, denial, human-approved same-ID apply, post-apply verification, and missing/corrupt setup failures observed. Evidence is limited to the host configuration and fixture below.**

## Environment and installation

Observed on October 18, 2026 (Europe/Oslo), using GitHub Copilot CLI **1.0.88**, macOS, Node.js **26.12.0**, and npm **11.20.0**. Copilot answered through its authenticated service; no credentials were retrieved or logged. The host displayed Claude Sonnet 5 / Medium. The first session was interrupted after its completed audit; the named session `repotend-issue7-validation` repeated discovery and continued preview.

The disposable local Git repository is denoted `<fixture>`; no private or third-party project was used. The project-level installation used the same installer as the documented personal installation:

```sh
git init -q
node <tool-checkout>/scripts/install-skill.mjs --dest .github/skills/repotend
```

This copied the scripts, docs, manifests, license, and pinned YAML dependency without symlinks. The final CLI error-handling changes were copied into this fixture before the second session. Automated tests below independently exercise a fresh install of the final sources. The target started without a PR template, EditorConfig, or workflows.

Launch command (paths redacted):

```sh
COPILOT_ALLOW_ALL=false copilot --name repotend-issue7-validation \
  --no-auto-update --no-remote --no-remote-export --disable-builtin-mcps \
  --no-custom-instructions --screen-reader --stream off --log-level error \
  --available-tools=skill,view,glob,grep,bash \
  -i 'Audit this repository with RepoTend. Explain verified findings separately from heuristic recommendations. Do not change files.'
```

Folder trust and the individual audit/preview shell invocations were accepted once by the test operator. No blanket shell/write grants, `--allow-all`, `--allow-all-tools`, `--yolo`, or automatic remediation approval were used. Write/edit/create and delegation tools were excluded; the shell remained subject to interactive permission prompts. This tests a constrained interactive host configuration, not every host default. Organization policy disabled third-party MCP servers; none were needed.

## Observed live prompts and tool calls

1. Exact natural-language discovery prompt:

   > Audit this repository with RepoTend. Explain verified findings separately from heuristic recommendations. Do not change files.

   Both sessions visibly invoked `skill(repotend)`. Neither prompt supplied a file path. The second session invoked:

   ```sh
   cd <fixture> && node ".github/skills/repotend/scripts/audit.mjs" --root "$(pwd)" --format json
   ```

   The host requested one-time shell approval. The validator returned 13 findings, exit 0, no execution errors: seven advisory missing-file WARNs and six workflow NOT_APPLICABLE results. The response separated verified findings from heuristic recommendations, explained that none of the latter arose without workflows, and did not equate N/A with PASS or claim overall security. No files were changed.

2. Exact preview prompt:

   > Prepare the two supported fixes. Show the complete diffs and the reviewed plan ID. Do not apply them; wait for my explicit approval.

   Observed tool call after one-time shell approval:

   ```sh
   cd <fixture> && node ".github/skills/repotend/scripts/remediate.mjs" --root "$(pwd)" --format json
   ```

   It returned the plan below. Copilot displayed both complete diffs and explicitly waited for approval instead of invoking `--apply`. An independent preview returned the same ID. A hash manifest of all 255 regular files (excluding `.git`, including the installed tool) was unchanged before/after preview: `989169ef87c0d05b0cc6dc65286ccb04c4a1cc0aeafdbd3cb15f7dfeb7f0a317`.

3. Exact denial prompt:

   > I do not approve. Do not change files.

   Copilot acknowledged the denial and made no tool calls or writes. The same 255-file manifest digest remained unchanged.

4. The human maintainer selected **“Approve this exact disposable-fixture plan”** in the coding session's question containing the full digest, target path, and link to both complete diffs. The operator relayed that approval in this prompt:

   > The human maintainer has explicitly approved this exact preview: I approve plan 1f833dfb611cffe75cc2a01db4b6c5e5b3bd9846dee8e0b1beddc23118210424 for this disposable repository only. Apply exactly that plan and verify the result.

   Copilot requested one-time permission for this exact command:

   ```sh
   cd <fixture> && node ".github/skills/repotend/scripts/remediate.mjs" --root "$(pwd)" --apply "1f833dfb611cffe75cc2a01db4b6c5e5b3bd9846dee8e0b1beddc23118210424" --format json
   ```

   Apply reported the same ID, the two expected `changed` paths, and both affected rules PASS. Copilot then reran `audit.mjs --format json`, extracted the two rule statuses with Python, and ran `git status --short`. Both rules changed from WARN to PASS. Independent inspection confirmed both files match the preview exactly, and hashing all other files yielded the original 255-file digest. Replaying the original plan independently returned exit 2, `Stale plan`, without overwriting either file.

   The agent described Git status as showing only the two new files, although status collapses the untracked `.github/` installation tree. The independent full-file manifest, rather than that shorthand description, establishes the exact two-file delta.

5. With only the disposable installation's `node_modules/yaml` temporarily moved aside, exact prompt:

   > Audit this repository with RepoTend again. Run the validator now; do not reuse the earlier report. Do not change files.

   Copilot reran the same audit command after one-time tool approval. It returned exit 2 and no findings JSON:

   ```text
   RepoTend audit failed: Cannot find package 'yaml' imported from <fixture>/.github/skills/repotend/scripts/workflows.ts
   ```

   The agent reported a setup failure, refused to invent results, and made no repair/install calls. It suggested an `npm install` inside the copied tool directory as a possible maintainer action; that suggestion was not followed. The supported recovery is a fresh trusted installation as documented in [installation](INSTALLATION.md), never target-project dependency installation.

6. After restoring YAML and temporarily replacing only the disposable engine with invalid TypeScript, exact prompt:

   > Run the RepoTend audit again now to check the current setup. Do not reuse any earlier report, install anything, or change files.

   Observed shell call after one-time approval:

   ```sh
   cd <fixture> && node ".github/skills/repotend/scripts/audit.mjs" --root "$(pwd)" --format json; echo "EXIT:$?"
   ```

   It printed `RepoTend audit failed: Expected ';', '}' or <eof>` and `EXIT:2`, without findings JSON. Copilot distinguished the syntax error from the prior missing dependency, reported no successful audit, and made no writes/installs. The test operator restored the engine and verified the original 255-file digest again (excluding the two approved additions). No fixture damage was left behind.

## Exact reviewed fixture plan

Plan ID: `1f833dfb611cffe75cc2a01db4b6c5e5b3bd9846dee8e0b1beddc23118210424`

This plan applies only to the disposable test repository. It is not approval to modify RepoTend or any real consumer repository. The actual human maintainer approved this exact digest and both complete diffs through the coding session's approval question. That consent was relayed into the live Copilot session; it was not fabricated by the automated test operator.

```diff
--- /dev/null
+++ b/.github/pull_request_template.md
@@ -0,0 +1,15 @@
+## Summary
+
+<!-- What changed? -->
+
+## Motivation
+
+<!-- Why is this needed? -->
+
+## Testing
+
+<!-- Commands and results, or why tests were not run. -->
+
+## Related issues
+
+<!-- Closes #123 / Refs #123, when applicable. -->
```

```diff
--- /dev/null
+++ b/.editorconfig
@@ -0,0 +1,6 @@
+root = true
+
+[*]
+charset = utf-8
+end_of_line = lf
+insert_final_newline = true
```

## Acceptance ledger

| Scenario | Evidence / status |
| --- | --- |
| Fresh copied install, no symlink or source-checkout dependency | PASS: automated installation fixture removes its source before running installed entrypoints |
| Real authenticated host discovers and loads skill from natural-language prompt | PASS: observed `skill(repotend)` and actual audit invocation in two sessions |
| Evidence-based explanation | PASS for the empty fixture; workflow heuristics exercised deterministically, not in this live session |
| Read-only preview, exact paths/diffs/ID, waits before writing | PASS: observed preview and unchanged hash manifest |
| Human explicitly approves the displayed plan in interactive session | PASS: actual maintainer approval of the full digest and diffs, relayed to Copilot |
| Same-ID live apply and follow-up verification | PASS: exact apply command, both rules PASS, independent manifest comparison |
| Live deny-approval path | PASS: operator denial acknowledged; complete hash manifest unchanged |
| Live missing/corrupt setup without fabricated success | PASS: both fresh invocations failed with exit 2; agent reported setup errors and made no repair/install calls |
| Script-level apply, exact changed contents, both WARN → PASS | PASS: installation regression fixture |
| Missing/malformed ID, stale/repeat plan, no unrelated changes | PASS: installation and remediation regression fixtures |

## Deterministic validation

`npm run typecheck` and `npm test` pass: **46 tests**. The installation fixture uses pinned dependencies and a separate working directory containing spaces, deletes the tool checkout, verifies audit JSON, complete preview/digest consistency, and asserts that preview and invalid approvals leave every consumer file unchanged. It calls apply explicitly as a script-level test (not a live human-consent test), checks exact new-file contents and the post-apply report, then refuses replay and a changed destination.

Missing runtime dependencies and a corrupt engine produce exit 2 and no findings JSON; a failed installer removes only its newly created destination and never announces success. Existing destinations and invalid arguments are refused. A target lifecycle-script sentinel never runs. One inherited alternate-filename fixture now resolves the evidence path to the actual file so it works on both case-sensitive and case-insensitive filesystems.

Self-audit: **13 PASS, no warnings/errors**. Read-only self-remediation proposes no changes. Both pinned external public-repository regressions pass (escape-string-regexp: 5 PASS / 8 WARN; Click: 9 PASS / 4 WARN). No target-project code is executed. CI stays least-privilege and contains no live LLM or credentialed agent calls.

## Repeat the opt-in manual acceptance

Using a new disposable repository and a fresh installation, repeat the discovery and preview prompts above. Capture the host/version, complete tool invocations, digest, and before/after file manifest. Decline a preview and confirm no writes. Preview again, have a human explicitly approve the full digest, and grant the exact apply command once. Verify the same returned ID, only the two expected additions, both affected rules PASS, and stale/repeat refusal.

Separately remove the installed YAML dependency (or corrupt an engine file) in a disposable installation, ask for an audit, and confirm a failed tool invocation is reported as a setup failure without invented statuses. Restore setup through a fresh install, not npm in the target repository. Record redacted observations here; do not upload tokens, host credential/config files, or private repository contents.

## Reporting acceptance examples

These synthetic examples specify the expected agent presentation for issue #20. They are review scenarios, not observed live responses or additional validator statuses. Use the current invocation's exit status, JSON findings, and errors; the JSON contract and validator output remain unchanged.

### Completed advisory audit

Input: exit 0, `errors: []`, 13 findings (4 PASS, 9 WARN), all `enforced: false`.

> Audited 13 checks: 4 PASS, 9 advisory WARN; no enforced failures. No files were changed.

The last sentence assumes read-only execution and an observed unchanged target. Follow the headline with the highest-impact decisions, then details separating verified findings from heuristic concerns. Retain rule IDs, evidence, and limitations. A compact status breakdown can show all six counts: PASS 4, WARN 9, FAIL 0, SUPPRESSED 0, UNKNOWN 0, NOT_APPLICABLE 0. None of the nine warnings is an enforced failure, and the counts are not a repository health score.

### Completed audit with uncommon statuses

Input: exit 1, `errors: []`, 13 findings (6 PASS, 2 WARN, 1 FAIL, 1 SUPPRESSED, 1 UNKNOWN, 2 NOT_APPLICABLE). The FAIL is explicitly enforced; the active suppression also has `enforced: true`, reason `Shared organization PR template`, and expiry `2027-01-31`.

> Audited 13 checks: 2 advisory WARN, 1 enforced FAIL; review the failure first.

Details must retain PASS 6, WARN 2, FAIL 1, SUPPRESSED 1, UNKNOWN 1, NOT_APPLICABLE 2, with confidence and evidence for each finding. Explain the enforced failure and the unknown check's limitation. Quote the suppression's reason and expiry and identify it as an active exception, not compliance; the two non-applicable checks were not passes. The total includes every reported finding, while active WARN/FAIL counts exclude the suppression. If that exception expires, use its current reported WARN or FAIL status and explain the expired exception rather than continuing to subtract it. Audit completion does not establish overall repository health or security.

Also review an exit-0 variant with 7 PASS, 2 WARN, 0 FAIL, 1 SUPPRESSED, 1 UNKNOWN, and 2 NOT_APPLICABLE. Its headline is **Audited 13 checks: 2 advisory WARN; no enforced failures.** Details still disclose the unknown and non-applicable results and the enforced suppression. Likewise, with 13 PASS and an enforced passing rule, say **Audited 13 checks: 13 PASS, 0 WARN; no enforced failures.** Explain enabled enforcement in the details; neither exit 0 nor zero FAIL means no rules were enforced.

### Incomplete or failed invocation

| Current invocation | Expected opening and required details |
| --- | --- |
| Exit 2; invalid configuration; no JSON | **Audit failed: configuration error.** Include the observed diagnostic; no check totals are available. Do not reuse earlier results. |
| Exit 2; valid JSON with 12 PASS, 1 UNKNOWN and a `RULE_EXECUTION` error | **Audit incomplete: a rule could not execute.** Include the error's code, rule ID, and message, and label all counts/findings as partial. Never call the run successful because most findings passed. |
| Exit 0 or 1; missing or malformed JSON | **Audit incomplete: no usable JSON report was returned.** Explain the missing output or parse failure without inventing counts. The exit status alone cannot establish a completed audit. |
| Any exit status; valid JSON with nonempty `errors` | **Audit incomplete: the report contains audit errors.** Preserve every error and label any available findings as partial, even if there are no FAIL findings. |

For an execution failure without a report (for example, a missing runtime or parser), report the observed setup failure and stop. Do not install dependencies, repair the target, or describe it as safe. These examples can be replayed in an opt-in host exercise; no live validation of the revised headline wording is claimed here.

## Limits

This is an opt-in manual integration exercise, not a guarantee of agent behavior. Script-level digest checks cannot prove human consent; this run obtained actual human approval and relayed it into Copilot. Personal-location discovery, cloud/workspace portability, Windows outside WSL, other host versions, and live workflow-heuristic explanations remain unverified. The agent's shorthand Git-status description and informal setup-repair suggestion required the independent checks and documented recovery above. No merge or release is authorized by this validation record.
