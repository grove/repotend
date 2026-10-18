# Understanding your RepoTend report

**Got a warning? That doesn't necessarily mean anything is wrong.**

RepoTend is looking for everyday repository-maintenance details. It can tell you that a file is missing or that a workflow *might* be doing extra work. It can't tell you whether every choice makes sense for your particular project.

The report is there to help you decide what matters — not give you more chores.

## Reading a finding

The report has a table with a **status**, a **rule name**, and a short **observation**.

Imagine you see something like this (a simplified example):

| Status | Rule | Observation |
| --- | --- | --- |
| WARN | `repo.pr-template` | No pull request template found |

Before acting on it, ask three questions:

**1. What did RepoTend actually find?**

It didn't find a pull request template in the usual places inside this repository.

**2. Is there a good reason?**

Maybe you don't accept outside contributions, or your GitHub organization supplies a shared template. RepoTend only checks the local repository — it can't see those organization settings.

**3. Would changing it help?**

If contributors often leave out important details in PRs, a short template could help. If not, you can leave things as they are. A warning is a suggestion, not a demand.

## Another example: a GitHub Actions warning

Suppose RepoTend says your workflows might run on both a branch push and a pull request for the same change.

That could mean you're paying for unnecessary repeated CI runs. Or those runs might serve different purposes.

RepoTend **hasn't measured** your actual runner usage. Review the workflow's triggers and what the jobs do before changing anything. It's especially important not to make required checks disappear by accident.

This is why some findings are called *heuristics*: they're useful clues, but they need your judgment.

## What the status words mean

You'll mostly see **PASS** and **WARN**:

- **PASS:** RepoTend checked one specific thing and found what it expected. It doesn't mean the whole repository is healthy or secure.
- **WARN:** Something could be improved or may need attention. You decide whether it matters.
- **UNKNOWN:** RepoTend couldn't get a reliable answer. Don't count this as a pass.
- **NOT_APPLICABLE:** The check doesn't fit this repository. For example, there's no workflow to inspect.
- **FAIL:** A check you've *explicitly chosen to enforce* found a verified problem.
- **SUPPRESSED:** You've recorded an exception with a reason, so the finding stays visible without being treated as an active warning or failure while the exception applies. It isn't a pass.

**All checks start out advisory.** Without extra configuration, warnings don't block the audit.

## What should I look at first?

Rank the useful decisions by plausible impact, the risk of a harmful fix, and effort. The number of WARNs is not a health score. Pick something that would make a real difference to the people using your project:

- If people struggle to contribute, start with missing instructions or templates.
- If GitHub Actions is hard to understand, review the workflow warnings one by one.
- If everything seems intentional, you don't have to change anything just to make the report greener.

For each prioritized warning, an agent should explain **what to do next, why it helps, and what must be verified before changing anything**. Keep verified local absences separate from heuristic workflow concerns:

| Decision | Example and prerequisite |
| --- | --- |
| Fix/consider locally | A missing PR template is a verified local absence. Consider adding one if external contributors need guidance and no shared organization template already meets the need. |
| Verify externally | Path-filtered PR checks matter as required checks only if applicable GitHub policies require them. Check branch protection and rulesets first; the local validator has not done this. |
| Review intent / quantify | Establish a publish job's required write scopes before reducing permissions. Compare job purpose and actual run history before removing overlapping triggers; RepoTend has not measured wasted runner time. |
| Accept/document | If the choice is intentional and reasonable, no change may be needed. Explain why while keeping the WARN visible, or propose a documented suppression. Acceptance is not PASS. |

These are explanations, not additional statuses in the report. See the [worked workflow example](WORKFLOW_CHECKS.md#worked-example-prioritize-decisions) for a ranked response covering all four cases. Recommendations do not grant permission to edit files, workflows, or configuration.

You can also [document an exception or turn off a rule](CONFIGURATION.md). Documenting an exception keeps the reason visible, which is often more useful than hiding it.

RepoTend can [preview two small additions](REMEDIATION.md): a missing pull request template and a basic EditorConfig file. Previewing changes never edits your repository, and applying them requires your approval.

## Want to see the details behind a finding?

The normal report is meant for humans, so it keeps things short. For more information — including file evidence, whether a finding is verified or a heuristic, and suggested action — ask for JSON:

```sh
node skills/repotend/scripts/audit.mjs --root "/full/path/to/your-project" --format json
```

Run this from the RepoTend folder. The [rule catalog](RULE_CATALOG.md) explains exactly what each rule checks and where its limits are.

If you're running RepoTend in a script or CI, its exit codes mean:

| Code | Meaning |
| --- | --- |
| `0` | The audit finished without an enforced failure. It may still have warnings. |
| `1` | A rule you explicitly enforced failed. |
| `2` | There was a setup, configuration, or execution error. The audit didn't complete normally. |

If you don't use CI or automation, you probably don't need to think about these numbers.

## One thing to remember

**A clean report isn't a security guarantee, and a report with warnings isn't a bad project.** RepoTend checks 13 deliberately narrow things. It's one helpful look at repository upkeep, not the final word on your code.

[Back to the README](../README.md) · [Your first audit](GETTING_STARTED.md) · [All the checks](RULE_CATALOG.md)
