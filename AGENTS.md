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
- `yarn format`: Format code via Prettier; `yarn lint:format` to check only.
- `./scripts/env-doctor.sh`: Verify toolchain (Node, Go, compiler) versions.
- Example, single package: `cd packages/eventual-send && yarn test`.

## Coding Style & Naming Conventions
- ESM by default; JS and TypeScript both used. Target Node ^20.9 or ^22.11.
- Prettier enforced with single quotes; 2-space indentation.
- ESLint configured via `eslint.config.mjs` (includes AVA, TypeScript, JSDoc, and repository-specific rules).
- Package names: publishable packages use `@agoric/*`; private/local packages use `@aglocal/*` (verify with `yarn lint:package-names`).

## Testing Guidelines
- Framework: AVA. Test files follow `**/test/**/*.test.*` within each package.
- Run all: `yarn test`. Per-package: `yarn test` from that package directory.
- Coverage: in a package, run `yarn test:c8` and open `coverage/html/index.html` after `yarn c8 report --reporter=html-spa` if needed.

## Commit & Pull Request Guidelines
- Use Conventional Commits in titles and commits (e.g., `feat(swingstore): add snapshot…`).
- Branches should reference an issue number (e.g., `123-fix-solo-reconnect`).
- PRs: link related issues, describe changes and risks; ensure `yarn build`, `yarn test`, and `yarn lint` pass. Prefer “Squash and merge.”
- Integration tests: use labels `force:integration`/`bypass:integration` when appropriate; otherwise they run as part of the merge queue.

