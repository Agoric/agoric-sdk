# usage of TypeScript

Our use of TypeScript has to accommodate both .js development in agoric-sdk (which could not import types until TS 5.5) and .ts development of consumers of agoric-sdk packages (which could always import types). For .js development, we have many ambient (global) types so that we don't have to precede each type reference by an import. For .ts development, we want exports from modules so we don't pollute a global namespace. We are slowly transitioning away from ambient types.

## TypeScript Preview (tsgo)

We are mid-transition from TypeScript 6 (`tsc`, the JS-based compiler) to TypeScript 7 (`tsgo`, the Go-native rewrite). As of mid-2026, TS 7.0 is in beta with stable expected imminently; we use the `@typescript/native-preview` nightlies, which are roughly 10x faster than `tsc`.

All type-checking uses `tsgo`; `tsc` 6 remains only where something is built or consumed through the compiler API. (`tsgo` is intentionally stricter about some JSDoc patterns than `tsc` 6, and `tsc` must still emit declarations cleanly — exercised by the build and prepack steps in CI — so source files stay effectively TS 6-compatible without a dedicated TS 6 type-check gate.)

Division of labor during the transition:

| Task | Compiler | Why |
| --- | --- | --- |
| `lint:types` (root and per package) | `tsgo` | Fast dev loop. Type-checking emits nothing, so a preview compiler is low-risk here. |
| `typecheck-all` (CI) | `tsgo` | Gates TS 7 cleanliness over `tsconfig.check.json`, the unified repo-wide config. Excludes only `a3p-integration`, `multichain-testing` (standalone yarn projects), and `swingset-runner` (not yet type-clean). |
| `typecheck-packages` (CI and root `lint:packages`) | `tsgo` | Runs each workspace's `lint:types` against its own tsconfig, resolving dependencies through `node_modules` entrypoints as a consumer would. |
| Declaration emit (`build-ts`, package `prepack`; exercised by the CI build and prepack steps) | `tsc` | `tsgo` declaration-emit parity is not complete; emit stays on the stable compiler until 7.0 stable proves parity. This is also what keeps source TS 6-compatible. |
| ESLint type-aware rules | TS 6 API | typescript-eslint consumes the `typescript` package's JS API; `tsgo` has no compatible API yet. |
| `a3p-integration` `lint:types` | `tsc` | Vendored dependencies aren't tsgo-clean (also excluded from `tsconfig.check.json`). |

Notes:

- `@typescript/native-preview` is deliberately **not pinned** to an exact nightly; it's OK for it to advance on installs and Renovate bumps. If a new nightly surfaces errors, prefer fixing the code (the added strictness is usually correct); for an upstream regression, temporarily hold it back with a yarn `resolutions` entry.
- `tsgo` invocations pass `--tsBuildInfoFile` ending in `.tsgo.tsbuildinfo` because the two compilers' incremental-state formats are incompatible; separate files keep them from clobbering each other's caches. (Both match the `*.tsbuildinfo` gitignore.)
- At 7.0 stable: replace the preview package with `typescript@7`, trial declaration emit (diff `.d.ts` output in an emit-heavy package such as `@agoric/cosmic-proto`), and retire the TS 6 gate once tooling like typescript-eslint supports TS 7.

## Best practices

### Exported types

- `.ts` for modules defining exported types
- package entrypoint(s) exports explicit types
- use `/** @import ` comments to import types without getting the runtime module

## .ts modules

We cannot use `.ts` files in any modules that are transitively imported into an Endo bundle. The reason is that the Endo bundler doesn't understand `.ts` syntax and we don't want it to until we have sufficient auditability of the transformation. Moreover we've tried to avoid a build step in order to import a module. (The one exception so far is `@agoric/cosmic-proto` because we codegen the types. Those modules are written in `.ts` syntax and build to `.js` by a build step that creates `dist`, which is the package export.)

The trick is to use `.ts` for defining types and then make them available in the packages using a `types-index` module that has both `.js` and `.d.ts` files.

**Entrypoint (index.js)**
```js
// eslint-disable-next-line import/export
export * from './src/types-index.js'; // no named exports
```

**types-index.js**
```js
// Empty JS file to correspond with its .d.ts twin
export {};
```

**types-index.d.ts**
```ts
// Export all the types this package provides
export type * from './types.js';
export type * from './other-types.js';
```

The actual type implementation is then written in `types.ts` and `other-types.ts` files (per the example above).
These files are never runtime imported as they are only linked through a `.d.ts` file.


## d.ts modules

We take on the complexity above of indirection because `.d.ts` files aren't checked. We have `"skipLibCheck": true"` in the root tsconfig.json because some libraries we depend on have their own type errors. (A massive one is the output of Telescope, used in `@agoric/cosmic-proto`.)

This means that the types you write in `.d.ts` file won't be checked by `tsc`. To gain some confidence, you can temporarily flip that setting in a package's own `tsconfig.json` and pay attention to only the relevant errors.

## entrypoint

This is usually an `index.js` file which contains a wildcard export like,

```js
// eslint-disable-next-line import/export -- just types
export * from './src/types.js';
```

The `types.js` file either defines the types itself or is an empty file (described above) paired with a `.d.ts` or `.ts` twin.

One option considered is having the conditional package `"exports"` include `"types"` but that has to be a .d.ts file. That could be generated from a `.ts` but it would require a build step, which we've so far avoided.

Once we have [JSDoc export type support](https://github.com/microsoft/TypeScript/issues/48104) we'll be able instead to keep the `index.js` entrypoint and have it export the types from `.ts` files without a runtime import of the module containing them.

## Build

### The `emitDeclarationOnly` constraint

The repo-wide `tsconfig-build-options.json` sets `emitDeclarationOnly: true`. This means `tsc` only generates `.d.ts` declaration files, not `.js` runtime files. This is intentional because:

1. Most source files are `.js` with JSDoc annotations (not `.ts`)
2. We don't use a separate `dist/` output directory to avoid requiring a build watcher during development
3. Without `emitDeclarationOnly`, `tsc` would try to write `.js` output for `.js` input files, causing errors like:
   ```
   error TS5055: Cannot write file 'src/cli/bin.js' because it would overwrite input file.
   ```

### When `.ts` files have runtime code

Some `.ts` files contain actual runtime code (functions, constants) rather than just type definitions. Examples include type guard functions, EIP-712 message helpers, etc. These files need corresponding `.js` files when published to npm.

Since `tsc` won't generate `.js` files (due to `emitDeclarationOnly`), we use [`ts-node-pack`](https://github.com/turadg/ts-node-pack) at pack time to strip types and produce a tarball whose contents are plain `.js` + `.d.ts` with rewritten import specifiers.

### Using `ts-node-pack`

`ts-node-pack` is a wrapper around `tsc` + `npm pack` that runs entirely against a temp staging directory: it never mutates the source tree. For each publishable workspace it:

1. Stages the package files into `mkdtemp()/package/`.
2. Emits `.js` (via `ts-blank-space`) and `.d.ts` (via `tsc` with `rewriteRelativeImportExtensions`) into the staging dir.
3. Rewrites `.ts` → `.js` specifiers in emitted `.d.ts` files and in `package.json` (`main`, `module`, `types`, `exports`, `bin`, `files`).
4. Validates that no `.ts` specifier or missing entry point remains.
5. Runs `npm pack` in the staging dir and moves the resulting `<name>-<version>.tgz` to the caller's CWD.

Because the source tree is untouched, **packages no longer need `prepack` / `postpack` scripts**. The previous in-place approach (`build-ts-to-js` + `tsc --build` + `find ... -delete` in `prepack`, then `git checkout -- '*.ts'` in `postpack`) has been removed.

To pack a single package locally:

```sh
cd packages/<name>
yarn run -T ts-node-pack .
# produces e.g. agoric-foo-1.2.3.tgz in the current directory
```

To verify every publishable workspace packs cleanly (the same check CI runs in `test-all-packages.yml`):

```sh
scripts/packing/verify-package-exports.mjs --quiet
# Snapshot the repo root and a scratch dir *before* the loop: the subshell's
# `cd` would otherwise rewrite $PWD before the ts-node-pack/source paths expand.
WORKSPACE=$(pwd)
TARBALL_DIR=$(mktemp -d)
trap 'rm -rf "$TARBALL_DIR"' EXIT
npm query .workspace \
  | jq -r '.[] | select(.private != true) | .location' \
  | while read -r dir; do
      (cd "$TARBALL_DIR" && "$WORKSPACE/node_modules/.bin/ts-node-pack" "$WORKSPACE/$dir") || exit 1
      rm -f "$TARBALL_DIR"/*.tgz
    done
```

This mirrors the `Pack packages with ts-node-pack` step in
`.github/workflows/test-all-packages.yml`; keep the two in sync if either changes.

### Publishing

`yarn lerna publish` would otherwise pack tarballs through lerna's own pipeline (Arborist + npm-packlist on the source tree), which ships `.ts` files and `.ts` import specifiers. We instead pre-stage every publishable workspace into a `<pkg>/.ts-node-pack/` subdirectory and pass `--contents .ts-node-pack` to `lerna publish`, so lerna packs and uploads from the ts-node-pack output:

1. `yarn lerna version ...` — bump versions in place. (We can't keep `lerna publish --canary` because the staging step has to see the post-bump versions; `--canary` is publish-only in lerna-lite, so we encode the SHA in `--preid` and use `--force-publish`.)
2. `node scripts/packing/stage-with-ts-node-pack.mjs` — for each publishable workspace, run `ts-node-pack --skip-pack --stage-to <pkg>/.ts-node-pack --force`. ts-node-pack writes directly into that directory with `.ts → .js` rewrites in code, manifests, exports, and the `files` array; resolves `workspace:` deps against the local workspace version map (it walks up to the workspace root); and strips `devDependencies` + `scripts`.
3. `yarn lerna publish from-package --contents .ts-node-pack ...` — lerna handles topological publish order, dist-tag, retries, OTP, and already-published detection, but tars from `<pkg>/.ts-node-pack/` and uploads `<pkg>/.ts-node-pack/package.json` as the registry manifest.
4. `node scripts/packing/stage-with-ts-node-pack.mjs --clean` — remove the staging directories so the working tree is clean for downstream cache invariants.

Both the after-merge dev-canary workflow (`.github/workflows/after-merge.yml`) and the local Verdaccio publish flow (`scripts/registry.sh`) follow this pattern. The `.ts-node-pack/` path is gitignored.

To smoke-test the publish pipeline (version bump → stage → `lerna publish from-package --contents .ts-node-pack` → cleanup) against a local Verdaccio registry, run:

```sh
scripts/packing/smoketest-publishing.sh
```

This deliberately skips the dapp-offer-up "getting started" integration test that `scripts/registry.sh ci` would run afterward.

## Type-level tests (`*.test-d.ts` files)

Runtime tests can't verify things like "this type is exactly `Promise<OfferResult>`" or "this assignment should be a type error". For those, we use **type-level tests** written in `*.test-d.ts` files, checked by `tsc` (not run as AVA tests). They live next to runtime tests under `packages/*/test/` and are picked up by the package's `lint:types` / `typecheck-quick` pass.

Examples in the tree: `packages/vow/test/types.test-d.ts`, `packages/orchestration/test/types.test-d.ts`, and several `types-*.test-d.ts` files under `/opt/agoric/endo/packages/exo/test/` and `/opt/agoric/endo/packages/patterns/test/`.

### The toolkit: `tsd` assertions

We use helper functions from the [`tsd`](https://github.com/tsdjs/tsd) package. These functions have no runtime effect — their signatures are what cause `tsc` to emit errors when expectations don't hold.

```ts
import { expectType, expectAssignable, expectNotAssignable, expectError } from 'tsd';
```

- **`expectType<T>(value)`** — fails unless `typeof value` is *exactly* `T`. Use for pinning the precise shape of an inferred type.
- **`expectAssignable<T>(value)`** — fails unless `typeof value` is assignable to `T`. Use for subtype relationships where exactness doesn't matter.
- **`expectNotAssignable<T>(value)`** — fails unless `typeof value` is *not* assignable to `T`. Use to verify that a deliberately wrong shape is rejected.
- **`expectError(...)`** — fails unless the expression raises a type error. Less commonly used because `@ts-expect-error` is usually clearer.
- **`@ts-expect-error`** — inline comment on the line above a statement that should fail to type-check. If the statement succeeds, TS reports an "unused @ts-expect-error directive" error, which serves as a negative test.

All four are type-level checks only: they never call into runtime values, so `null as unknown as T` and similar no-op casts are the canonical way to materialize a value of the desired type without depending on real construction.

### Materializing values of a given type

Test-d files need "pretend I have a value of type `T`" pervasively. There are two idioms, each appropriate in a different position:

**Module scope — `declare const`:**
```ts
declare const userSeat: UserSeat<Vow<OfferResult>>;
```
Produces an ambient reference at the type level with no runtime value. Only valid at module/namespace scope — *not* inside blocks.

**Inside a block — `const x = null as unknown as T`:**
```ts
{
  const r = null as unknown as Remote;
  expectType<Promise<string>>(heapVowE(r).fetch());
}
```
Produces a regular `const` binding with `null` at runtime but `T` at the type level. Works anywhere because it's a regular value expression. Prefer this form inside scoped blocks.

A `declare const` inside a block errors with `TS1184: Modifiers cannot appear here`, which is the telltale sign you need the `null as unknown as T` form instead.

### Scoped blocks: one case per `{ ... }`

Give each test case its own scope so local type aliases and bindings can reuse short names without colliding:

```ts
// Case 1: a single Vow return unwraps to T
{
  type Remote = { fetch(): Vow<{ hello: string }> };
  const r = null as unknown as Remote;
  expectType<Promise<{ hello: string }>>(heapVowE(r).fetch());
}

// Case 2: a nested Vow<Vow<T>> return unwraps all the way to T
{
  type Remote = { nested(): Vow<Vow<{ count: number }>> };
  const r = null as unknown as Remote;
  expectType<Promise<{ count: number }>>(heapVowE(r).nested());
}
```

Each `{ ... }` is its own lexical scope, so `Remote` and `r` don't conflict between cases. This keeps each case self-contained and readable without long prefixed names like `RemoteFetch1` / `RemoteNested2`. It's the style used throughout Endo's `test-d` files (e.g. `endo/packages/exo/test/types-plain-guarded.test-d.ts`) and is the preferred shape for new cases in agoric-sdk.

When a case needs helper async/sync functions, declare them inside the same block and `void` them so TypeScript doesn't warn about an unused value:

```ts
{
  type OfferResult = { publicSubscribers: { agoric: { storagePath: string } } };
  const userSeat = null as unknown as { getOfferResult(): Promise<Vow<OfferResult>> };
  async function checkDestructure() {
    const result = await heapVowE(userSeat).getOfferResult();
    expectType<OfferResult>(result);
    const { publicSubscribers } = result;
    expectType<{ agoric: { storagePath: string } }>(publicSubscribers);
  }
  void checkDestructure;
}
```

### Two common assertion patterns

**1. Pinning an inferred type with `expectType`** — use when the test's purpose is "this exact shape should fall out of the generic machinery". The `expectType` parameter forces exact equality rather than subtype compatibility, so it catches widening or narrowing drift.

```ts
{
  const p = M.splitArray([M.string()], [M.nat(), M.boolean()]);
  type T = TypeFromPattern<typeof p>;
  expectType<[string, bigint?, boolean?]>(null as unknown as T);
}
```

**2. Business-level "destructurable after await"** — use for regressions of specific downstream symptoms. If `expectType<OfferResult>(result)` is too loose (because `any` would pass), follow it with an explicit destructure that would fail under the old buggy shape:

```ts
const result = await heapVowE(seat).getOfferResult();
expectType<OfferResult>(result);
// Must be destructurable in one step, not two
const { publicSubscribers } = result;
```

The destructure is the real business-level assertion; the `expectType` above it is a second-line defense. Both failing would be a louder signal than either alone.

### Debugging inference: the "reveal via `never`" trick

When TS's inferred type isn't what you expect and error messages aren't clear enough, temporarily assign the value to `never`. TypeScript then prints the *actual* type in the error, which is often more precise than what IntelliSense hover shows (and certainly more precise than test pass/fail):

```ts
const result = someExpression;
// @ts-expect-error — forces TS to print the real inferred type
const probe: never = result;
```

Example failure output:
```
error TS2322: Type 'Promise<Vow<OfferResult>>' is not assignable to type 'never'.
```

That "is not assignable" message is the diagnostic — it reveals the exact type without having to hunt through hover tooltips, and it works for deeply nested generic types that IntelliSense truncates. Delete the `probe` once you've learned what you need.

This is a debugging idiom, not a test: remove the `never` lines before committing.

### Negative assertions: `@ts-expect-error` and `expectNotAssignable`

For "this *should* be rejected by the type system", there are two tools:

```ts
{
  // @ts-expect-error — extra method not on the guard
  exo.nope;
}

{
  const kit = makeKit(0);
  // @ts-expect-error — setX is only on the admin facet
  kit.public.setX;
}
```

`@ts-expect-error` is preferred for one-line negative assertions because it lives right next to the failing line and produces a clear "unused directive" error when the failure goes away. `expectNotAssignable` is better for "the type of this whole expression should not satisfy T" assertions.

### Running the tests

Type-level tests run as part of the package's normal `lint:types` / `tsc --noEmit` pass — there's no separate `yarn test:types` command. Add them to the package's `test/` directory with a `.test-d.ts` suffix and they'll be picked up automatically by the `tsconfig.json`'s `include` pattern.

To run just the type check for a single package:
```sh
cd packages/vow && yarn lint:types
```

To run across the whole monorepo:
```sh
yarn typecheck-quick
```

### When to reach for a type-level test

Good candidates:

- **Regression pinning** — after fixing a hairy inference bug, add a case that would fail under the old shape. The `packages/vow/test/types.test-d.ts` Vow-unwrapping cases are exactly this: each one exercises a `Vow<...>` nesting depth that used to leak out of `heapVowE(x).method()`.
- **Public-API contract pinning** — if a package exposes a generic helper whose precise inferred return type matters to consumers (e.g. `M.infer<typeof shape>`), pin the expected shape so refactors can't silently widen it.
- **Cross-module subtype relationships** — if two types from different modules need to be mutually assignable (e.g. a mock implementation and a real one), assert it via `expectAssignable` or direct assignment.
- **Generic constraint boundaries** — if a generic constraint is deliberately loose or tight, add both a positive and negative case to document the intent.

Avoid for:

- Things already covered by runtime tests. Type-level tests can't verify behavior, only structure.
- Sprawling "every property of every type" coverage. The goal is to pin load-bearing invariants, not to recreate `tsc`'s own type system as assertions.

## Generating API docs

We use [TypeDoc](https://typedoc.org/) to render API docs in HTML.

```sh
yarn docs
open api-docs/index.html
```
