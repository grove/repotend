# Install RepoTend with the Skills CLI (experimental)

RepoTend is an Agent Skill with a read-only repository auditor. The [Skills CLI](https://github.com/vercel-labs/skills) discovers its `skills/repotend/SKILL.md` and copies this directory to the selected agent's skill location.

## Install

From your terminal:

```sh
npx skills@latest add grove/repotend
```

Choose an agent and install scope. The command copies the skill, scripts, pinned dependency manifest, lockfile, and reference docs. **It does not install npm dependencies or validate that the audit runs.** Node.js 22.16+ and npm are required for the next step. macOS/Linux are the documented environments; on Windows use WSL.

## Prepare the installed skill once

Find the **installed** `repotend/SKILL.md` directory in the location selected by the Skills CLI. Run these commands **in that installed skill directory**, not in the repository being audited:

```sh
cd "/absolute/path/to/installed/repotend"
npm ci --omit=dev --ignore-scripts --no-audit --no-fund
```

This downloads the pinned YAML parser (v2.8.1) from npm into the installed skill's `node_modules`. It does not run target-project code or dependencies. With an AI agent, approve this setup as a **separate install action**, then ask the agent to audit; do not silently run npm as part of the audit.

## Audit a project

From any directory, run the installed script and pass the target repository's absolute path:

```sh
node "/absolute/path/to/installed/repotend/scripts/audit.mjs" \\
  --root "/absolute/path/to/your-project" --format json
```

Alternatively, ask the agent: "Audit this repository with RepoTend. Explain verified findings separately from heuristic recommendations. Do not change files."

The audit and remediation preview are read-only. A missing dependency or failed audit must be reported as a setup/error condition (exit 2), **not** as an empty or successful report. Applying either supported new-file remediation requires human approval of the full preview, exact plan ID, and target root.

## Other installation and validation notes

- A separate, [tested Copilot CLI installer](https://github.com/grove/repotend/blob/main/docs/INSTALLATION.md) copies and prepares the runtime automatically.
- The copied skill works without the original checkout **after** installing its own pinned dependency.
- The Skills CLI installation and discovery behavior for other agents has **not been validated live**. Test the selected agent's discovery and shell permission behavior before relying on it.
- Audits do not require GitHub credentials or an LLM. AI agents may send repository content to their configured model provider; consider repository privacy first.
- See [workflow checks](WORKFLOW_CHECKS.md), [configuration](CONFIGURATION.md), and [remediation safety](REMEDIATION.md).
