# Typing patterns, guards, and Vows

Notes from an iterative effort to drive `yarn typecheck-quick` to green across
the dependency graph, with emphasis on `@endo/patterns`, `@endo/exo`, and
`@agoric/vow`. Intended audience: contributors making types stricter without
changing runtime behavior.

## Core mental model

Guards and typedefs describe the *same* surface from two angles:

- **Guards** (`M.call(...).returns(...)`, `M.interface(...)`, `M.remotable(...)`)
  are runtime values that check shape at method-call boundaries.
- **Typedefs** are the static projection that TS uses to check callers and
  implementations.

Endo's `TypeFromPattern` / `TypeFromInterfaceGuard` / `TypeFromMethodGuard`
bridge the two: given a guard *value*, infer the TS *type* it represents. When
both sides agree, the exo class body, its callers, and its guard all check
consistently — no casts needed.

When they diverge, prefer making the guard carry the right type over casting
at the call site. Three escape hatches, in order of preference:

1. **Parameterize the matcher**: `M.remotable<StorageNode>('StorageNode')`,
   `Vow$<JsonSafe<ResponseQuery>[]>(M.arrayOf(M.record()))`.
2. **`CastedPattern<T>`**: a phantom-typed pattern in `@endo/patterns` used for
   unchecked static assertions. Use when the runtime shape is weaker than the
   static type you want (e.g. `VowShape` is `M.tagged('Vow', ...)` at runtime
   but you want `Vow<T>` statically).
3. **Inline `/** @type {CastedPattern<T>} */` cast** on the guard expression.
   Last resort — document why structural inference isn't enough.

## `CastedPattern<T>` — the "unchecked cast" pattern

Added to `@endo/patterns`:

```ts
declare const castedType: unique symbol;
export type CastedPattern<T> = Pattern & { [castedType]?: T };
```

`TypeFromPattern` checks for the phantom first; when set, it bypasses
structural inference and returns the asserted type directly. When unset
(default `unknown`), it falls through to the structural path.

Naming: "casted" conveys *unchecked narrowing*, matching TS's `as` semantics.
We chose it over `TypedPattern` because "typed" suggests verification.

### Where it's used

- `VowShape` in `@agoric/vow` — runtime is a tagged record, static is `Vow<T>`.
- `Vow$<T>(innerShape)` — returns `CastedPattern<Vow<T>>`, letting guards like
  `query: M.call(...).returns(Vow$<JsonSafe<ResponseQuery>[]>(M.arrayOf(M.record())))`
  flow the right return type to callers.
- `PromiseShape` locals in `vats/src/nameHub.js` and `vats/src/bridge.js`.
  `M.promise()` now correctly infers as `PromiseLike<any>` (honest to the
  runtime duck-typed thenable check), but these packages' external
  typedefs declare their method returns as `Promise<unknown>` — the
  `CastedPattern<Promise<any>>` cast pins the guard-derived return back
  to the consumer-facing `Promise` shape.
- ERTP `typeGuards.js`: `BrandShape`, `IssuerShape`, `PaymentShape`, etc. are
  cast as `CastedPattern<Brand>` / `CastedPattern<Issuer>` / ... so downstream
  guards get real types instead of bare `RemotableObject`.

### Gotchas

- A `CastedPattern<T>` is still a `Pattern` at runtime. The phantom is
  type-level only and adds no overhead.
- Because `unknown extends T` is used to distinguish "cast is set" from
  "unset", don't set the phantom to `unknown` intentionally.
- In distributive conditionals, `any` trivially satisfies the `CastedPattern`
  check. This is fine because the branch itself checks `unknown extends
  Asserted` and falls through structurally.

## Vow typing

### `VowShape` carries `Vow`

```js
export const VowShape =
  /** @type {CastedPattern<Vow>} */ (
    M.tagged('Vow', M.splitRecord({ vowV0: M.remotable('VowV0') }))
  );
```

Guards using `VowShape` or `Vow$<T>(...)` now propagate `Vow<T>` through
`TypeFromPattern`, so exo method return types match the `Vow<T>` typedef
without an `@ts-expect-error`.

### `watch()` returns `Vow<Fulfilled<T>>`

Previously `watch()` typed as `Vow<TResult>`, which produced nested
`Vow<Vow<X>>` when the watcher itself returned a vow. `Fulfilled<T>` chases
the `VowLike` chain to the final value so users never see doubled vows.

```ts
watch: <T, TResult1 = T, TResult2 = never, C extends unknown[] = []>(
  specimenP: EVow<T>,
  watcher?: Watcher<T, TResult1, TResult2>,
  ...watcherArgs: C
) => Vow<Fulfilled</* narrowed */>>;
```

`overrideVow` / `voidVow` in `exo-helpers.js` were updated to match.

### When an inline cast is still needed

Inside a watcher implementation, `watch(...)` sometimes returns too wide a
`Vow<...>` because the inner watcher's return type can't be statically tied to
its guard. Narrow at the *return statement*, not the guard:

```js
return /** @type {Vow<JsonSafe<ResponseQuery>[]>} */ (
  watch(E(connection).send(...), this.facets.parseQueryPacketWatcher)
);
```

The guard `returns(Vow$<T>(...))` documents the intent; the cast makes the
impl agree.

## Bugs fixed in Endo

### `TypeFromArgGuard` spurious match on `payload: any`

```ts
// before
G extends { payload: { argGuard: infer P } } ? TypeFromPattern<P> : TypeFromPattern<G>
```

`{ argGuard: infer P }` was meant to detect `AwaitArgGuard`, whose payload is
literally `{ argGuard: Pattern }`. But any matcher with `payload: any` (e.g.
`M.array()` → `MatcherOf<'arrayOf'>`, default payload `any`) trivially
satisfied the shape test. TS then inferred `P = any`, and distributive
conditional resolution collapsed the arg's type to `unknown`.

Fix: gate on the `Symbol.toStringTag` first, like `'guard:rawGuard'` does:

```ts
G extends { [Symbol.toStringTag]: 'guard:awaitArgGuard' }
  ? G extends { payload: { argGuard: infer P } } ? TypeFromPattern<P> : any
  : TypeFromPattern<G>
```

General lesson: for tagged unions, **discriminate on the tag, not on a
payload shape that contains `any`**. Structural tests over `any` distribute
strangely.

### `TFRemotable` falling back to `Payload`

Early version returned `Payload` for the non-`InterfaceGuard` branch. When
`Payload = any`, the distributive conditional produced a non-trivial
`Simplify<...>` union that never collapsed to `any`. Fix: return `any`
literally. Consumers wanting a concrete type use a `CastedPattern`.

### `CopyArray<T>` as `readonly T[]`

Was `Array<T>` (mutable). Readonly tuples now assign cleanly to `CopyArray`,
eliminating friction in `M.splitArray([...] as const)` patterns.

### `defineExoClassKit` `& Methods` over-constraint

The guarded constraint had `& Methods` at the end, which caused
`keyof (X & Methods)` to collapse to `never` for overloaded method records
→ `Pick<X, never>` → empty interface → silent loss of methods. Removing
the intersection fixed kit facet inference.

### `bundle-source`'s `load()` return type

Was always `BundleSourceResult<'endoZipBase64'>`. Now conditional on the
`format` option, which removed three smart-wallet errors that had been
working around the wrong default.

## Pattern-specific guidance

### Tuples: prefer `M.splitArray` to `M.arrayOf`

```js
// Typed as readonly [string, any][]
entries: M.call().returns(M.arrayOf(M.splitArray([M.string(), M.any()])))
```

`M.arrayOf(M.any())` gives `any[]` with no tuple structure; `splitArray`
preserves the tuple shape, which matters for `entries()`-style returns.

### `M.remotable('Name')` vs `M.remotable<T>('Name')`

Default Payload is `any`, so `M.remotable('Foo')` infers to `any`. Provide
a type param when you know the remotable type:

```js
M.remotable(/** @type {StorageNode} */ ('StorageNode'))
```

or use `CastedPattern<StorageNode>` on the enclosing shape.

### `M.promise()` → `PromiseLike<any>`

`TFKindMap['promise']` resolves to `PromiseLike<any>` rather than
`Promise<any>`, because at runtime `M.promise()` duck-typed-checks any
thenable.  Consumers whose *own typedefs* declare `Promise<X>` (not
`PromiseLike<X>`) need a local `CastedPattern<Promise<any>>` cast to
pin the guard's return back to the stricter consumer type.  See the
`PromiseShape` locals in `vats/src/nameHub.js` and `vats/src/bridge.js`
for the idiom.

### `Invitation<R, A>` phantom params

`InvitationShape` is typed as `Invitation<any, any>`. Tighter phantoms
produced cascade errors in orchestration. Leave wide until individual call
sites need narrowing.

## Workflow

- **`yarn typecheck-quick`** at the repo root is faster than per-package
  `lint:types` when iterating across packages.
- **Endo edits require `yarn prepack`** in the affected package (e.g.
  `endo/packages/patterns`). The workspace links to `src/`, but d.ts files
  are emitted by prepack and drive TS resolution.
- **Never edit generated `.d.ts`** in `/endo` except `types-index.d.ts`
  (hand-authored).
- **Never use `any`** without explicit user approval. `unknown` + narrowing
  is usually acceptable; `CastedPattern<T>` is the principled alternative.

## Ideas for further improvement

### High value

1. **Widen the `Promise<X>` return types in agoric-sdk typedefs to
   `PromiseLike<X>`** where the runtime accepts any thenable (e.g.
   `BridgeHandler.fromBridge`, `NameHub.lookup`).  Once the typedefs
   use `PromiseLike`, the `PromiseShape` CastedPattern locals in
   `vats/src/nameHub.js` and `vats/src/bridge.js` can be deleted and
   replaced with plain `M.promise()`.

2. **Tighten `M.remotable()` default.** Currently `any`. Could be
   `RemotableObject & Record<PropertyKey, (...args: any[]) => any>` once
   downstream packages are ready. Introduce behind an opt-in type param
   first to stage migration.

3. **`TFRemotable` from `InterfaceGuard`.** Already resolves interface
   guards to their method records. Next step: support
   `M.remotable<typeof SomeIface>('Name')` for the typedef path too, so
   consumers don't need a separate typedef + guard pair.

4. **`Vow$` auto-inference from inner shape.** Today
   `Vow$<JsonSafe<Resp>[]>(M.arrayOf(M.record()))` duplicates intent.
   Explore making `Vow$` infer the phantom from the inner pattern via
   `TypeFromPattern<InnerP>` when no explicit arg is given.

5. **`defineExoClass` / `makeExo` overloads.** Earlier attempt to add
   a third union overload regressed strictness. Revisit with a smaller,
   more targeted overload that only activates when the guard's
   `TypeFromInterfaceGuard` conflicts with the methods object.

### Medium value

6. **Runtime check for `CastedPattern` misuse.** It's a static-only cast,
   but a dev-mode assertion that the underlying pattern at least
   structurally admits the asserted type would catch drift.

7. **Codemod for `TypedPattern<T>` → `CastedPattern<T>`.** Alias currently
   exists in `@agoric/internal` as deprecated. Agoric-sdk should migrate
   fully and remove the alias.

8. **Narrow `asVow` return type.** `asVow(fn)` could infer from `fn`'s
   return type instead of requiring an explicit cast.

9. **`watch()` watcher-args inference.** The `C extends unknown[]` tuple
   capture works but doesn't flow into the watcher's `onFulfilled`
   context. Tightening this would catch watcher-context mismatches at
   the `watch()` call site.

10. **ERTP `AmountMath.getValue` overloads.** Current `@template {Amount}
    A` doesn't let callers who pass `Amount<'nat'>` recover `bigint`
    without an outer cast. Needs conditional return on the brand kind.

### Lower value / exploratory

11. **`M.splitArray` with truly optional tuple elements.** Currently uses
    `T | undefined` for optional trailing elements because TS conditional
    types can't produce `[X?, Y?]`. Revisit if TS gains support.

12. **Structural `tagged` matcher inference.** `TypeFromPattern<M.tagged<Tag,
    Payload>>` produces `CopyTagged<Tag, ...>`. Could we flow specific
    payload types through `M.tagged('MyTag', M.splitRecord({...}))` more
    precisely?

13. **`Guarded<M, G>` / `GuardedKit<F, GK>`.** These wrappers bridge exo
    method records and interface guards. A deep dive into why `& Methods`
    broke kit inference would likely reveal other latent issues.

14. **`zone.exoClass` rest-args overload resolution.** Current code uses
    `@ts-expect-error` for variadic spread. A dedicated overload accepting
    the four-arg form would remove the suppressions.

15. **Test-d coverage.** Add `test-d.ts` files in `@agoric/vow` and
    `@agoric/orchestration` mirroring the ones in `@endo/patterns`, so
    regressions in Vow/guard typing are caught locally.

## Quick probes

When debugging "why is this type `unknown`?", a throwaway probe file is
often faster than staring at the conditional types:

```ts
// packages/foo/src/probe.ts
import { M } from '@endo/patterns';
import type { TypeFromInterfaceGuard } from '../../../../endo/packages/patterns/src/type-from-pattern.js';

const I = M.interface('i', { foo: M.call(M.string(), M.array()).returns(M.any()) });
type T = TypeFromInterfaceGuard<typeof I>;
declare const t: T;
const a0: never = ({} as Parameters<typeof t.foo>)[0]; // error reveals inferred type
const a1: never = ({} as Parameters<typeof t.foo>)[1];
```

Assigning to `never` forces TS to print the inferred type in the error.
Delete the probe before committing.
