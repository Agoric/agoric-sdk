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
