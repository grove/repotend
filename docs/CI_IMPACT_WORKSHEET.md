# Manual GitHub Actions impact worksheet

Copy the **blank worksheet** below for a single opt-in repo/workflow/finding. Write **UNKNOWN** for any unsourced value, not zero. Enter all times in UTC and minutes with clear units. Counts and timestamps must link to **original run/job/event evidence**, not only to RepoTend's static WARN or an estimate. For the collection method and approval requirements, see [the manual evaluation protocol](CI_IMPACT_EVALUATION.md).

## Blank worksheet (copy and fill)

| Study identity / permission boundary | Value |
| --- | --- |
| Study state and observation date | UNKNOWN |
| Willing repository and maintainer opt-in (record/link) | UNKNOWN |
| Workflow path, intended branch and original committed SHA | UNKNOWN |
| RepoTend rule ID, status, evidence location, audit revision | UNKNOWN |
| Candidate problem, independently confirmed or rejected | UNKNOWN |
| Separate workflow edit approval / reviewer / PR link | UNKNOWN |
| Proposed diff SHA; **deployed** workflow commit SHA and activation evidence | UNKNOWN |
| Baseline UTC window [start, end); after UTC window [start, end) | UNKNOWN |
| Changeover gap, runner type(s), required PR base branch | UNKNOWN |
| Original run/job/event sources, retrieval UTC date, export location | UNKNOWN |
| Read-only Actions access and billing access (independent) | UNKNOWN |
| Eligible event/episode definition and included/excluded event types | UNKNOWN |

List each applicable event episode from PR/push/other event history, **including those for which no workflow ran**. Link the event and the matching run(s) or explicitly state "no run found". Record missing, cancelled, skipped, manual, fork, deployment/release and re-run cases; do not merge unrelated event types into a favorable denominator.

| UTC period | Eligible change episodes / event mix (source) | Expected checks / missing events (source) | Applicable runs and attempts (run URLs) |
| --- | --- | --- | --- |
| Before | UNKNOWN | UNKNOWN | UNKNOWN |
| After | UNKNOWN | UNKNOWN | UNKNOWN |

Record one row per **observed run/attempt** and link to each original run and job view (expand this table as needed). The event-to-run association must be independently checked.

| Period + event/PR/commit | Run URL / attempt / deployed workflow revision | Status, cancellation and check outcome | Run / job timestamps UTC + source | Executed job-wall minutes (derived) | Billed usage source / value |
| --- | --- | --- | --- | --- | --- |
| Before — UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| After — UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

| Outcome and denominators | Before | After |
| --- | --- | --- |
| Eligible change episodes (and push/PR/other mix) | UNKNOWN | UNKNOWN |
| Applicable run count / attempt count | UNKNOWN | UNKNOWN |
| Runs per eligible episode, by comparable stratum | UNKNOWN | UNKNOWN |
| Executed runner-job minutes, all relevant attempts (not billed) | UNKNOWN | UNKNOWN |
| Runner-job minutes per eligible episode | UNKNOWN | UNKNOWN |
| Elapsed / event-to-required-check minutes; exact or proxy? | UNKNOWN | UNKNOWN |
| Actual billed minutes / charges (authorized source only) | UNKNOWN | UNKNOWN |
| Cancelled, skipped, missing, failed, fork and rerun cases | UNKNOWN | UNKNOWN |
| Required-check settings and actual PR reporting behavior | UNKNOWN | UNKNOWN |
| Reviewer/investigation/implementation/verification time (minutes) | UNKNOWN | UNKNOWN |

**Comparison and decision:** UNKNOWN. Record both denominators, sample sizes, event-type distribution and source links before computing absolute/per-event differences. Record confounders (activity mix, runner/matrix/caching changes, branch rules, queues, reruns, releases or coincident commits) and whether they invalidate comparison. If required check behavior is unverified, the outcome cannot claim an unqualified improvement.

**Risks/trade-offs:** UNKNOWN. In particular: was a push run intentionally needed on non-PR branches, did a filter strand a required check, or was security/release/deployment coverage lost? What extra review or maintenance effort was incurred?

**Decision category:** insufficient data / benefit observed (bounded) / no demonstrated benefit / regression or trade-off (choose only after review). Name the independent reviewer, decision date, and source evidence; no generic score or projection.

## Recorded outcome for issue #28 — 2026-10-20

This section records the **unavailable/insufficient-data path** for [issue #28](https://github.com/grove/repotend/issues/28), **not** a completed trial or a claim about RepoTend's own CI costs.

| Evidence gate / metric | Recorded outcome |
| --- | --- |
| Evaluated rule | Candidate class: `ci.duplicate-triggers` (example only; no target finding approved) |
| Willing repo and baseline pinned workflow revision | UNKNOWN — no consenting pilot/target revision supplied for this documentation change |
| Separately reviewed and approved workflow modification | None for this evaluation; no workflow change made |
| Deployed after revision and rollout timestamp | UNKNOWN — no after revision approved or deployed |
| Before / after UTC observation windows | UNKNOWN — no study windows or representative cohorts selected |
| Original Actions run/job/event datasets | Unavailable for a before/after comparison; no study datasets collected |
| Before / after run counts and eligible-event denominators | UNKNOWN / UNKNOWN |
| Before / after elapsed and executed runner-job minutes | UNKNOWN / UNKNOWN |
| Before / after billed minutes and monetary charges | UNKNOWN / UNKNOWN |
| Required-check configuration and post-change behavior | UNKNOWN — not verified in this pilot |
| Actual reviewer time / trade-offs | UNKNOWN — no pilot review measured |
| Benefit, causality and money saved | UNKNOWN — no quantitative or safety claim supported |
| Decision | **INSUFFICIENT DATA — no verified impact conclusion** |

This is an **explicit non-result**: the study was not started, not a zero-run observation, and not evidence that a workflow optimization is safe. To progress to a measured pilot, obtain a willing maintainer, pin the baseline and windows, collect original run/job/event data, seek **independent approval for a specific change**, then collect equivalent post-change data and verify required checks. Keep this record unchanged as historical context rather than backfilling invented numbers.
