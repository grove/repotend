# RepoTend

**Good practices. Healthy repositories. Less maintenance.**

RepoTend is an open-source, AI-assisted toolkit for maintaining healthy **small GitHub repositories**. It helps maintainers audit engineering practices, understand actionable findings, and make safe, reviewable improvements—without introducing enterprise-scale process.

> **Project status: experimental / pre-v0.1.** A reusable TypeScript rule registry, read-only audit script, and portable Agent Skill live in this repository. They cover thirteen focused checks, **not** the planned v0.1 feature set. The capabilities below describe the broader intended first release.

## Why RepoTend?

Maintainers often know what a well-run repository should have—clear contribution guidance, useful issue and PR templates, sensible CI, secure workflows, and reproducible development setup—but keeping those practices consistent takes time.

RepoTend aims to provide a practical starting point and a light-touch maintenance assistant. It should be useful to a solo maintainer without requiring a service, dashboard, or extensive configuration.

## What it will do

The first release is planned around four small, broadly applicable areas:

| Area | Example checks and guidance |
| --- | --- |
| Repository conventions | README and license presence, contribution guidance, issue/PR templates, consistent label and commit conventions |
| GitHub Actions | Workflow validity, unnecessary executions, concurrency settings, and risky path-filtering suggestions |
| Basic security | Least-privilege workflow tokens and dangerous workflow patterns, integrating existing tools where useful |
| Developer experience | Onboarding clarity, consistent formatting configuration, and discoverable build/test instructions |

RepoTend's planned workflow is **audit → explain → propose → fix → verify**. Deterministic scripts will provide reproducible findings; an AI skill will help interpret context and prepare changes. No AI model is required to run the checks.

### Experimental self-audit (available now)

Node.js **22.16+** is required for built-in TypeScript stripping. Install the pinned dependencies before running audits:

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
node skills/repotend/scripts/audit.mjs --format markdown
node skills/repotend/scripts/audit.mjs --format json
```

For a different repository, pass `--root /path/to/repository`. [Installation instructions](docs/INSTALLATION.md) cover a separate consumer checkout and local Agent Skill setup. The skill lives at [skills/repotend/SKILL.md](skills/repotend/SKILL.md). See [dogfooding policy and limitations](docs/DOGFOODING.md). The default `small-oss` profile is advisory. The optional [`.repotend.yml` configuration](docs/CONFIGURATION.md) can disable checks or enforce individual verified rules. See the [configuration guide](docs/CONFIGURATION.md) for supported syntax, statuses, and exit codes. The workflow checks now use a YAML 1.2 parser and include static CI efficiency and security recommendations, but this remains a limited audit, not a complete GitHub Actions semantic validator or security scanner.

### Experimental safe remediation (available now)

RepoTend can preview two small, fixed-content additions: a missing PR template and a minimal EditorConfig. By default, preview is read-only and shows a diff. Applying requires a **reviewed plan ID** and explicit approval; no existing files are overwritten.

```sh
node skills/repotend/scripts/remediate.mjs --root /path/to/project
node skills/repotend/scripts/remediate.mjs --root /path/to/project --format json
```

See [reviewable remediation and safety](docs/REMEDIATION.md) for the separate apply command and limitations. [Agent validation](docs/AGENT_VALIDATION.md) records live Copilot CLI discovery, preview, denial, human-approved apply, and verification separately from script-level tests.

### Install the experimental Copilot CLI skill

From a separate RepoTend checkout, install a complete copy with pinned runtime dependencies:

```sh
node scripts/install-skill.mjs --dest "$HOME/.copilot/skills/repotend"
```

Then start Copilot CLI from the repository to audit and ask:

> Audit this repository with RepoTend. Explain verified findings separately from heuristic recommendations. Do not change files.

The installation includes scripts, documentation, and dependencies; it works without the source checkout or machine-specific symlinks. Follow [installation, update, uninstall, and approval examples](docs/INSTALLATION.md). A live Copilot CLI session loaded the skill, ran its validator, waited for human approval, applied that exact reviewed plan, and verified the result in a disposable repository. See [agent validation](docs/AGENT_VALIDATION.md) for redacted evidence, negative paths, and the tested host configuration. A standalone CLI and a reusable GitHub Action remain possible later interfaces.

## Principles

1. **Small-project-first.** Minimize ceremonies, prerequisites, and false positives.
2. **Advisory by default.** Checks inform; nothing blocks CI unless a maintainer explicitly enables enforcement.
3. **Evidence over guesses.** Clearly distinguish confirmed issues, heuristics, unknowns, and non-applicable checks.
4. **AI-assisted, not AI-dependent.** Scripts own deterministic verification; the agent explains and proposes changes.
5. **Safe and reviewable.** Static audits do not execute untrusted repository code or modify repository state. Fixes require explicit action, and privileged changes require approval.
6. **Local-first and private by default.** No hosted backend or telemetry is planned; GitHub API access will be optional for checks that require it.
7. **Reuse proven tools.** Integrate established validators instead of rebuilding them.
8. **Progressive adoption.** Work with existing repositories; allow project-specific exceptions and configuration overrides.

## Scope and roadmap

**Planned for v0.1**

- A portable Agent Skill and a small library of independently testable validation scripts.
- Read-only local repository auditing, with optional read-only GitHub metadata checks.
- A focused initial rule set for conventions, CI, security, and developer experience.
- Human-readable Markdown and versioned machine-readable JSON reports.
- Configurable, opt-in enforcement for objective rules, plus safe proposed remediations.
- Tests against small fixture repositories and RepoTend's own repository.

**Not planned for v0.1**

- A hosted service or dashboard.
- A general-purpose CLI distribution or packaged GitHub Action.
- Fully automatic application of remote GitHub settings.
- An “optimal test pyramid” score, flaky-test analytics, deep architecture checks, or historical CI cost attribution.
- GitLab or other non-GitHub hosting platforms.

The roadmap is intentionally incremental: working checks should arrive before a large framework does.

## Documentation

- [Design and decisions](docs/DESIGN.md) — architecture, rule contract, safety model, and design rationale.
- [Reviewable remediation](docs/REMEDIATION.md) — preview-only by default, explicit apply, and two supported file additions.
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md) — milestones, initial rule backlog, acceptance criteria, and non-goals.
- [Dogfooding](docs/DOGFOODING.md) — current self-audit rules and their limitations.
- [Configuration](docs/CONFIGURATION.md) — supported policy syntax, enforcement, and exit codes.
- [GitHub Actions checks](docs/WORKFLOW_CHECKS.md) — scope, evidence, and limitations of workflow analysis.
- [Installation and local skill setup](docs/INSTALLATION.md) — clean consumer setup, supported paths, and privacy limitations.
- [External validation](docs/EXTERNAL_VALIDATION.md) — pinned public repository audits, regression findings, and known gaps.
- [Agent validation](docs/AGENT_VALIDATION.md) — live Copilot CLI evidence, human approval, negative paths, and host limitations.

## Contributing

RepoTend is at an early design stage. Discussions, examples of frustrating repository maintenance tasks, and proposals for **small, verifiable rules** are welcome.

When suggesting a rule, please describe the evidence it can inspect, where it applies, likely false positives, and whether remediation can be safe and automatic. See [CONTRIBUTING.md](CONTRIBUTING.md) for development and PR conventions, [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations, and [SECURITY.md](SECURITY.md) for vulnerability reporting. Do not report security details publicly.

## License

RepoTend is licensed under the [Apache License 2.0](LICENSE).
