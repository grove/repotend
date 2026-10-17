# Reviewable remediation (experimental)

RepoTend can propose **two deliberately limited, deterministic file additions** based on the existing verified audit findings:

| Verified missing-file rule | Proposed file |
| --- | --- |
| `repo.pr-template` | `.github/pull_request_template.md` |
| `dx.editorconfig` | `.editorconfig` |

The PR template has short sections for motivation, changes, testing, and related issues. The EditorConfig sets `charset`, line endings, and final-newline behavior but **does not impose an indentation size or style**. These are starting points for human review, not mandatory policies.

No fix is proposed when the check is `PASS`, `UNKNOWN`, `NOT_APPLICABLE`, `SUPPRESSED`, disabled, or heuristic. A verified `FAIL` from explicitly opted-in enforcement can be eligible for a fix. Other checks, including license, workflow security, and CI efficiency, remain advice-only.

## Preview by default

From the **RepoTend tool checkout** after `npm ci --ignore-scripts`:

```sh
node skills/repotend/scripts/remediate.mjs --root /absolute/path/to/project
node skills/repotend/scripts/remediate.mjs --root /absolute/path/to/project --format json
```

By default RepoTend only reads repository files and prints a unified diff for **new files** (`--- /dev/null`). Preview creates no directories and changes no files. Output includes a SHA-256 **plan ID** computed from the proposed rule IDs, paths, and exact contents. JSON output is suitable for an AI agent or other caller.

Review the entire preview before deciding whether to apply it. A missing repository-local template may intentionally be inherited from an organization; RepoTend does not verify organization defaults. It is fine to decline a suggestion.

## Apply only the reviewed plan

After checking the proposed diff and explicitly approving it, supply the **full plan ID** from the preview:

```sh
node skills/repotend/scripts/remediate.mjs \
  --root /absolute/path/to/project \
  --apply <64-character-plan-id>
```

Do not include the angle brackets in the actual command. The agent skill must **request user approval** before invoking this operation. `--apply` without a reviewed ID is an error.

For an installed Copilot skill, use `node "$HOME/.copilot/skills/repotend/scripts/remediate.mjs"` with the same arguments; see the [complete installation walkthrough](INSTALLATION.md). The digest checks content consistency, not human consent. The agent must show the entire preview and wait for explicit approval; denial means it never calls `--apply` or edits files by another route. Host shell permission alone does not approve a remediation plan.

Before any write, RepoTend re-runs the audit and verifies that the plan ID has not changed. It then validates all destination paths, refuses existing files (including symlinks and directories), never follows detected symlinked parent directories, and creates missing files exclusively (`O_EXCL`, plus `O_NOFOLLOW` where supported). It re-audits affected rules and reports `PASS` only when confirmed.

A stale plan (including a destination that appeared since preview) is refused; the preview must be generated and reviewed again. A second apply of the old plan cannot overwrite its files. If the current audit has no supported fixes, its new preview yields an empty plan and applying that plan is a no-op.

## Safety and scope

- This is **not** an unrestricted patch executor: only the two fixed destinations and exact checked-in template contents can be created.
- No existing file is overwritten, and no GitHub API/remote settings, license, workflow, or source files are changed.
- Preview is always read-only. Applying requires a reviewed digest and an explicit action.
- The tool executes **no target repository code** and does not require GitHub credentials.
- Failures return exit code `2`. Normal previews and successful applies return `0`, even if unrelated audit findings remain advisory or enforced.
- The two-file apply is **not a filesystem transaction**. Files created before a rare write failure may remain; RepoTend reports an error instead of claiming success. It preflights every destination before beginning to minimize partial updates. Like other filesystem tools, this v0.1 implementation is not designed to defend against a concurrently malicious process mutating path components during a write.
- Prefer a clean worktree and inspect `git diff` after applying changes. RepoTend does **not** commit or push automatically.

## Testing

`npm test` exercises read-only previews, plan determinism, reviewed applies, follow-up verification, repeat/stale plans, disabled and enforced rules, existing alternative templates, symlinked paths, bad configurations, CLI parsing, and no-op behavior.

`npm run remediate` performs a **read-only preview against RepoTend itself**. This also runs in the project's self-audit CI summary to ensure the feature continues to work without writing to the repository.
