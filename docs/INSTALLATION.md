# Install RepoTend as an agent skill (experimental)

## Skills CLI (multi-agent skill discovery; experimental)

Install the self-contained skill with:

```sh
npx skills@latest add grove/repotend
```

The CLI copies `skills/repotend` into an agent-supported skill location. The skill includes scripts, reference docs, the **vendored YAML v2.8.1 parser**, and its upstream ISC license. With Node.js 22.16+ available, **there is no `npm ci` or other setup step**. Unlike a source checkout, the copied skill does not rely on the root project's `node_modules`. A normal audit can run offline.

Find the destination printed by the Skills CLI and ask the agent to audit your repository with RepoTend. Agent discovery/permission behavior outside Copilot remains unverified live; test your chosen host. An audit is read-only and never runs dependencies or scripts from the audited repository.

## GitHub Copilot CLI installer (live validated)

RepoTend also provides a **copied, self-contained skill installation** built from a source checkout. It includes the validator, documentation, license, and pinned runtime dependency. No absolute symlinks, global npm package, or target-project dependency setup are needed. The source checkout can be removed after installation.

## Requirements and boundaries

- Git, npm, and Node.js **22.16+** on the machine running the validator.
- Initial network access to GitHub and the npm registry. Audits and remediation work offline after installation.
- An authenticated GitHub Copilot CLI session for agent use; no agent, LLM, or GitHub credentials are needed for the validator.
- The shell examples target macOS/Linux. Windows installation has not been validated; use WSL with Node/npm installed inside WSL. Cloud agents must receive the entire installed directory and have Node available within their workspace; discovery outside that workspace is not assumed.
- The host agent may send repository content to its configured model provider. Review host privacy settings before auditing private code.

## Install once, outside the audited repository

Run these commands from outside the repository you want to audit:

```sh
git clone https://github.com/grove/repotend.git "$HOME/repotend-tool"
cd "$HOME/repotend-tool"
git rev-parse HEAD # record the source revision; check out a reviewed commit if required
node scripts/install-skill.mjs --dest "$HOME/.copilot/skills/repotend"
```

The installer copies the skill, scripts, docs, manifest, lockfile, and license into the new destination. It runs `npm ci --omit=dev --ignore-scripts --no-audit --no-fund` **there**, and checks both entrypoints using an empty disposable directory. Only the pinned runtime dependency is installed. It refuses any existing destination, including symlinks, and removes its new installation if setup fails. No npm command runs in the audited project.

This is a personal installation, discoverable across local projects. GitHub documents `~/.copilot/skills` as a [personal skill location](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills). Start a new Copilot session after installing. No broad tool permissions are included in the skill.

The live validation used the same installer with `--dest /absolute/path/to/disposable-project/.github/skills/repotend`, a project-level Copilot location. Keep the tool checkout separate and never run npm at the target-project root. The copied skill has its own dependency setup; do not commit its `node_modules`. Personal-directory discovery is documented from the host specification but has not been exercised in the live session; see [the exact tested setup](AGENT_VALIDATION.md).

## One independent audit

From the repository you want to audit:

```sh
node "$HOME/.copilot/skills/repotend/scripts/audit.mjs" --root "$PWD" --format json
```

Use `--format markdown` for a human-readable report. Audit exits 0 for advisory outcomes, 1 for explicitly enforced violations, and 2 for execution/configuration errors. A nonzero launch failure or absent JSON is not a completed audit. See [configuration](CONFIGURATION.md).

## Audit and prepare fixes with Copilot

From the target repository, start `copilot` with its ordinary interactive permissions, then ask:

> Audit this repository with RepoTend. Explain verified findings separately from heuristic recommendations. Do not change files.

Then:

> Prepare the two supported fixes. Show the complete diffs and the reviewed plan ID. Do not apply them; wait for my explicit approval.

The agent must run the installed validator and read-only remediation preview. Review the complete paths, diffs, and 64-character plan ID. Only if you want those exact additions, reply:

> I approve plan PLAN_ID for this repository. Apply exactly that plan and verify the result.

Replace PLAN_ID with the full displayed digest. To decline, reply `I do not approve. Do not change files.` The agent must leave files unchanged on denial. Do not grant blanket shell/write permissions or use `--allow-all`/`--yolo` to test this interaction. Approving a shell invocation and approving proposed file changes are separate decisions; use one-time tool approval for the specific reviewed command. See [GitHub's tool approval controls](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/allowing-tools).

[Agent validation](AGENT_VALIDATION.md) distinguishes observed live behavior from deterministic tests and outstanding acceptance. Script success alone never proves host discovery or human consent.

## Preview, approval, and verification without an agent

```sh
# Read-only: review the complete diff and plan ID.
node "$HOME/.copilot/skills/repotend/scripts/remediate.mjs" --root "$PWD"
# Stop here unless you approve that exact preview. Paste its full digest:
REVIEWED_PLAN_ID='paste-the-reviewed-64-character-plan-id'
node "$HOME/.copilot/skills/repotend/scripts/remediate.mjs" \
  --root "$PWD" --apply "$REVIEWED_PLAN_ID" --format json
node "$HOME/.copilot/skills/repotend/scripts/audit.mjs" --root "$PWD" --format json
git status --short
git diff --no-index /dev/null .editorconfig
git diff --no-index /dev/null .github/pull_request_template.md
```

The `git diff --no-index` commands show new, untracked files and normally exit 1 when a diff exists. Applying can only add a missing PR template and EditorConfig; it verifies both affected rules. A stale/repeat plan is refused. The digest proves content consistency, **not human consent**; callers must enforce approval. See [remediation safety and partial-write limitations](REMEDIATION.md).

## Update and uninstall

The install is a snapshot, not a live link to the checkout. Record the chosen source commit when updating:

```sh
cd "$HOME/repotend-tool"
git pull --ff-only
git rev-parse HEAD
node scripts/install-skill.mjs --dest "$HOME/.copilot/skills/repotend-next"
```

After independently testing `repotend-next/scripts/audit.mjs`, close Copilot, move the old `repotend` directory outside the skills directory as a backup, and rename `repotend-next` to `repotend`. Restart Copilot. Do not leave duplicate RepoTend skill names in the discovery directory. The installer deliberately has no overwrite or force option.

To uninstall, close Copilot and remove only the installed `$HOME/.copilot/skills/repotend` directory. The tool checkout can also be removed. Uninstall does not undo files you approved adding to target repositories.

## Troubleshooting and validation

- **Skill missing:** confirm `~/.copilot/skills/repotend/SKILL.md` exists, restart Copilot, and inspect `/skills info repotend`. Ask by name without supplying a script path to test discovery.
- **Missing module / corrupt setup:** stop; no findings have been verified. Reinstall into a new destination from a trusted checkout. Copying only `SKILL.md` or the source skill folder omits the dependency and is unsupported.
- **Old Node / npm failure:** check `node --version` and `npm --version`, registry/network availability, and writable installation space. A failed installer exits 2 and does not advertise success.
- **Existing destination:** inspect it and choose a fresh path. Nothing is overwritten.
- **Workspace boundary:** a personal install may need one-time host permission to read/run its scripts outside the target workspace. If the host cannot access it, stop and report that limitation; do not install dependencies in the target.
- **Stale plan:** rerun preview, review every diff again, and obtain new approval. Never silently replace the reviewed ID.

For contributor checks, run `npm ci --ignore-scripts`, `npm run typecheck`, and `npm test` only in the RepoTend tool checkout. Installation fixture tests run from separate directories, remove their source checkout, and exercise audit, preview, guarded apply, stale plans, and broken setup without a live LLM. `npm run validate:external` audits two pinned public repositories without executing their code; see [external validation](EXTERNAL_VALIDATION.md). Real-host acceptance is opt-in and is not part of ordinary CI.
