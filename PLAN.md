# Plan: Move portfolio vstorage schema into portfolio-api and add client helpers

## Goals
- Make the vstorage schema (paths, shapes, and derived state rules) part of `portfolio-api` so external services can depend on it instead of pulling from `portfolio-contract`.
- Provide client-facing helpers in `portfolio-api` to read vstorage entries and infer coherent state even when data is split across paths or arrives in different orders.

## Current findings
- Vstorage path builders and pattern guards live in `packages/portfolio-contract/src/type-guards.ts` (`makePortfolioPath/makePositionPath/makeFlowPath`, `PortfolioStatusShapeExt`, `PositionStatusShape`, `FlowStatusShape`, etc.) and are used directly by tests and downstream services (`services/ymax-planner/src/engine.ts` uses `PortfolioStatusShapeExt` and `flowIdFromKey` alongside separate vstorage queries).
- Flow lifecycle data is split: the contract writes `flowsRunning` on the portfolio node before emitting a `flows.flowN` node, so consumers infer an “init/planning” state by combining `flowsRunning` with the child paths; `engine.ts` currently does this by checking `flowsRunning` versus `flows.*` children.
- Client/test utilities duplicate path logic: `packages/portfolio-contract/tools/portfolio-actors.ts` builds position paths manually, and `multichain-testing/test/ymax0/ymax-deploy.test.ts` parses portfolio IDs from paths.
- No `portfolio-api` module currently surfaces the vstorage schema; it only defines TypeScript types and minimal guards (`src/type-guards.ts`).

## Plan

2) **Move existing schema references to the new module**
   - Refactor `portfolio-contract` to import the schema helpers from `@agoric/portfolio-api` rather than defining them locally; breaking changes to `@aglocal/portfolio-contract/src/type-guards.ts` are acceptable (no compatibility shim needed).
   - Update downstream consumers (planner `services/ymax-planner`, deploy/tests, and `tools/portfolio-actors.ts`) to import from `portfolio-api` instead of the contract package.

3) **Add derived-state utilities for clients**
   - Implement helper(s) in `portfolio-api` that read vstorage via `VstorageKit`/`chainStorageWatcher` style interfaces and return a normalized snapshot combining:
     - Portfolio status (including `flowsRunning`) from the portfolio node.
     - Flow nodes (`flows.flowN`, `flows.flowN.steps`, `flows.flowN.order`) when present.
     - Derived flow states that mark flows as `init`/`planning` when present in `flowsRunning` but missing child nodes (covers the “flowsRunning written first” case).
   - Provide functions to materialize positions using `positionKeys` and `positions.*` nodes, and utilities to join records by pool/chain for UIs and services.
   - Scope (now): only the latest entry per vstorage node. Future work: optional helpers to walk historical entries for replay / richer test coverage.

4) **Reduce duplicated path handling**
   - Replace ad hoc path assembly/parsing in test utilities (`portfolio-actors`, `multichain-testing`, planner) with the new helpers to ensure consistent behavior and easier upgrades to path conventions.
   - Document the expected topology of vstorage under `published.<instance>.portfolios.*` and the event-vs-relational nature of updates (e.g., flow nodes accumulate history, portfolio node is current state).

5) **Tests and documentation**
   - Add unit tests in `portfolio-api` for the new schema/derived-state helpers using fixture capdata derived from existing contract snapshots.
   - Update `packages/portfolio-api/README.md` to describe how to read portfolio data, detect in-progress flows, and interpret flow histories; include examples for “init” flows where `flowsRunning` has an entry but `flows.flowN` is not yet present.

## Risks / open questions
- Avoid circular dependencies: confirm `portfolio-api` can import the necessary pattern utilities without pulling in contract code.
- Backward compatibility: not required for `@aglocal/*`; we can break `@aglocal/portfolio-contract/src/type-guards.ts` while moving schema into `portfolio-api`.
- Data retention: current scope is latest-per-node; follow-up work should add history/replay helpers for production vstorage stores and tests.
