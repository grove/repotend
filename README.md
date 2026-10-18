# RepoTend

**A little help keeping your GitHub projects in good shape.**

You know the small things that are easy to put off? Writing a contribution guide. Adding a pull request template. Checking whether GitHub's automatic tests run more often than they need to.

RepoTend helps you notice them.

It looks at a repository on your computer and gives you a readable report: what's already in place, what might be missing, and what could be worth a closer look. It's made for small projects and the people looking after them.

**An audit doesn't change anything.** You don't need an AI assistant, a GitHub token, or a hosted service to run one.

> **Early days:** RepoTend v0.1.0 is experimental. It's a helpful checklist, not a security certification or a score for your code.

## Here's an example

Imagine you're about to invite people to contribute to a side project. RepoTend might notice:

- **There's a license file.** Great — one less thing to think about.
- **There's no pull request template.** A short template could help contributors explain their changes.
- **Your GitHub Actions workflows might run twice for one change.** Worth checking, but the two runs could be intentional.

These are *examples*, not results from your project. RepoTend won't insist you fix every warning. You might have good reasons for doing things differently.

### When does that help?

- **Before sharing a project:** see whether new contributors have the basics they need.
- **When you return to an old repository:** get a quick reminder of the maintenance tasks you may have forgotten.
- **When GitHub Actions gets complicated:** find possible workflow issues to investigate, without blindly changing your CI.

## Install with the Skills CLI (experimental)

Install RepoTend as an Agent Skill in supported coding assistants with one command:

```sh
npx skills@latest add grove/repotend
```

**No second setup command is required.** The `yaml` v2.8.1 parser is bundled with the skill, so the copied skill works with Node.js 22.16+ without `npm ci`, installing dependencies in your project, or downloading anything during an audit. Ask your agent to audit your repository using RepoTend. See [installation options](docs/INSTALLATION.md) for manual use, privacy, and limitations.

## Give it a try

You'll need **Git, npm, and Node.js 22.16 or newer**. These commands work on macOS and Linux; on Windows, use WSL (native Windows hasn't been validated).

**1. Get RepoTend.** Keep it in its own folder, separate from the project you want to check.

```sh
git clone https://github.com/grove/repotend.git
cd repotend
npm ci --ignore-scripts
```

**2. See it in action.** This checks RepoTend's own repository, so you can try it without setting anything else up:

```sh
npm run audit
```

You'll see a summary and a table of findings.

**3. Check your project.** Still in the `repotend` folder, run:

```sh
node skills/repotend/scripts/audit.mjs --root "/full/path/to/your-project"
```

Replace the sample path with your project's folder. Not sure what its path is? Open a terminal in that folder and run `pwd`.

That's it. RepoTend reads the project's files; it doesn't run its code, install anything in it, or make changes. For help with each step, see [Your first audit](docs/GETTING_STARTED.md).

## What will it tell me?

Each check has a result. The two you'll see most often are:

- **PASS** — RepoTend found what it was checking for.
- **WARN** — something is worth a look. It might be perfectly fine as it is.

If RepoTend can't tell, it says **UNKNOWN** rather than guessing. A warning doesn't make the audit fail unless you've explicitly chosen to enforce that particular rule.

[How to read your results](docs/UNDERSTANDING_RESULTS.md) has examples and explains the other results.

### What's on the checklist?

RepoTend currently has **13 small checks** covering:

- **The basics:** things like a license, contribution guidance, and issue or pull request templates.
- **GitHub Actions:** basic workflow structure, possible duplicate runs, and opportunities to avoid unnecessary work.
- **Security-related clues:** workflow permissions and whether third-party actions are pinned to a specific version of their code.
- **Everyday development:** whether the project has an `.editorconfig` file for shared editor settings.

It only looks at local files and workflows. It can't see GitHub organization settings, measure actual CI savings, find bugs in your source code, or tell you that a project is secure. See [exactly what each check does](docs/RULE_CATALOG.md).

## What if I want to act on a suggestion?

**You choose what happens next.** Most findings are advice for you to consider.

RepoTend can also **preview** two small additions: a missing pull request template or a basic `.editorconfig` file.

```sh
node skills/repotend/scripts/remediate.mjs --root "/full/path/to/your-project"
```

This only shows you the proposed changes. To apply them, you must review the full diff and explicitly supply its matching plan ID in a separate command. RepoTend won't overwrite an existing file. [Read how safe fixes work](docs/REMEDIATION.md).

If you use **GitHub Copilot CLI**, you can [install RepoTend as a skill](docs/INSTALLATION.md) and ask Copilot to run the same audit and explain the findings. The audit itself does not need AI. Be aware that Copilot may send repository content to its model provider.

You can also [choose which checks matter to your project](docs/CONFIGURATION.md). Everything is advisory until you opt in to enforcement.

## Find your way around

**New here?** Start with [Your first audit](docs/GETTING_STARTED.md) and [Understanding your results](docs/UNDERSTANDING_RESULTS.md).

**Want the details?** See the [rule catalog](docs/RULE_CATALOG.md), [configuration](docs/CONFIGURATION.md), [safe fixes](docs/REMEDIATION.md), and [Copilot CLI setup](docs/INSTALLATION.md).

**Want to help?** Bugs, suggestions, and small improvements are welcome. Read [Contributing](CONTRIBUTING.md), follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report vulnerabilities through [the security policy](SECURITY.md), not a public issue.

RepoTend is open source under the [Apache 2.0 license](LICENSE).
