# Spike: per-package integration test workspaces

## Motivation

Some tests in leaf workspaces (for example `@agoric/vats`) are integration-level
because they exercise bootstrap behaviors and runtime assembly instead of a
single unit. Keeping those tests in the leaf package hides dependency edges and
makes affected-test analysis harder.

This spike demonstrates a pattern that keeps the package graph honest by moving
integration tests into a separate unpublished workspace.

## Pattern

For a publishable package `@agoric/<name>`, add an unpublished integration
workspace `@aglocal/<name>-integration`.

In this spike:

- `@aglocal/vats-integration` depends on `@agoric/vats`.
- A bootstrap-oriented test moved from `packages/vats/test` to
  `packages/vats-integration/test`.
- Integration-only dependencies stay in the integration workspace instead of the
  publishable package test tree.

## Requirements for incremental adoption

### MUST

- MUST keep publishable package names under `@agoric/*` and integration
  workspaces under `@aglocal/*`.
- MUST keep runtime/manifest/boot-dependent tests in integration workspaces.
- MUST avoid adding `@aglocal/*` dependencies to `@agoric/*` packages.
- MUST keep each integration workspace runnable with a single command
  (`yarn workspace <pkg> test`).

### SHOULD

- SHOULD move only clearly integration-level tests first (no flag day).
- SHOULD preserve existing test semantics while relocating tests.
- SHOULD document why moved tests are integration-level.
- SHOULD keep unit tests in the original publishable package.

## Why this helps affected-test analysis

Once integration tests live in distinct `@aglocal/*-integration` workspaces,
the workspace dependency graph directly shows that those tests depend on boot and
manifest plumbing. A future affected-test tool can traverse workspace and import
edges without inferring hidden runtime dependencies from ad-hoc test code.
