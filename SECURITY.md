# Security Policy

RepoTend is early-stage software. Do not rely on the experimental audit as a complete security assessment, and do not run it with unnecessary elevated privileges.

## Reporting a vulnerability

**Please do not share exploit details, credentials, or confidential reports in public GitHub issues or pull requests.**

If GitHub's **Report a vulnerability** option is available under the repository's **Security** tab, use it to file a private report. If that option is unavailable, contact the maintainers through an available private channel listed on their GitHub profiles. If no private channel is available, open a non-sensitive issue asking for a private reporting route, without disclosing the vulnerability.

Include affected versions/commits, impact, minimal reproduction, and suggested mitigation when safe to share. Maintainers will assess reports and coordinate fixes and public disclosure as appropriate. No response-time guarantee is currently offered.

## Scope

The bootstrap self-audit is read-only, uses standard Node.js modules, and does not execute inspected project scripts. Running an agent skill can also involve an agent provider; review that host's privacy and permissions before exposing private repository contents.
