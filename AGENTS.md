# Repository Guidelines

per https://agents.md/

## Project Structure & Module Organization
- Monorepo managed by Yarn workspaces and Lerna Lite. Primary code lives under `packages/*` (e.g., `SwingSet`, `zoe`, `ERTP`, `smart-wallet`).
- Go components are under `golang/` (e.g., `golang/cosmos`).
- Tests reside per package in `packages/<name>/test/`.
- Utilities, CI and developer tooling scripts are in `scripts/`. Integration assets live in `a3p-integration/` and `multichain-testing/`.

## Build, Test, and Development Commands
- `corepack enable && yarn install`: Set up the repo with the pinned Yarn version and install dependencies.
- `yarn build`: Build all workspaces (generates kernel bundles where needed).
- `yarn test`: Run unit tests across all packages (AVA).
- `yarn lint` | `yarn lint-fix`: Check or auto-fix lint issues across packages.
- `yarn run -T tsc --noEmit --incremental`: Fast typecheck within a package; do this after changes.
    - Watch mode for type errors in active workspaces: run `yarn run -T tsc --noEmit --incremental --watch --preserveWatchOutput` in the workspace(s) being edited, and keep the terminal output visible so Codex can monitor errors.
- `yarn typecheck-quick` to do a fast typecheck over the whole repo (4-7 seconds)
- `yarn format`: Format code via dprint; `yarn lint:format` to check only.
- Git hooks: installed by `scripts/install-git-hooks.sh`.
  - Install or refresh hooks with `yarn hooks:install`.
  - Pre-commit runs `scripts/git-hooks/pre-commit-dprint.sh`, which formats only staged JS/TS files with the pinned local binary `./node_modules/.bin/dprint` and re-stages them.
- `./scripts/env-doctor.sh`: Verify toolchain (Node, Go, compiler) versions.
- Example, single package: `cd packages/eventual-send && yarn test`.
- Packing/debugging workflow:
  - Full sequential prepack pass across publishable packages: `yarn lerna run --reject-cycles --concurrency 1 prepack`
  - If a package fails, fix it and verify locally in that package with `yarn postpack && yarn prepack`
  - Resume from the failed package and include dependents needed for validation: `yarn lerna run prepack --since <failed-package-name> --include-dependencies --concurrency 1 --reject-cycles`
  - After any prepack run, clean generated artifacts and restore package trees with: `yarn lerna run --reject-cycles --concurrency 1 postpack`

## Coding Style & Naming Conventions
- ESM by default; JS and TypeScript both used. Target Node ^20.9 or ^22.11.
- dprint enforced (Prettier-compatible options include single quotes and trailing commas).
- ESLint configured via `eslint.config.mjs` (includes AVA, TypeScript, JSDoc, and repository-specific rules).
- Package names: publishable packages use `@agoric/*`; private/local packages use `@aglocal/*` (verify with `yarn lint:package-names`).
- `@aglocal` packages are private and never published; `@agoric` packages are published and may only depend on published packages, so `@agoric` packages must never import `@aglocal` packages.
- For elapsed duration measurement (benchmarks, latency logs, monotonic timeout windows), prefer `performance.now()` over `Date.now()`. Use `Date.now()` for wall-clock timestamps, IDs, and protocol deadlines.
- Entrypoints vs modules
    - Keep ambient authority (e.g., `process.env`, `console`, filesystem, network) in entrypoints
    - pass explicit capabilities (e.g., `io.console`) into shared JS modules.
    - Never `@endo/init` in modules; best practice is at the beginning of an entrypoint

## Testing Guidelines
- Framework: AVA. Test files follow `**/test/**/*.test.*` within each package.
- Run all: `yarn test`. Per-package: `yarn test` from that package directory.
- Coverage: in a package, run `yarn test:c8` and open `coverage/html/index.html` after `yarn c8 report --reporter=html-spa` if needed.

## A3P Container & Proposal Build Notes
- A3P tests run inside a Docker container built from an agoric-sdk checkout, so the container can access the full repo filesystem, not just published npm packages.
- The container’s canonical agoric-sdk checkout is based on the last formal release, so any workspace updates needed by A3P must be copied into the image and resolved correctly.
- A3P supports building proposals from agoric-sdk `HEAD` and copying the artifacts into the image
   - this avoids copying all sources needed to build proposals.
   - it's configured by `agoricProposal.sdk-generate` in the proposal package.json
   - it's performed by `a3p-integration/build-submission.sh`

## Commit & Pull Request Guidelines
- Use Conventional Commits in titles and commits (e.g., `feat(swingstore): add snapshot…`).
- Branches should reference an issue number (e.g., `123-fix-solo-reconnect`).
- PRs: link related issues, describe changes and risks; ensure `yarn build`, `yarn test`, and `yarn lint` pass. Prefer “Squash and merge.”
- Integration tests: use labels `force:integration`/`bypass:integration` when appropriate; otherwise they run as part of the merge queue.
- Commit hygiene (codegen, lockfile updates, formatting, linting, tests): see `docs/commit-hygiene.md`.
