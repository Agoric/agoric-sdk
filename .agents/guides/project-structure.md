# Project Structure

## Overview
Use this when you need to locate modules, tests, or tooling within the repo.

## Rules
- Monorepo managed by Yarn workspaces and Lerna Lite.
- Primary JS/TS packages live under `packages/*` (e.g., `SwingSet`, `zoe`, `ERTP`, `smart-wallet`).
- Go components live under `golang/` (e.g., `golang/cosmos`).
- Tests are co-located per package in `packages/<name>/test/`.
- Utilities, CI, and developer tooling scripts live in `scripts/`.
- Integration assets live in `a3p-integration/` and `multichain-testing/`.
