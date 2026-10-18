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

Or ask your agent: "Audit this repository with RepoTend. Explain verified findings separately from heuristic recommendations. Do not change files."

The audit and remediation preview are read-only. A failed audit must be reported as an execution error, **not** a clean report. Applying either supported new-file remediation requires human approval of the full preview, exact plan ID, and target root.

## Notes and boundaries

- The skill is self-contained, with no runtime npm dependencies. A copied skill works without the original checkout or access to the npm registry.
- A separate [Copilot CLI installer](https://github.com/grove/repotend/blob/main/docs/INSTALLATION.md) remains available for existing workflows.
- Skills CLI discovery and agent approval behavior outside Copilot CLI have **not been validated live**.
- Audits do not require GitHub credentials or an AI model. AI agents may share repository contents with their model providers; review privacy settings.
- See [workflow checks](WORKFLOW_CHECKS.md), [configuration](CONFIGURATION.md), and [remediation safety](REMEDIATION.md).
