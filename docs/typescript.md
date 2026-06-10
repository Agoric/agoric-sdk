# usage of TypeScript

Our use of TypeScript has to accommodate both .js development in agoric-sdk (which could not import types until TS 5.5) and .ts development of consumers of agoric-sdk packages (which could always import types). For .js development, we have many ambient (global) types so that we don't have to precede each type reference by an import. For .ts development, we want exports from modules so we don't pollute a global namespace. We are slowly transitioning away from ambient types.

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

## Generating API docs

We use [TypeDoc](https://typedoc.org/) to render API docs in HTML.

```sh
yarn docs
open api-docs/index.html
```
