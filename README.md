# RepoTend

**A friendly checkup for small GitHub repositories.**

RepoTend looks through a local copy of your GitHub project and points out small maintenance tasks worth considering. Think of it as **a helpful checklist, not a report card**.

Maybe you are missing a pull request template. Maybe a GitHub Actions workflow could run twice for the same change. RepoTend shows what it found, explains what it means, and leaves the decisions to you.

**No dashboard, GitHub token, or AI account is needed to run an audit.**

> **Project status: v0.1.0 (experimental).** RepoTend currently has 13 focused checks, readable reports, and two optional, carefully controlled fixes. It is not a complete security or code-quality scanner.

[Try it](#try-it-in-a-few-minutes) · [See use cases](#when-is-repotend-useful) · [Explore the guides](#guides-and-reference)

## When is RepoTend useful?

| You want to… | RepoTend helps you… |
| --- | --- |
| **Get a new project ready for contributors** | Spot missing contribution instructions, community policies, and issue or PR templates. |
| **Tidy up an older repository** | Get a quick inventory of common maintenance gaps without setting up a big toolchain. |
| **Review GitHub Actions** | Notice possible duplicate runs, missing concurrency settings, and risky workflow patterns. |
| **Make a project easier to work on** | Check for simple shared conventions, such as an EditorConfig file. |
| **Ask an AI assistant for help** | Give GitHub Copilot CLI a repeatable audit to explain, instead of relying on guesses. |

RepoTend is designed for solo maintainers and small open-source teams. You can use it on an existing project without adopting a new development process.

## Try it in a few minutes

You need **Git, npm, and Node.js 22.16 or newer**. The commands below are for macOS/Linux; on Windows, use WSL (native Windows has not been validated).

**1. Download RepoTend into its own folder.**

```sh
git clone https://github.com/grove/repotend.git
cd repotend
npm ci --ignore-scripts
```

**2. Point it at a local project you want to check.**

```sh
node skills/repotend/scripts/audit.mjs --root "/absolute/path/to/your-project" --format markdown
```

Replace `/absolute/path/to/your-project` with the actual folder containing your project. Run this command **from the RepoTend folder**, not from the project being checked. RepoTend reads that project; it does not install anything in it or run its code.

You'll get a short summary followed by a table of findings. **Nothing is changed.** For a report that other tools can process, use `--format json` instead.

Want a slower, step-by-step walkthrough? See [Getting started](docs/GETTING_STARTED.md).

## What does it check?

RepoTend currently looks for 13 specific things across four areas:

| Area | Examples |
| --- | --- |
| **Project basics** | License, contribution guidance, code of conduct, security policy, issue and PR templates. |
| **GitHub Actions setup** | Basic workflow YAML/structure, possible duplicate triggers, and cancellation settings. |
| **Workflow security signals** | Token permissions, external actions using changeable version references, and potentially risky path filters. |
| **Developer experience** | Whether an `.editorconfig` file exists to share a few basic editor conventions. |

These are **focused checks, not judgments about the whole project**. For instance, finding a license file does not prove its terms are correct. A warning about duplicate workflow runs does not mean both runs are unnecessary.

The [rule catalog](docs/RULE_CATALOG.md) explains all 13 checks and where they can be wrong.

## What do the results mean?

- **PASS** — this particular check found what it was looking for.
- **WARN** — something to look into; it might be intentional.
- **UNKNOWN** — RepoTend couldn't reliably tell.
- **NOT_APPLICABLE** — the check doesn't fit this repository (for example, workflow checks when there are no workflows).
- **FAIL** — a verified issue in a rule you *chose* to enforce.
- **SUPPRESSED** — a warning or failure you have explicitly documented as an exception; it stays visible.

**Warnings do not fail the audit by default.** Look at them, decide which are useful, and ignore or document the ones that don't apply to your situation.

[Understanding your results](docs/UNDERSTANDING_RESULTS.md) shows how to interpret the report, decide what to fix, and distinguish evidence from suggestions.

## Can it fix anything?

A little — and **only with your approval**.

Today, RepoTend can propose adding two missing files:

- `.github/pull_request_template.md` — a basic template for pull requests.
- `.editorconfig` — a minimal set of editor conventions.

To **preview** the proposed additions:

```sh
node skills/repotend/scripts/remediate.mjs --root "/absolute/path/to/your-project"
```

This command is read-only. It shows the complete changes and a plan ID. Applying a plan is a **separate** step that requires you to review the changes and supply that exact plan ID. RepoTend will not overwrite existing files or automatically fix workflows.

See [Safe, reviewable fixes](docs/REMEDIATION.md) before applying anything.

## Prefer to use GitHub Copilot CLI?

RepoTend also works as an optional **Copilot Agent Skill**. The regular audit works without AI; the skill helps Copilot run that same audit and explain the findings in plain language.

From the RepoTend checkout:

```sh
node scripts/install-skill.mjs --dest "$HOME/.copilot/skills/repotend"
```

Then start a **new, authenticated Copilot CLI session** in the project you want to check and ask:

> Audit this repository with RepoTend. Explain verified findings separately from suggestions. Do not change any files.

The installer makes a separate copy of the skill and its runtime dependency. It will refuse to replace an existing installation. For setup, updating, troubleshooting, and approval examples, see the [Copilot CLI installation guide](docs/INSTALLATION.md).

**Privacy note:** The standalone validator analyzes local files without uploading them or calling an AI service. If you use Copilot, your Copilot host may send repository content to its configured model provider; check its privacy settings first.

## Make it fit your project

You don't need a configuration file. The default `small-oss` profile makes all checks **advisory**.

If you want to enforce a specific objective rule, create `.repotend.yml` in the project being checked:

```yaml
schema: 1
profile: small-oss
rules:
  repo.license-present:
    enforce: true
```

Now a missing license causes a `FAIL` and an audit exit code of `1`. You can also disable checks or record a justified exception, with an optional expiry date. See the [configuration guide](docs/CONFIGURATION.md) for the supported syntax and limits.

## What RepoTend doesn't do (yet)

RepoTend deliberately keeps its first release small:

- It **doesn't run** the checked project's builds, tests, or other scripts.
- It **doesn't check** live GitHub settings or organization-wide defaults.
- It **doesn't certify** your repository as secure, measure actual CI savings, or score the quality of your code.
- It **doesn't automatically edit** existing files, workflows, or GitHub settings.

The audit and fix preview are read-only. Those boundaries are intentional: suggestions should be easy to understand before anyone acts on them.

## Guides and reference

- **[Getting started](docs/GETTING_STARTED.md)** — your first audit, one step at a time.
- **[Understanding results](docs/UNDERSTANDING_RESULTS.md)** — statuses, evidence, exit codes, and next steps.
- [All 13 rules](docs/RULE_CATALOG.md) — exactly what each check does.
- [Configuration](docs/CONFIGURATION.md) — optional enforcement and documented exceptions.
- [Safe fixes](docs/REMEDIATION.md) — review, approval, and verification.
- [Copilot CLI setup](docs/INSTALLATION.md) — installation, updates, and troubleshooting.
- [Technical design](docs/DESIGN.md) · [Changelog](CHANGELOG.md) · [Release notes](docs/RELEASE_NOTES_V0.1.0.md)

## Help make RepoTend better

Have an example of a repository check that would save you time? Suggestions, bug reports, and documentation improvements are welcome — especially ones that keep maintenance simple for small projects.

Start with [CONTRIBUTING.md](CONTRIBUTING.md), and please follow the [Code of Conduct](CODE_OF_CONDUCT.md). For security reports, use the private process described in [SECURITY.md](SECURITY.md), not a public issue.

RepoTend is open source under the [Apache License 2.0](LICENSE).
