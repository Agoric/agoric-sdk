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

## Import specifiers use `.js`

**Cross-package (non-relative) specifiers are always `.js`, never `.ts`.** This holds whether the target is a `.js` file or a `.ts` file: for a `.ts` target with no `.js` twin, TypeScript and the dev-time loaders (esbuild, ava) resolve the `.js` specifier to the `.ts` file.

```js
/** @import {PortfolioPublishedPathTypes} from '@aglocal/portfolio-contract/src/type-guards.js' */
// resolves to type-guards.ts; no type-guards.js exists
```

The reason `.ts` is banned across package boundaries: two resolvers do **not** do the `.js`→`.ts` mapping — **plain Node** (it resolves the literal path) and the **Endo bundler** (which also can't parse `.ts`) — and a cross-package import may be resolved by either. So the extension has to match every resolver that could see it:

- **Type-only** (`import type`, `@import`): always `.js`. These are erased before anything runs, so only TypeScript ever resolves them.
- **Value (runtime) imports**: also `.js`, but the target must be resolvable at runtime. Under a dev loader (tests, services, esbuild bundles) a `.js`→`.ts` map is fine. Under **plain Node** — verifying or executing a packed `@agoric/*` package's exports — or under Endo, the target must be a **real `.js` file**. A `.ts` module that needs cross-package value imports therefore exposes a `.js` barrel: e.g. `@agoric/orchestration/src/utils/permit2.js` is a `.js` file re-exporting its `.ts` implementation, so `@agoric/portfolio-api` resolves it under plain Node. (A `.ts` module can't be Endo-bundled at all — see [.ts modules](#ts-modules).)

**Relative specifiers follow the importing module's kind.** A `.js` module writes `.js`; a `.ts` module commonly writes `.ts` for its siblings (e.g. `services/ymax-planner/src` and the `permit2/` submodules). Those relative `.ts` specifiers are fine because the `.ts` modules are only ever consumed as source — by TypeScript, by the dev loaders, by esbuild, or by a `.ts`-aware Node — never emitted to `.js` and re-run, so there's nothing to rewrite. This is why `rewriteRelativeImportExtensions` can stay off (see below).

### Why the `.js` barrel re-exports with `.ts`

The `permit2.js` barrel is a `.js` file whose re-exports name `.ts` siblings — a deliberate combination, not a stray `.ts` specifier:

```js
// packages/orchestration/src/utils/permit2.js
export * from './permit2/signatureTransfer.ts';
export * from './permit2/signatureTransferHelpers.ts';
```

The barrel exists so plain-Node consumers resolve a *real `.js` file* across the package boundary (see the value-imports bullet). Inside it, the relative re-exports must name `.ts`: there is no `.js` twin, and because the barrel can be consumed under plain Node, no `.js`→`.ts` mapping runs — the runtime loads `signatureTransfer.ts` directly. That requires a `.ts`-aware runtime: Node ≥22.18 strips the types natively (the repo is moving to a Node 22+ floor, [#12722](https://github.com/Agoric/agoric-sdk/pull/12722)), and before that a type-stripping loader (such as the one ava uses) is needed. The cross-package importer still writes `.js` (`@agoric/orchestration/src/utils/permit2.js`); only the in-package re-export hop is `.ts`.

### Why the `.ts`-extension compiler options stay confined

Because all cross-package specifiers are `.js` and relative `.ts` modules are consumed as source, two compiler options stay out of everyday code:

- `allowImportingTsExtensions` (whether `.ts` specifiers are allowed at all) is enabled in the root config only because a few bundle inputs are `.ts` files executed as JS, and because of barrels like the one above; normal code never relies on it.
- `rewriteRelativeImportExtensions` (rewrite *relative* `.ts` specifiers to `.js` on emit) is meaningful only when emitting JS. With it on, a *non-relative* `.ts` specifier can't be rewritten and errors (`TS2877`), and it's incompatible with project references (`TS2878`). So the root `tsconfig.json` and the repo-wide `tsconfig.check.json` leave it off (the default), and it's set `true` only in the two packages that emit JS from `.ts` sources — `@agoric/cosmic-proto` and `@agoric/client-utils` — where emitting while inheriting `allowImportingTsExtensions` requires it (`TS5096`). Those two packages contain only *relative* `.ts` specifiers (all type-only), which rewrite cleanly to `.js`; they have no non-relative `.ts` specifiers, so `TS2877` never fires.

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

### Why not project references (`composite`)

TypeScript [project references](https://www.typescriptlang.org/docs/handbook/project-references.html) (`composite: true`) let `tsc --build` build a graph of packages in dependency order, each consuming its dependencies' emitted `.d.ts` (cached in `.tsbuildinfo`) and skipping unchanged projects. It's the standard tool for scaling typed monorepos, so it's worth recording why we deliberately don't use it.

It doesn't fit how this repo is structured:

- **Packages are consumed as source, not as built declarations.** Almost all packages have `main: src/index.js` and no `dist`-pointing `exports`/`types`. When `@agoric/foo` is imported, TypeScript resolves to `foo/src/index.js` and type-checks that source directly. Project references' core benefit — reusing a dependency's cached `.d.ts` instead of re-checking its source — is bypassed by this resolution model. (The two exceptions, `@agoric/cosmic-proto` and `@agoric/client-utils`, are consumed from `dist`; see below.)
- **Type-checking is already a single whole-repo program.** `typecheck-all` runs `tsgo` once over `tsconfig.check.json` (the unified config) — faster than, and the opposite of, orchestrating N referenced projects. `composite` offers it nothing.
- **Building is per-package and independent.** Each package emits its own `.d.ts` via `tsc --build tsconfig.build.json`; nothing internal consumes another package's `dist`, so there's no cross-project build graph to topologically order.
- **`composite` requires a separate `outDir` per package.** Declaration emit currently lands next to source (no `outDir`); `composite` would collide with the inputs (`error TS5055: ... would overwrite input file`). Adopting it would force an `outDir` on every package.

The payoff wouldn't justify the churn. A measured 3-package chain built ~46% faster as a `composite` solution than as independent builds, with sub-second incremental rebuilds — but that speedup is only on the `tsc` declaration-emit path (used for publishing), not the dev loop. The dev loop is `tsgo` type-checking of source, which `composite` can't touch. So adopting it would mean adding `outDir` + `composite` + a hand-maintained references graph across the repo to speed up a path that isn't hot.

References would also constrain `rewriteRelativeImportExtensions`: with it on, a relative import crossing a project boundary errors with `TS2878`. We keep that flag off in the root config for independent reasons ([Import specifiers use `.js`](#import-specifiers-use-js)), so it's not a constraint we hit — but it's one more thing adopting references would have to work around.

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

Since `tsc` won't generate `.js` files (due to `emitDeclarationOnly`), we use `build-ts-to-js` to strip types and produce `.js` files.

### Using `build-ts-to-js`

The `build-ts-to-js` script uses `ts-blank-space` to transform `.ts` files into `.js` by replacing type annotations with whitespace. This preserves line numbers (no source maps needed) and is very fast.

Add it to your package's `prepack` script:

```json
{
  "scripts": {
    "prepack": "yarn run -T build-ts-to-js && yarn run -T tsc --build tsconfig.build.json && find src -name '*.ts' ! -name '*.d.ts' -delete",
    "postpack": "git checkout -- '*.ts' && git clean -f '*.d.ts' '*.d.ts.map' '*.js'"
  }
}
```

The script finds all `.ts` files in `src/` (excluding `.d.ts`) and generates corresponding `.js` files. During `prepack`:
1. `build-ts-to-js` generates `.js` runtime files from `.ts` sources
2. `tsc` generates `.d.ts` declaration files for all sources
3. Original `.ts` source files are deleted (so only `.js` and `.d.ts` are published)

The `postpack` script restores `.ts` files from git and cleans up generated files.

### Why not two `tsc` passes?

An alternative would be using two tsconfig files: one with `allowJs: false` to emit `.js` only for `.ts` files, and another for declarations. This was rejected because:

- Requires careful management of `allowJs`/`include`/`exclude` to avoid conflicts
- More complex to maintain and understand
- The `build-ts-to-js` approach is simpler: one tool for `.js`, one for `.d.ts`

## Generating API docs

We use [TypeDoc](https://typedoc.org/) to render API docs in HTML.

```sh
yarn docs
open api-docs/index.html
```
