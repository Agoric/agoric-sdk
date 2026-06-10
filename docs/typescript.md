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
| `typecheck-packages` (CI, via `lint:packages`) | `tsgo` | Runs each workspace's `lint:types` against its own tsconfig, resolving dependencies through `node_modules` entrypoints as a consumer would. |
| Declaration-emit check | `tsc` | The CI build and prepack steps run `tsc` for `.d.ts` emit, which is what keeps the source TS 6-compatible. |
| Declaration emit (`build-ts`, package `prepack`) | `tsc` | `tsgo` declaration-emit parity is not complete; emit stays on the stable compiler until 7.0 stable proves parity. |
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
