# Changelog

RepoTend follows [Semantic Versioning](https://semver.org/). Entries describe shipped source capabilities; a release is not published until a corresponding Git tag and GitHub Release exist.

## [0.1.0] — Initial experimental release

The first experimental release targets solo maintainers and small GitHub open-source projects. All audits are advisory by default.

### Added

- A portable Agent Skill that has been exercised in a real, constrained GitHub Copilot CLI session, plus a copied-skill installer with pinned runtime dependencies.
- Thirteen repository checks covering contribution conventions, basic developer experience, GitHub Actions structure, CI-efficiency recommendations, and workflow-security heuristics.
- A deterministic TypeScript rules engine with Markdown and JSON audit reports, optional policy configuration, explicit opt-in enforcement for verified checks, and documented suppressions with optional UTC expiration.
- Conservative remediation for two missing files: a PR template and a minimal EditorConfig. Preview is read-only; applying requires a reviewed SHA-256 plan ID and explicit approval. Existing files are not overwritten.
- Versioned v0.1 report and remediation JSON Schemas, rule documentation, dogfooding, and external audits of two pinned public repositories.
- A read-only release preflight that checks package/lockfile/runtime version alignment, local JSON Schema targets, clean self-audit, and empty self-remediation preview.
- A separate, explicitly opt-in GitHub settings verifier for required-check context around path-filtered jobs, using an existing authorized `gh` connection and preserving inaccessible-policy uncertainty and local warnings.

### Known limitations

- GitHub Actions checks are static, often heuristic, and do not constitute a full `actionlint` validation, security audit, or CI savings measurement.
- The default audit cannot inspect remote GitHub settings or inherited organization community defaults. Optional required-check verification is limited to readable branch rules/protection and exact static job names; it does not verify actual runs or overall enforcement.
- Copilot CLI discovery, approval, and remediation were validated on one documented macOS host configuration; personal-directory discovery, cloud workspaces, native Windows, and other AI hosts remain unverified.
- Installation uses a source checkout and Node.js 22.16+; RepoTend is not published to npm and does not ship a standalone executable.
- The configuration reader intentionally accepts a documented subset of YAML. RepoTend does not run audited project scripts.

### Compatibility

- Report and remediation payloads use `schemaVersion: "0.1"`; the runtime audit reports `toolVersion: "0.1.0"`.
- These v0.1 schemas are available under `schemas/`. Their URLs use the intended `v0.1.0` tag and must be checked once that tag is created.
- See [installation](docs/INSTALLATION.md), [rule catalog](docs/RULE_CATALOG.md), [report contract](docs/REPORT_CONTRACT.md), and [release notes](docs/RELEASE_NOTES_V0.1.0.md).

### Upgrading

No previous public release exists. To replace a copied skill installation, follow the uninstall/reinstall instructions in [installation](docs/INSTALLATION.md). Keep the audited repository separate from RepoTend's dependencies; do not execute its project scripts as part of an audit.
