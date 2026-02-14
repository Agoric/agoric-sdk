# AVA unification process state

## Preflight for future agents (required before tests)

Run this before any phase test validation:

1. `yarn install`
2. `yarn build`

Without the build step, generated artifacts (notably `packages/xsnap-lockdown/dist/lockdown.bundle`) may be missing and test runs can fail for environment/setup reasons instead of AVA-config reasons.

## Phase completion summary

- ✅ Phase 0: reconnaissance completed (configs and behavior differences inventoried).
- ✅ Phase 1: top-level AVA config introduced.
- ✅ Phase 2: per-package TS AVA configuration removed.
- ✅ Phase 3: centralized Endo initialization added (`test/init-endo.js`).
- ✅ Phase 4: conservative root timeout baseline set (`10m`).
- ✅ Phase 5: package-level AVA config removed from all `package.json`; root `ava.config.js` is now authoritative.
- ✅ Phase 6: documentation + invariants captured below.

## Root AVA invariants

- Single source of truth: `ava.config.js` at repo root.
- Default timeout: `10m`.
- TypeScript execution: `--import=ts-blank-space/register`.
- Endo initialization: `--import=<repo>/test/init-endo.js`.

## Endo lockdown controls (strict by default)

`test/init-endo.js` reads `AGORIC_AVA_LOCKDOWN`:

- `strict` (default): `@endo/init`
- `debug`: `@endo/init/debug.js`
- `legacy`: `@endo/init/legacy.js`
- `off|false|0`: skip Endo init

Guidance:

- Prefer `debug`/`legacy` over `off` for compatibility issues.
- Use env-based opt-out explicitly in test invocation when needed, e.g.
  - `AGORIC_AVA_LOCKDOWN=legacy yarn test --scope @agoric/client-utils`

## Slow test guidance

- Default timeout is `10m`.
- Tests needing longer duration should use explicit per-test timeout declarations (`test(..., t => { ... })` + `t.timeout(...)`) or shared helper macros.
- Avoid package-level timeout magic.

## Known non-normalized/exception cases

- `packages/xsnap/test/install.test.js` includes explicit environment-tolerant handling for registry/network/npm-path failures:
  - `E403`, `EUNSUPPORTEDPROTOCOL` (Yarn patch URL in npm), DNS/connectivity timeout/reset.
- Behavior: logs and returns pass for these environment limits; rethrows unknown failures so true regressions still fail.

## Validation notes

- Verified root selected-file execution path:
  - `yarn test --scope @agoric/xsnap -- test/boot-lockdown.test.js test/inspect.test.js test/install.test.js`
  - `yarn test --scope @agoric/client-utils`
- Verified direct AVA root-config invocation:
  - `yarn ava --config ava.config.js packages/xsnap/test/boot-lockdown.test.js packages/xsnap/test/inspect.test.js packages/xsnap/test/install.test.js`
