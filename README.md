# RepoTend

**Good practices. Healthy repositories. Less maintenance.**

RepoTend is an open-source, AI-assisted toolkit for maintaining healthy **small GitHub repositories**. It helps maintainers audit engineering practices, understand actionable findings, and make safe, reviewable improvements—without introducing enterprise-scale process.

> **Project status: experimental / pre-v0.1.** An initial read-only self-audit script and portable Agent Skill live in this repository. They cover eight narrow checks, **not** the planned v0.1 feature set. The capabilities below describe the broader intended first release.

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

Node.js 22+ is sufficient; there are no third-party dependencies:

```sh
node --test
node skills/repotend/scripts/audit.mjs --format markdown
node skills/repotend/scripts/audit.mjs --format json
```

For a different repository, pass `--root /path/to/repository`. The skill lives at [skills/repotend/SKILL.md](skills/repotend/SKILL.md). See [dogfooding policy and limitations](docs/DOGFOODING.md). All bootstrap checks are advisory; this is not yet a general CI validator or security scanner.

### Planned agent experience

After installing the skill in a compatible agent, a maintainer could ask:

> Audit this repository with RepoTend. Explain the three highest-value improvements, and prepare a patch for the ones that are safe to apply.

The experimental skill can invoke the bundled validator; its compatibility with specific agent hosts still requires validation. A standalone CLI and a reusable GitHub Action are possible later interfaces; they are **not** v0.1 prerequisites.

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
- [Implementation plan](docs/IMPLEMENTATION_PLAN.md) — milestones, initial rule backlog, acceptance criteria, and non-goals.
- [Dogfooding](docs/DOGFOODING.md) — current self-audit rules and their limitations.

## Contributing

RepoTend is at an early design stage. Discussions, examples of frustrating repository maintenance tasks, and proposals for **small, verifiable rules** are welcome.

When suggesting a rule, please describe the evidence it can inspect, where it applies, likely false positives, and whether remediation can be safe and automatic. See [CONTRIBUTING.md](CONTRIBUTING.md) for development and PR conventions, [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations, and [SECURITY.md](SECURITY.md) for vulnerability reporting. Do not report security details publicly.

## License

RepoTend is licensed under the [Apache License 2.0](LICENSE).
