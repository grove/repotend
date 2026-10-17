# Install and try RepoTend (experimental)

RepoTend is **not yet a published npm package or a standalone skill bundle**. For now, the source checkout supplies the validator and its pinned dependencies. Installing only `SKILL.md` or copying `skills/repotend/` without the checkout will **not** work because the TypeScript engine imports the `yaml` dependency from the RepoTend checkout.

## Prerequisites

- Git and Node.js **22.16 or newer**.
- A network connection for the initial checkout and `npm ci`.
- An AI coding agent that supports the open `SKILL.md` format **if** you wish to use the skill. No agent is needed for the validator.

## 1. Install RepoTend's validator (read-only)

```sh
# Pick a checkout location outside the repository you want to audit.
git clone https://github.com/grove/repotend.git "$HOME/repotend-tool"
cd "$HOME/repotend-tool"
npm ci --ignore-scripts
npm test

# Pass any local GitHub repository as the --root argument.
node skills/repotend/scripts/audit.mjs --root /absolute/path/to/project --format markdown
node skills/repotend/scripts/audit.mjs --root /absolute/path/to/project --format json
```

The audit and the separate remediation **preview** do not modify the audited project or execute its build/test scripts. It returns `0` for advisory findings, `1` for explicitly enforced violations, and `2` on tool/configuration errors. See [configuration](CONFIGURATION.md).

### Preview supported fixes (optional)

```sh
node skills/repotend/scripts/remediate.mjs --root /absolute/path/to/project
```

This only prints diffs. Applying the two supported missing-file templates requires an explicit command with the full reviewed plan ID. See [remediation and safety](REMEDIATION.md).

## 2. Make the skill discoverable locally (optional)

One possible **local** GitHub Copilot installation uses its personal skills directory. These commands use an absolute symlink so that the skill can still resolve its scripts and RepoTend's installed dependency:

```sh
mkdir -p "$HOME/.copilot/skills"
ln -s "$(realpath "$HOME/repotend-tool/skills/repotend")" "$HOME/.copilot/skills/repotend"
```

For a project-local agent that recognizes `.github/skills/`, use the same symlink in `<your-project>/.github/skills/repotend`. For an agent that recognizes `.agents/skills/`, use that directory instead. Do **not** commit a machine-specific absolute symlink to a shared repository. If the location already exists, review it before replacing anything; the commands intentionally do not overwrite.

In a compatible agent, try:

> Audit this repository with RepoTend. Show verified findings separately from heuristic recommendations. Do not change files.

**Compatibility limitation:** Automated testing verifies that a symlinked skill's bundled script can execute in a separate workspace; it does not verify automatic skill discovery or response quality inside a specific AI host. Some cloud agents do not follow symlinks outside their workspace. A self-contained distributable skill is future work.

## 3. Verify a clean consumer workspace

To verify the installation independently of the agent:

```sh
node "$HOME/.copilot/skills/repotend/scripts/audit.mjs" \
  --root /absolute/path/to/project --format json
```

Do not run `npm install`, `npm test`, or arbitrary scripts **inside the repository being audited**. Run RepoTend's own tests inside the *tool checkout* only. Agent hosts may send source snippets to their configured model provider; consult host privacy settings before auditing confidential code.

## 4. Validate against real public projects

From the RepoTend checkout, run:

```sh
npm run validate:external
npm run validate:external -- --format json
```

This downloads the **two public repositories pinned to exact commits** in [test/external-repositories.json](../test/external-repositories.json), runs RepoTend read-only, checks a few evidence-backed expected statuses, and deletes the temporary checkouts. The external integration test needs network access and Git but **does not execute the sampled projects' code**. See [external validation](EXTERNAL_VALIDATION.md).
