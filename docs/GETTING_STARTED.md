# Getting started with RepoTend

Welcome! This guide takes you from **"I have a GitHub repository"** to **"I know which small improvements might help it."** No AI assistant is required.

## Before you begin

You'll need:

- A local copy of the repository you'd like to inspect.
- Git, npm, and **Node.js 22.16 or newer** (`node --version` shows your version).
- macOS or Linux. On Windows, use WSL with Node/npm installed inside WSL; native Windows hasn't been validated.

The example commands use a terminal. RepoTend and your project should live in **different folders**. You only install dependencies in RepoTend's folder, never in the project you're checking.

## Step 1: Get RepoTend

```sh
git clone https://github.com/grove/repotend.git
cd repotend
npm ci --ignore-scripts
```

This downloads RepoTend and installs its pinned dependencies. You only need to do this once per checkout (or after its dependencies change). The npm command runs inside RepoTend, **not** your project.

## Step 2: Audit a project

Suppose your project is in `/home/you/projects/my-app`. While you're in the RepoTend folder, run:

```sh
node skills/repotend/scripts/audit.mjs --root "/home/you/projects/my-app" --format markdown
```

Replace the sample path with your own **absolute path**. You can inspect RepoTend itself by omitting `--root`, since the tool uses your current directory by default.

The auditor looks at local repository files and GitHub Actions workflows. It does not execute the target project's code, change its files, or require a GitHub token. A successful audit may contain warnings — that is normal.

## Step 3: Read your report

Your report starts with counts (passes, warnings, unknowns, and so on) and a table showing each check. Here is an **illustrative** example of what a few rows might look like:

| Status | Rule | What it tells you |
| --- | --- | --- |
| PASS | `repo.license-present` | RepoTend found a recognizable license file. |
| WARN | `repo.pr-template` | It didn't find a recognized pull request template. |
| NOT_APPLICABLE | `ci.concurrency` | No relevant workflow was found to inspect. |

The real report gives the exact observation for your repository. A PASS only covers one narrow check; a WARN is a suggestion, not necessarily a mistake.

To learn more about a rule, look up its ID in the [rule catalog](RULE_CATALOG.md). [Understanding results](UNDERSTANDING_RESULTS.md) explains the different statuses and what to do next.

## Step 4: Decide what matters to *you*

Start with one or two suggestions that would make your project easier to maintain. For example:

- New contributors often ask how to send changes? A PR template might help.
- You want consistent basic editor behavior? Consider an EditorConfig file.
- Your Actions workflow appears to run on both pushes and pull requests? Check whether that's intentional before changing triggers.

Some warnings depend on your setup. RepoTend cannot see remote GitHub settings or organization-wide defaults, so it may suggest something your organization already supplies.

## Step 5 (optional): Preview the two built-in fixes

RepoTend currently knows how to **propose**, but not automatically apply, two simple missing-file additions: a PR template and an EditorConfig.

```sh
node skills/repotend/scripts/remediate.mjs --root "/home/you/projects/my-app"
```

The preview prints exactly what it would add and a plan ID; it **does not write files**. If you don't like the suggestions, stop here. Nothing happens.

To actually add approved files, you must review the complete diff and explicitly pass the **full** plan ID to `--apply` in a separate command. See [Safe, reviewable fixes](REMEDIATION.md) for the exact steps and limitations. Existing files are never overwritten.

## Step 6 (optional): Save a JSON report

Use this if you want another program or AI assistant to process the audit findings:

```sh
node skills/repotend/scripts/audit.mjs --root "/home/you/projects/my-app" --format json
```

This prints structured JSON rather than the easy-to-read table. See the [report contract](REPORT_CONTRACT.md) for fields and schemas. The default profile does not enforce rules, but an invalid configuration or runtime problem can still make the command exit with an error.

## Prefer an AI explanation?

You can install RepoTend as a [GitHub Copilot CLI skill](INSTALLATION.md). Copilot can run the same validator and explain recommendations, but **the validator itself is independent of AI**. Copilot's host may transmit content to its model provider, so check its privacy policies for private repositories.

## Where to go next

Return to the [README](../README.md), explore the [13 checks](RULE_CATALOG.md), or tailor the optional [configuration](CONFIGURATION.md) to your project. If something seems wrong or confusing, [contributions and reports](../CONTRIBUTING.md) are welcome.
