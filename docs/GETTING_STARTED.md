# Your first RepoTend check

Want to see what RepoTend thinks of a project? This is the **manual, no-agent installation** walkthrough: it starts by checking RepoTend itself, then shows you how to check your own repository.

**Using a coding assistant instead?** The simpler, alternative setup is `npx skills@latest add grove/repotend`. You do **not** need to clone RepoTend or run `npm ci` if you've installed the skill that way. See the [README's copy-paste prompts](../README.md#use-repotend-in-your-ai-assistant) or [agent installation guide](INSTALLATION.md).

You won't need to sign in to GitHub or connect an AI assistant for this manual method. **Nothing in your project will be changed.**

## Before you start

You'll need **Git, npm, and Node.js 22.16 or newer**, plus a terminal (the app where you type commands). On macOS and Linux, the built-in terminal is fine. On Windows, use WSL; native Windows hasn't been validated.

First, check which version of Node.js you have:

```sh
node --version
```

If the number is below `v22.16.0`, [install a newer Node.js](https://nodejs.org/en/download) before continuing.

You'll also need your project saved in a folder on your computer when you're ready to audit it. If it's only on GitHub right now, clone it first.

## 1. Get RepoTend

Open a terminal and run these commands, one line at a time:

```sh
git clone https://github.com/grove/repotend.git
cd repotend
npm ci --ignore-scripts
```

This creates a `repotend` folder and installs the small set of dependencies RepoTend needs.

**Keep RepoTend separate from the project you want to check.** The `npm ci` command belongs in the RepoTend folder, not in your own project.

## 2. Run your first check

From inside the `repotend` folder, type:

```sh
npm run audit
```

This audits RepoTend itself. It's a handy way to see a report without having to figure out your project's location yet.

You'll see a summary followed by a table. The table has three columns:

- **Status:** whether a check passed or needs a look.
- **Rule:** the name of the thing RepoTend checked.
- **Observation:** what it noticed.

For example, a report could tell you a license file was found (**PASS**) but a pull request template wasn't (**WARN**).

A **WARN is not an emergency**. It means "take a look and decide." It's quite normal to have warnings in a successful audit.

## 3. Try it on your project

Now find the folder containing your project's files. If you don't know its full path:

1. Open a terminal in your project's folder.
2. Type `pwd` (short for "print working directory").
3. Copy the path that appears, such as `/home/sam/projects/my-app`.

Go back to your terminal in the `repotend` folder. Replace the sample path below with the one you copied:

```sh
node skills/repotend/scripts/audit.mjs --root "/home/sam/projects/my-app"
```

The `--root` option means "check this folder." The quotes help if your folder's name contains spaces.

RepoTend will read your project's local files and GitHub Actions workflows. It **won't** install dependencies in your project, run its tests, or edit anything.

## 4. What should you do with the report?

You don't have to tackle everything at once.

- If you see **PASS**, that particular check found what it was looking for.
- If you see **WARN**, ask yourself whether the suggestion would actually help your project. Maybe a missing PR template is useful; maybe your project doesn't accept outside contributions.
- If you see **UNKNOWN**, RepoTend couldn't check reliably. That's different from a pass.

Start with one suggestion that feels useful. It's okay to leave the others for later, or decide they don't apply.

[Understanding your results](UNDERSTANDING_RESULTS.md) explains each status with examples. [The rule catalog](RULE_CATALOG.md) says exactly what each check looks at.

## Want to see a suggested fix?

RepoTend can prepare two very small additions: a missing pull request template and a basic `.editorconfig` file.

Run this from the RepoTend folder, using your own project path:

```sh
node skills/repotend/scripts/remediate.mjs --root "/home/sam/projects/my-app"
```

**This is only a preview.** You'll see proposed file contents and a plan ID, but no files will be changed. You can close the terminal at this point if you want.

Applying a plan requires a separate command and your explicit approval of that exact plan. Read [How safe fixes work](REMEDIATION.md) before going further.

## If something doesn't work

| What happened? | What to try |
| --- | --- |
| `node` isn't found, or its version is too old. | [Install Node.js 22.16+](https://nodejs.org/en/download), then check `node --version` again. |
| The audit can't find the project folder. | Check the path with `pwd`, and make sure you're passing the actual folder where your project lives. |
| RepoTend reports a missing dependency. | In the `repotend` folder, rerun `npm ci --ignore-scripts`. |
| I got warnings. Did it fail? | Usually not! By default, warnings are information, not a reason to stop the audit. |

If an audit says it **couldn't run**, don't treat that as a clean bill of health. See [result meanings](UNDERSTANDING_RESULTS.md) or [open an issue](https://github.com/grove/repotend/issues) with the error message (without sharing private information).

## Where next?

You can also [use RepoTend with GitHub Copilot CLI](INSTALLATION.md), [change which checks you care about](CONFIGURATION.md), or [get a JSON report for other tools](REPORT_CONTRACT.md).

Or you're done for today. A quick check and one useful improvement is already a good start.

[Back to the README](../README.md)
