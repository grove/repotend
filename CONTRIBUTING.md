# Contributing to RepoTend

Thanks for helping maintain small open-source repositories. We welcome bug reports, small improvements, documentation fixes, and well-motivated rules.

## Before opening a PR

- For a bug, include reproduction steps, expected behavior, and observed behavior.
- For a new rule, explain its **evidence**, **applicability**, **likely false positives**, and **safe remediation**. Start a feature issue for larger proposals.
- Keep changes narrowly scoped. Avoid adding a dependency or process unless it pays for itself in a small repository.
- Review [design principles](docs/DESIGN.md) and [dogfooding policy](docs/DOGFOODING.md).

## Development

The experimental self-audit requires Node.js 22.16+ and installs its small, pinned dependency set using npm.

```sh
npm ci --ignore-scripts
npm run format:check
npm run lint
npm test
node skills/repotend/scripts/audit.mjs --format markdown
node skills/repotend/scripts/audit.mjs --format json
node skills/repotend/scripts/remediate.mjs # read-only preview
```

Static audit and remediation preview never run target-repository code or change files. Applying a remediation requires a reviewed plan ID and explicit approval. The current engine contains basic static checks, not the complete v0.1 feature set. See [workflow check limitations](docs/WORKFLOW_CHECKS.md).

When implementing rules, add positive, negative, and ambiguous fixtures. Never confuse a missing capability with a PASS. Describe limitations in the resulting finding. Update the [rule catalog](docs/RULE_CATALOG.md) and [JSON report contracts](docs/REPORT_CONTRACT.md) if you change rule IDs, statuses, or output fields.

Run `npm run format` to apply the project’s small, documented whitespace/JSON normalization. The formatter intentionally preserves Markdown hard-line breaks; `npm run format:check` checks for drift. The lean `npm run lint` gate checks JavaScript/YAML syntax and TypeScript types without pulling in a large lint dependency graph. It is **not** a full ESLint or Prettier rule set.

For project-specific exceptions, prefer a documented `.repotend.yml` suppression with a reason and optional expiry to disabling the rule silently. See [configuration](docs/CONFIGURATION.md).

## GitHub conventions

- PR title: prefer Conventional Commit style, e.g. `docs: clarify setup`, `feat(rules): check missing templates`.
- Commit messages: prefer the same convention, but intermediate commits need not be perfect; squash merging is welcome.
- PR body: describe **why**, **what**, and **testing**, and link related issues when available.
- Issues: use the bug or feature forms. Avoid creating overlapping labels or bookkeeping-only tasks.
- CI: changes must pass the lightweight unit tests and advisory self-audit. Warnings do not block merges.

## Code of conduct and security

Follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Do not disclose vulnerabilities in a public issue; see [SECURITY.md](SECURITY.md).
