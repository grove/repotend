# RepoTend v0.1.0 — Initial experimental release

**Good practices. Healthy repositories. Less maintenance.**

RepoTend is a small-project-first, AI-assisted repository health toolkit for GitHub. Its first release combines a deterministic audit engine with a portable Agent Skill: audit a repository, understand evidence-based recommendations, preview safe improvements, and only apply a reviewed change after explicit approval.

## Highlights

- **13 focused checks:** project conventions, GitHub Actions workflow structure, concurrency and trigger heuristics, action pinning, permissions, and EditorConfig presence.
- **Safe by default:** read-only auditing, advisory warnings, separate tool errors, and per-rule opt-in enforcement or justified suppressions with optional expiry.
- **Two reviewable fixes:** add a missing PR template or minimal EditorConfig, with exact diffs, a reviewed-plan digest, guarded application, and verification.
- **Agent integration:** a copied skill installer, pinned runtime dependencies, and a documented successful GitHub Copilot CLI live session covering discovery, audit, preview, denial, human approval, and verification.
- **Machine-readable results:** JSON Schema v0.1 contracts and Markdown reporting, plus deterministic fixture and external-repository tests.

## Install from the tagged source

After the `v0.1.0` tag is published, use a separate source checkout (Node.js **22.16+**, npm, and Git required):

```sh
git clone --depth 1 --branch v0.1.0 https://github.com/grove/repotend.git "$HOME/repotend-tool"
cd "$HOME/repotend-tool"
node scripts/install-skill.mjs --dest "$HOME/.copilot/skills/repotend"
```

Start GitHub Copilot CLI in the repository you want to inspect, then ask:

> Audit this repository with RepoTend. Explain verified findings separately from heuristic recommendations. Do not change files.

The deterministic audit works without an AI agent. Details, alternate installation layouts, troubleshooting, and safe remediation commands are in [installation](INSTALLATION.md) and [remediation](REMEDIATION.md). If the destination already exists, use the documented update procedure rather than overwriting it.

## Support and limitations

RepoTend v0.1.0 is **experimental**, not a comprehensive code-quality scorer, security certification, or autonomous CI optimizer. Workflow checks use YAML-aware static analysis, not complete GitHub Actions semantics or historical runner-minute data. Remote organization/repository settings and inherited templates are not inspected. The Copilot acceptance run covers a particular macOS/CLI configuration; other agent hosts and native Windows remain unverified.

The npm package is intentionally private; distribution is through GitHub source and the included installer. No default telemetry or hosted service is required. The validator never runs an audited project's scripts.

For detailed findings and examples see [rule catalog](RULE_CATALOG.md), [report contract](REPORT_CONTRACT.md), and [agent validation](AGENT_VALIDATION.md).

## What's next

Prioritize feedback from small-project maintainers, false-positive reductions, broader agent-host support, GitHub API context for inherited policies, and evidence-based CI optimization. Testing-pyramid analytics and cross-repository dashboards are not part of this release.
