# Evaluate actual GitHub Actions impact (opt-in manual pilot)

RepoTend's `ci.duplicate-triggers`, `ci.concurrency`, and `ci.path-filter-safety` findings are **static, advisory observations**. A WARN is neither a verified redundant run nor evidence of CI time or money saved. This is a **manual evaluation protocol**, not a new RepoTend rule, collector, telemetry feature, or authorization to edit a workflow. See [workflow-rule limitations](WORKFLOW_CHECKS.md).

Use the [copyable worksheet and recorded insufficient-data outcome](CI_IMPACT_WORKSHEET.md). The worksheet is intentionally small enough for one finding in one willing repository. Do not create credentials, enable network access, schedule collection, or alter workflows to complete it.

## 1. Permission and revision gate (before collecting or editing)

Ask a maintainer to opt in to a **specific repository, workflow, branch, UTC observation windows, and read-only data sources**. Record who authorized access and whether the available connection can read Actions run/job history, applicable required checks, and (separately) billing data. A local-only audit needs no GitHub authentication; this optional study is different. Public run pages can be inspected without adding a token. For private information, use only access the maintainer already authorizes; if inaccessible, record **UNKNOWN**.

Pin the original workflow file path and **exact committed revision** at the start of the baseline; record its trigger configuration and the RepoTend rule ID/evidence. Distinguish these states:

- **Candidate finding:** a RepoTend WARN; the suspected redundancy has not been demonstrated.
- **Verified event history:** specific observed GitHub run IDs, events, attempts, job timestamps and outcomes, tied back to source event(s).
- **Proposed workflow revision:** a reviewed diff or PR; a proposed change is not a deployment.
- **Deployed workflow revision:** a separately approved, merged revision, with its commit SHA, effective branch and first applicable event. Record when it actually became active; a run's `head_sha` by itself does **not** prove which workflow definition GitHub used, especially for PR/merge contexts.

An **independent maintainer must review and approve any workflow or ruleset edit**. Do not take a RepoTend WARN as that approval. Check whether push and PR runs serve intentionally different purposes; leave release, deployment, security and required-gate paths intact unless separately justified. If there is no willing maintainer, approved change, or sufficient primary data, record an insufficient-data outcome rather than improvising a fix.

## 2. Preregister comparable observation windows

Before examining results, fix two UTC intervals of equal length (for example, two complete seven-day windows) and identify a changeover gap so rollout events are not attributed to the wrong workflow. Record the baseline SHA and deployed SHA, start/end UTC times, workflow path, branch filters, included event types, and excluded events. If several relevant workflow changes occur in a window, isolate them or declare the comparison inconclusive.

Define the **eligible change/event denominator from the repository's event history, not only from runs that happened**. For an overlap hypothesis, identify branch pushes, PR open/synchronize/reopen events, and which change episodes could legitimately trigger which workflows. Map matching push and PR events to commits/PRs while accounting for PR merge SHAs. Note missing runs, jobs skipped by filters, cancelled runs, manual dispatches, scheduled builds, reruns, forks and default-branch-only pushes separately. A lower run count is meaningless without a comparable number **and mix** of eligible events.

A useful primary comparison is **observed runs and executed runner-job minutes per comparable change episode**, stratified by push/PR event mix. Also record elapsed time until the relevant required checks finish, failures, cancellations, coverage and reviewer effort. Avoid treating two busy weeks with different PR volume, matrix sizes, caching, runner type, branch settings, or external service delays as a causal experiment.

## 3. Read original GitHub evidence (no collector)

With the maintainer's approval, open GitHub Actions run history for the chosen workflow, then inspect individual run and job pages and the corresponding events/commits/PRs. Save run/job IDs, source links, retrieval date/time, UTC timestamps, event type, `run_attempt`, workflow file/revision evidence, conclusion, cancellation status, and job runner labels in the worksheet or a maintained manual evidence export. Capture **every applicable attempt** (reruns consume work too) and paginate sufficiently for the entire window. Do not paste tokens or private run logs into a public document.

For maintainers who *already* use an authorized GitHub CLI session, optional **read-only** requests include:

~~~sh
# Replace OWNER/REPO, workflow filename, and UTC dates; no login/setup step is implied.
REPO=OWNER/REPO
WORKFLOW=ci.yml
FROM=2026-10-01
TO=2026-10-08
gh api --paginate --slurp "repos/$REPO/actions/workflows/$WORKFLOW/runs?created=$FROM..$TO&per_page=100" > runs-pages.json

# For an actual run ID and each observed attempt number:
RUN_ID=123456
ATTEMPT=1
gh api --paginate --slurp "repos/$REPO/actions/runs/$RUN_ID/attempts/$ATTEMPT/jobs?per_page=100" > jobs-pages.json
~~~

These are illustrative GET requests; set dates/windows **before** collecting and change output filenames for before/after. Verify pagination, permissions, API response completeness and any retention limits. The runs endpoint is not a complete list of possible trigger events: cross-check PR/commit/event history to identify events with no run. If the authorized CLI or data is unavailable, do not install/request credentials automatically.

For billing, prefer an **authorized GitHub billing/usage export** with enough granularity to identify the studied runner usage and window. Billing data and price depend on runner/account/repository arrangements; **job-wall minutes are not billed minutes**. GitHub's per-run usage/timing endpoint is being retired, so this protocol does not depend on it. If no authoritative billed-minutes or amount source is available, record **UNKNOWN**, even when job timestamps are known. Standard GitHub-hosted runners on public repositories may have no Actions minute charge; do not turn saved elapsed time into hypothetical cash savings. See [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

## 4. Calculate only sourced, reproducible measurements

- **Runs:** count applicable, linked workflow runs (with attempts reported separately); report numerator and eligible events/change episodes by type, not just raw counts.
- **Executed runner-job minutes:** for each job with credible `started_at` and `completed_at`, sum (completed minus started) / 60 across jobs, **including parallel jobs and rerun attempts**. This is an observed job-wall-time proxy, *not* a billing invoice, and must be labeled as such. Jobs without trustworthy timestamps or runner identification have UNKNOWN minutes; avoid treating skipped jobs as having run.
- **Latency:** use actual run/required-check timing where available. If estimating event-to-required-check completion using GitHub event/run creation plus the final relevant job completion, label it a **proxy**, document that queuing and other checks may affect it, and keep unverified end times UNKNOWN. Do not treat `updated_at` as proof of a workflow's exact finish time.
- **Actual billed usage:** transcribe only authorized, relevant billing-source values, with units, source and any rounding/allocation limits. Otherwise UNKNOWN.
- **Reviewer time and trade-offs:** log actual human minutes spent investigating, editing, reviewing and validating; note extra workflow complexity, maintenance burden and any additional failures/cancellations.

Calculate before/after *per eligible event or change episode* for comparable strata, then report absolute and relative differences only if both periods are complete. State sample sizes, missing evidence and likely confounders. A positive difference is an **observation for this specific repository/window**, not a general savings forecast or guaranteed causal benefit.

## 5. Required-check and safety gate

Before and after the separately approved change, inspect branch protection and applicable rulesets/check producers for the **actual PR base branch** (see [optional GitHub required-check context](GITHUB_VERIFICATION.md)). Record which check names are required, whether each still reports on comparable PRs, and whether merges, branch pushes, release/deploy paths and fork PRs retain necessary coverage. Explicitly verify no required check is left permanently pending because a workflow was filtered out, and that skipped/cancelled work is not falsely counted as successful coverage.

If settings cannot be read, checks are dynamic/matrix-based, or required-check names/producers are ambiguous, report UNKNOWN and **do not claim safety**. Check behavior after the revision under real events; a passing local YAML check alone is insufficient. Never optimize by silently removing an intentionally required workflow.

## 6. Close the manual study with a bounded decision

Complete the worksheet's primary-source links, before/after counts, observed elapsed/runner minutes, actual billing data when available, required-check results, uncertainty, reviewer time, and approval trail. Choose one decision: **benefit observed (bounded)**, **no demonstrated benefit**, **regression/trade-off**, or **insufficient data**. Explain what was and was not measured; do not produce a generic CI score, security guarantee, extrapolated annual savings, or an unqualified "saved X minutes" claim.

The [included example](CI_IMPACT_WORKSHEET.md#recorded-outcome-for-issue-28--2026-10-20) deliberately records **insufficient data**, because this documentation change has no separately approved deployment and no before/after primary Actions dataset. That is a reportable outcome, **not** evidence the proposed optimization succeeded or failed.
