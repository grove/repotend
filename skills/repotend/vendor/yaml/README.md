# Vendored YAML parser

This directory contains the runtime source dependencies of [yaml](https://github.com/eemeli/yaml) **v2.8.1**, copied from the upstream `v2.8.1` tag. The code is distributed under the ISC license in `LICENSE`.

RepoTend imports `LineCounter`, `isNode`, and `parseDocument` from these local sources so installing the skill through the Skills CLI requires no separate `npm install` or dependency download. Node.js 22.16+ runs the TypeScript source using RepoTend's `--experimental-strip-types` compatibility launcher.

When upgrading YAML, re-vendor the dependency tree from a reviewed upstream release, retain its license, and rerun the workflow and installed-skill tests. Do not edit vendored sources in place.
