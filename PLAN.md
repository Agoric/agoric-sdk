# PLAN.md: Boot Proposal Extraction Refactor + Caching

## Summary
Implement a new in-process proposal extraction path for `/Users/turadg/.codex/worktrees/6959/agoric-sdk/packages/boot/tools/supports.ts`, add persistent dependency-aware caching on disk, and allow test callsites in `/Users/turadg/.codex/worktrees/6959/agoric-sdk/packages/boot/test/` to evolve for simpler/faster usage.  
No-shelling is treated as a strong preference (`SHOULD`), not a hard requirement (`MUST`), so we will keep an explicit fallback path.

## Scope and outcomes
1. `buildProposal` in boot tests no longer rebuilds proposal artifacts unnecessarily.
2. Cached proposal materials persist across process runs until invalidated by dependency updates.
3. `agoric-cli` gets a reusable in-process export for proposal building, suitable for tests.
4. A compatibility fallback to shell execution remains available if in-process execution cannot build a given script.
5. Initial implementation may still read generated files; future work item is queued to eliminate `plan.json` dependency for metadata extraction.

## Public API / interface changes
1. Add `/Users/turadg/.codex/worktrees/6959/agoric-sdk/packages/agoric-cli/src/proposals.js` with:
   `buildCoreEvalProposal({ builderPath, args, cwd, mode, cacheDir, fs, now, console })`.
2. Export it from `/Users/turadg/.codex/worktrees/6959/agoric-sdk/packages/agoric-cli/package.json`:
   `"./src/proposals.js": "./src/proposals.js"`.
3. Refactor `/Users/turadg/.codex/worktrees/6959/agoric-sdk/packages/boot/tools/supports.ts`:
   `makeProposalExtractor` delegates to `buildCoreEvalProposal`.
4. Keep `buildProposal` external return shape unchanged for tests:
   `{ evals, bundles }`.
5. Add optional mode in boot extractor options:
   `mode: 'prefer-in-process' | 'in-process-only' | 'shell-only'` with default `prefer-in-process`.

## Caching design
1. Cache root:
   `/Users/turadg/.codex/worktrees/6959/agoric-sdk/.cache/boot-proposal-build/v1`.
2. Cache key input:
   resolved builder absolute path, args array, mode, schema version.
3. Cache record files per key:
   `metadata.json` and `materials.json`.
4. `materials.json` contains serialized `{ evals, bundles }`.
5. `metadata.json` contains:
   builder path, args, createdAt, dependency fingerprints, tool version marker.
6. Invalidation rule:
   recompute dependency fingerprints and compare to metadata; mismatch forces rebuild.
7. Fingerprinting source:
   bundle-cache-derived hashes for bundle entrypoints when available; fallback to file digest for files not covered.
8. Concurrency:
   in-process Promise dedupe map keyed by cache key plus cross-process lock directories with stale-lock recovery, patterned after `/Users/turadg/.codex/worktrees/6959/agoric-sdk/packages/SwingSet/tools/bundleTool.js`.
9. Atomic writes:
   write temp files then rename to final paths.

## Implementation steps
1. Create `/Users/turadg/.codex/worktrees/6959/agoric-sdk/PLAN.md` with this plan content.
2. Implement `agoric-cli` proposal builder module that can execute builder scripts in-process (reusing `makeScriptLoader` patterns from `/Users/turadg/.codex/worktrees/6959/agoric-sdk/packages/agoric-cli/src/scripts.js`).
3. Add read-and-materialize helper that collects generated permit/script/bundle payloads into `{ evals, bundles }`.
4. Implement cache manager under boot tools with:
   keying, metadata, material persistence, locking, invalidation, and metrics logging.
5. Replace shell-only behavior in `makeProposalExtractor` with `prefer-in-process` strategy:
   try in-process, fallback to shell when configured and needed.
6. Preserve current `buildProposal` call contract for test code.
7. Optionally simplify boot test callsites where repeated proposal builds happen:
   hoist shared `buildProposal(...)` promises into `before` hooks when beneficial.
8. Add targeted docs/comments in modified files explaining cache semantics and invalidation behavior.

## Tests and scenarios
1. Unit tests for cache hit/miss:
   first build miss, second build hit, process restart hit.
2. Invalidation test:
   modifying a dependency source file invalidates cache and rebuilds.
3. Locking test:
   stale lock is recovered and build proceeds.
4. In-process vs fallback test:
   `prefer-in-process` uses in-process path; fallback mode can still shell when forced.
5. Regression test:
   existing boot orchestration tests still pass with unchanged behavior of `evalProposal(buildProposal(...))`.
6. Optional callsite-adjusted tests:
   ensure hoisted/shared build promises produce identical eval output.

## Future queued work
1. Remove dependence on reading `*-plan.json` metadata by capturing proposal metadata directly from JS execution (`writeCoreEval` call flow) and passing it through structured in-memory callbacks.
2. Extend `deploy-script-support` hooks so proposal descriptors and bundle refs can be observed in-process without disk scan.
3. Move toward full in-memory material extraction (only persisting final cache artifacts), reducing filesystem coupling and improving speed.

## Assumptions and defaults
1. Boot package has no external API commitment, so internal test helper and callsite refactors are allowed.
2. In-process path is default; shell path exists strictly as compatibility fallback.
3. Over-invalidation is acceptable; under-invalidation is not.
4. Cache schema versioning will be explicit (`v1`) to allow non-breaking future migration.
