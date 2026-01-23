# Testing

## Overview
Use this when running or adding tests.

## Rules
- Test framework: AVA.
- Test files follow `**/test/**/*.test.*` within each package.
- Run all tests from repo root: `yarn test`.
- Run per-package tests by running `yarn test` from that package directory.
- For coverage in a package: run `yarn test:c8` and open `coverage/html/index.html` after `yarn c8 report --reporter=html-spa`.
- For faster typecheck after changes: `yarn run -T tsc --noEmit --incremental`.
- Watch mode for type errors in active workspaces:
  `yarn run -T tsc --noEmit --incremental --watch --preserveWatchOutput`
