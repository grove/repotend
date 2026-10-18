# Optional GitHub required-check context (experimental)

The normal audit stays offline: no credentials, GitHub connection, API scopes, or network calls are required. Its thirteen findings and v0.1 JSON contract are unchanged. After that audit, a maintainer can explicitly opt in to a **separate, read-only** settings inspection for `ci.path-filter-safety`.

Use Node.js 22.16+ and an already available, authorized GitHub CLI (`gh`) connection. From a source checkout:

```sh
node skills/repotend/scripts/audit.mjs --root "/path/to/project" --format json
node skills/repotend/scripts/verify-github.mjs \
  --root "/path/to/project" --repo OWNER/REPO --branch main --allow-remote
```

For a copied skill, use its absolute `scripts/verify-github.mjs` path. Select the actual GitHub.com repository and PR base branch explicitly; neither is guessed from local Git configuration. The caller must establish that the selected local workflows belong to that repository. Local edits may differ from the remote branch; this tool does not download or verify workflow revisions. Without `--allow-remote`, the command emits **not verified** context without invoking `gh` or accessing credentials. Missing `gh` or authentication also yields **not verified**. Do not install a connection or request broader permissions automatically.

Output is experimental JSON with `mode: "github-context"`, separate from the stable v0.1 audit/remediation schemas. It includes the repository, branch, UTC start/completion timestamps, inspected endpoints, policy results, required contexts and app IDs, ruleset inventory, local parsing problems, comparisons, and limitations. Exit 0 means context was emitted, **not** that verification succeeded: inspect `status`, `requiredCheckConfigurationComplete`, each policy, and `localProblems`. Exit 2 means invalid arguments or a local execution error. There is no apply, file-writing, workflow-editing, or settings-editing mode.

## What is inspected

Only fixed REST GET requests to `github.com` are made through `gh api`. Paginated endpoints are fully collected; failed/partial responses are not used as complete evidence. Requests contain the selected repository and branch, not local workflow content.

| Source | Interpretation |
| --- | --- |
| `repos/OWNER/REPO/rules/branches/BRANCH` | GitHub resolves branch targeting and returns active applicable rules, including rules from higher levels. Disabled and evaluate-mode rules are excluded. Required status-check contexts retain their ruleset IDs and integration IDs. |
| `repos/OWNER/REPO/branches/BRANCH/protection` | Classic protection is inspected separately. A successful response with absent/null `required_status_checks` establishes no classic required contexts at that observation. Context names and app constraints are retained when configured. |
| `repos/OWNER/REPO/rulesets?includes_parents=true` | Repository-wide inventory identifies visible rulesets and enforcement modes. An entry is **not** proof it targets the selected branch. A disabled/evaluate ruleset imposes no requirement, and says nothing about classic protection. |

GitHub documents Metadata read permission for [branch rules and ruleset inventory](https://docs.github.com/en/rest/repos/rules#get-rules-for-a-branch) and Administration read permission for [classic branch protection](https://docs.github.com/en/rest/branches/branch-protection#get-branch-protection). Public visibility of rulesets does not grant a GitHub App access to classic protection. Token type, repository access, account plan, API availability, and organization policy may limit access. No token is read from the credential store or printed by RepoTend; `gh` handles its existing authentication.

HTTP 401/403, ambiguous 404, rate limits, unsupported required-workflow rules, malformed responses, timeouts, and response-size limits leave that source **inaccessible/unknown**. A 404 is never treated as proof of no protection. The effective required-check configuration is complete only when both the branch-rules and classic-protection inspections succeed. An inaccessible inventory is also reported, even if required contexts were readable. Readable sources cannot fill in inaccessible ones.

## How to interpret comparisons

The local YAML reader supplies jobs from workflows with event-level `paths` or `paths-ignore` filters on push/PR events. For simple jobs the context is the exact static `name`, or job ID when no name is set. No substring or workflow-name guessing is used. Matrix jobs, expression names, and reusable-workflow calls remain unresolved. Event branch/tag filters, check producers, actual runs, and bypass actors are not evaluated.

**Remote-verified** means an API observation or exact check-name comparison was established, not a verified defect or guaranteed merge blockage. App IDs are retained without asserting which app produces the local job. A same-named check may originate elsewhere. A comparison can have a verified positive match while the overall configuration remains incomplete. If no match is found and any required policy source is inaccessible, the conclusion stays unknown.

| Scenario | Expected context and next decision |
| --- | --- |
| Applicable active rules require `Tests`; a path-filtered simple job is named `Tests` | `required-check-name-matches-filtered-job`, remote-verified name match. Confirm the producer, trigger applicability, and reporting behavior before changing filters. |
| Both policy sources succeed; neither requires the filtered job's known name | `no-matching-required-check`, remote-verified comparison. Intentional filtering may need no change; keep the local WARN visible. |
| Inventory shows a disabled `main` ruleset | Record it as disabled, not an active requirement. Inspect applicable active rules and classic protection independently. |
| Disabled ruleset and classic protection returns HTTP 403 | Overall inaccessible/unknown; no conclusion that required checks are absent. Preserve the heuristic warning and permission uncertainty. |
| No opt-in, no `gh`, or no authenticated connection | Not verified. Keep the local audit and its warning; no remote conclusion is available. |
| Matrix/dynamic/reusable job name, malformed local workflow, or incomplete remote response | Keep the unresolved comparison/local problem explicit. Do not describe this as a clean workflow assessment. |

Never rewrite local WARN, SUPPRESSED, or UNKNOWN into PASS using this context. Accepting intentional filtering is a maintainer decision, not a new report status. This inspection neither certifies security nor proves every actor is subject to these policies. Settings may change during or after the observation window.

## Validation

`test/github.test.mjs` uses injected responses and a disposable fake `gh` executable. It covers active/disabled rulesets, exact branch targeting requests, required and unmatched names, classic contexts/app IDs, permission and endpoint failures, pagination, malformed responses, unresolved names, no connection, and the no-network default. The copied-skill test exercises the separate entrypoint without dependencies or opt-in. Tests do not mutate live GitHub settings or execute target-project code.
