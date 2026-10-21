---
name: syncing-endo-dependencies
description: >
  Advance the agoric-sdk monorepo to a newer @endo/ses release and repair the lockfiles and
  resolutions a plain install leaves broken. Use for an "Endo sync", when `yarn build-lockfiles`
  fails for a3p-integration with YN0071 link conflicts, when an Endo bump duplicates a transitive
  dep (e.g. two `ava` versions) and breaks tests, or when a portal'd package won't link under
  `@agoric/*@dev` parents.
license: Apache-2.0
---

# Syncing Endo dependencies

An "Endo sync" advances `agoric-sdk` to a newer release of the [Endo](https://github.com/endojs/endo)
monorepo (`@endo/*` packages and `ses`). The hard part is **not** bumping the versions — it is
that the bump produces dependency-graph states a plain `yarn install` cannot reach, because:

- published `@agoric/*@dev` packages still **lock** the old `@endo` graph, while local **portal**
  resolutions pull the new one, and the two can't link under the same parent; and
- `yarn install` keeps already-locked versions inside caret ranges instead of bumping them.

The result is failures that surface far from the version bump — in sub-project lockfiles, in
portal'd packages, and as duplicated transitive deps that break tests. This skill is the checklist
for getting from "bumped the versions" to "all lockfiles green."

## Scope & when to activate

**Activate for:** bumping `@endo/*` / `ses` across the monorepo; repairing `yarn build-lockfiles`
failures after such a bump; diagnosing duplicate-dependency breakage introduced by an Endo bump;
fixing portal'd packages that won't link under `@agoric/*@dev` parents; mirroring a parallel
Endo-bump PR (e.g. a Copilot/maintainer sync PR) into this repo.

**Do not activate for:** ordinary single-package dep bumps unrelated to Endo; distribution-side
patching; carrying local patches against deps (that's `maintaining-dependency-patches`).

## The two failure modes

Every Endo-sync repair traces back to one of these:

1. **Stale locked `@endo` versions.** `yarn install` won't advance an `@endo/*` already locked in
   range. You must explicitly `yarn up` the Endo deps per workspace/sub-project so the tree
   dedupes to one version. Plain install is a silent no-op here.

2. **Portal vs. published-`dev` conflict.** A local package is portal'd in (so it carries the *new*
   Endo graph), but a published `@agoric/*@dev` parent still pins the *old* graph. Yarn refuses to
   link the child under the old-pinned parent → `YN0071 Cannot link … conflicts with parent
   dependency`. Fix by also pinning the conflicting Endo libs (and, where bundle hashes are
   involved, portal'ing the bundler too) so there is a single resolved version.

## Lockfile sync procedure

The gate is `scripts/update-package-locks.sh`, run via **`yarn build-lockfiles`**, enforced by the
`check-lockfiles` CI job. It runs `yarn install` per lockfile across the repo and its sub-projects.
For the root workspace a normal install suffices, but **for a3p-integration and other sub-projects
the script's install step is insufficient** — it hits the failure modes above. Repair them by hand:

### a3p-integration root

In `a3p-integration/package.json` `resolutions`:

- Keep the `@endo/bundle-source` **portal**, and **add an `@endo/compartment-mapper` portal** —
  both feed bundle hashes, so both must be local to keep hashes consistent.
- **npm-pin the runtime libs the new compartment-mapper drags in** so the tree dedupes to one
  version: typically `@endo/errors`, `@endo/promise-kit`, `@endo/zip`, `ses`. The exact set
  depends on what the new compartment-mapper requires (e.g. `errors`/`zip` were needed for
  compartment-mapper 2.3.0 but not in an earlier sync) — add pins until the conflict clears.

### Per-proposal and multichain-testing

- **Each a3p proposal directory has its OWN `yarn.lock`** (e.g. `proposals/z:acceptance`), separate
  from `a3p-integration/yarn.lock`. In each proposal dir **and** in `multichain-testing`, run
  `yarn up ses '@endo/*' -R` to advance Endo within ranges. Do **not** rely on a plain `install`.
- Proposals that pull the `agoric` CLI at `dev` (e.g. `n:upgrade-next`) need
  `"agoric": "portal:../../agoric-sdk/packages/agoric-cli"` added — the `dev` tag can resolve to an
  older snapshot than other `@agoric/*@dev`, pinning a stale compartment-mapper. (The
  `a3p-integration/agoric-sdk -> ../` symlink created at prepare-test time makes the
  `../../agoric-sdk/...` path resolve back to this repo.)

### Removing a dep or resolution from an a3p proposal — check first

Portal'd SDK packages bring their full `workspace:*` dependency lists, so a resolution that looks
unused at the a3p root may be **required** by a proposal's lock. Example: `agoric` (agoric-cli) is
portal'd into proposals and declares `"@agoric/inter-protocol": "workspace:*"`, so dropping a
proposal's inter-protocol portal resolution breaks resolution ("Workspace not found") even though
the proposal imports nothing from it. **Before removing**, grep that proposal's own `yarn.lock` for
the package and check which portal'd SDK packages list it as `workspace:*`.

## Portal paths must be in-repo relative

In `multichain-testing/package.json` (and similar sub-projects), portal `resolutions` must use
in-repo relative paths — `portal:../packages/X`, `portal:../node_modules/@endo/bundle-source` —
**never** `portal:../../agoric-sdk/packages/X`. The latter hardcodes the parent dir name
`agoric-sdk`: it only loops back to *this* repo in a checkout literally named `agoric-sdk`. In a git
**worktree** or a differently-named clone it silently points at a *sibling* checkout, the wrong
locator gets baked into the lock, and `yarn install` treats it as already-satisfied — so the lock
"won't update" to local changes. The bug is invisible in the canonical `agoric-sdk` checkout (and
thus passes CI there). If a sub-project's lock won't reflect local package changes, grep its
`package.json` for `agoric-sdk/` — there should be none.

## Duplicate-dependency skew (the `ava` example)

Watch for an Endo bump pulling in a **second copy** of a transitive dep at a new major, installed
*nested* alongside the workspace's pinned copy. This bit a real sync: `@endo/ses-ava@1.4.2` widened
its `ava` **dependency** (not peer) to `^6 || ^7 || ^8`, so yarn resolved a nested
`@endo/ses-ava/node_modules/ava@8.0.1` next to the workspace `ava@7.0.0`.

`ava` is stateful at the module level — its CLI forks a worker and stashes the runner in a singleton
inside one physical copy's `state.js`; the worker's `main.js` then asserts that singleton is set.
Two copies = two singletons, so **every** test importing `@endo/ses-ava/prepare-endo.js` crashed at
worker boot with `AssertionError null == true` at `ava/lib/worker/main.js:7`
(`assert.ok(refs.runnerChain)`).

**Diagnose:** identical worker-boot crashes across unrelated test files = environment/resolution
problem, not a code regression. Confirm with `grep 'resolution: "ava@npm' yarn.lock` (or the
relevant dep) — more than one resolved version is the smoking gun. Check for a nested copy under
`node_modules/@endo/<pkg>/node_modules/<dup>`.

**Fix:** dedupe to one version via a root `resolutions` entry keyed on the *widened* descriptor, then
reinstall. For the ava case:

```jsonc
// root package.json "resolutions"
"ava@npm:^6 || ^7 || ^8": "npm:^7.0.0",
```

Note a `devDependency` pin (e.g. `"ava": "^7.0.0"` in `devDependencies`) does **not** rewrite a
transitive descriptor — it must be a `resolutions` entry to force the dedupe.

## ses-ava peer warnings are benign

When the bump makes Yarn warn that `@endo/ses-ava`'s peer range doesn't include the new `ava` major
(YN0060), treat it as benign. `ses-ava` is poorly maintained and only uses a thin slice of ava's `t`
API, so new majors work in practice regardless of the declared peer range. Don't gate the bump on
ses-ava widening its range, don't pin ava back, and don't add heavy verification around it — mention
the warning so it's visible, then proceed. (This is distinct from the duplicate-`ava` breakage
above, which is real and must be fixed.)

## Wrap-up

Commit the version bumps, regenerated lockfiles, added portal/pin resolutions, and any dedupe
resolutions together so the change reviews as one unit. Re-run `yarn build-lockfiles` to confirm the
`check-lockfiles` gate is clean, and run the test suites that exercise `@endo/ses-ava` to confirm no
residual duplicate-dependency skew.

Reference syncs: PR #12527 (parallel Copilot sync), PR #12734 (`ta/sync-endo-2026-06-15`).
