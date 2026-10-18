# Install RepoTend with the Skills CLI (experimental)

RepoTend is an Agent Skill with a read-only repository auditor. The [Skills CLI](https://github.com/vercel-labs/skills) discovers its `skills/repotend/SKILL.md` and copies this directory to the selected agent's skill location.

## Install in one command

```sh
npx skills@latest add grove/repotend
```

Choose an agent and installation scope. The copied skill already includes its scripts, documentation, and the YAML v2.8.1 parser source (ISC license under `vendor/yaml/LICENSE`). **There is no `npm ci` step.** Node.js 22.16+ is required to run RepoTend. macOS/Linux are documented; Windows users should use WSL.

## Audit a project

Find the installed `repotend/SKILL.md` directory printed by the Skills CLI. From any directory, run:

```sh
node "/absolute/path/to/installed/repotend/scripts/audit.mjs" \
  --root "/absolute/path/to/your-project" --format json
```

Or ask your agent to use the skill **by name**. There is no required slash command; open the target project in the assistant selected during installation and start a fresh session if necessary.

**First audit (recommended):**

```text
Use the RepoTend skill to audit this repository. Explain what passed,
separate verified findings from heuristic recommendations, and prioritize
improvements. Do not change any files.
```

**Preview safe fixes (no changes without approval):**

```text
Use RepoTend to prepare its supported fixes. Show the complete diffs
and plan ID. Wait for my explicit approval before applying anything.
```

**Focus on GitHub Actions:**

```text
Use RepoTend to review my GitHub Actions findings for possible duplicate
runs, broad workflow permissions, and action pinning. Explain caveats.
Do not modify anything.
```

RepoTend always runs the same 13 checks; the GitHub Actions prompt focuses the *explanation*. Only missing PR templates and `.editorconfig` have supported automatic additions.

The audit and remediation preview are read-only. A failed audit must be reported as an execution error, **not** a clean report. Applying either supported new-file remediation requires human approval of the full preview, exact plan ID, and target root.

## If your assistant can't find or run the skill

- Confirm that the Skills CLI installed RepoTend for **the assistant and scope you selected**, then locate the installed `repotend/SKILL.md` and `scripts/audit.mjs`.
- Restart or open a new assistant session; ask explicitly for **RepoTend** by name. Host-specific discovery is experimental outside the tested Copilot setup.
- If it still fails, run the direct `node .../scripts/audit.mjs` command above. Check `node --version` (22.16+) and that the copied skill contains `vendor/yaml`. **Don't run `npm ci`** to repair a Skills CLI installation; the parser is bundled.
- Permission to run a read-only audit is **not** approval to apply any proposed file changes. If the audit fails, report the error rather than treating it as a passing report.

## Notes and boundaries

- The skill is self-contained, with no runtime npm dependencies. A copied skill works without the original checkout or access to the npm registry.
- A separate [Copilot CLI installer](https://github.com/grove/repotend/blob/main/docs/INSTALLATION.md) remains available for existing workflows.
- Skills CLI discovery and agent approval behavior outside Copilot CLI have **not been validated live**.
- Audits do not require GitHub credentials or an AI model. AI agents may share repository contents with their model providers; review privacy settings.
- See [workflow checks](WORKFLOW_CHECKS.md), [configuration](CONFIGURATION.md), and [remediation safety](REMEDIATION.md).
