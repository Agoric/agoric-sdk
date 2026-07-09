import { expectAssignable, expectNotType, expectType } from 'tsd';

import { M } from '@endo/patterns';
import { makeHeapZone } from '@agoric/base-zone/heap.js';

import type { RemotableObject } from '@endo/pass-style';
import type {
  CastedPattern,
  InterfaceGuard,
  MatcherOf,
  TypeFromPattern,
} from '@endo/patterns';

expectType<InterfaceGuard>(
  M.interface('some sring', { inc: M.call().returns() }),
);
M.interface(
  // @ts-expect-error
  { not: 'a string' },
  'second arg',
);

// =============================================================================
// Regression tests for Endo type integration issues
// =============================================================================
// These tests cover issues that surfaced when type-checking Agoric SDK
// packages against Endo. They live here (not in Endo) because they exercise
// the integration of multiple Endo packages (@endo/patterns + @endo/exo +
// @agoric/base-zone) in patterns that are common in the Agoric SDK but rare
// in Endo's own tests.

// -----------------------------------------------------------------------------
// M.remotable() unparameterized resolves to `any`
// -----------------------------------------------------------------------------
// **Why this matters:** Many Agoric typedefs (e.g. StorageNode, ZCFSeat) are
// plain object types with method signatures, not branded with RemotableBrand.
// When a guard says `.returns(M.remotable('Foo'))`, the return position needs
// to be assignable to those typedefs.
//
// **Trade-off:** `any` is the most permissive option — we lose type safety
// at the use site. We could use `Record<PropertyKey, (...args: any[]) => any>`
// to express "object with only methods, no data" (which is what Far()
// guarantees at runtime), but TypeScript index signatures don't satisfy
// specific named properties (`Record<string, F>` is not assignable to
// `{ foo: F }`), so it doesn't help. The parameterized form
// `M.remotable<typeof SomeInterfaceGuard>()` provides precise inference.
{
  const p = M.remotable();
  type T = TypeFromPattern<typeof p>;
  // Compatible with any concrete remotable typedef
  expectAssignable<T>({ method: () => 1 });
  expectAssignable<T>(null as any);
}

// -----------------------------------------------------------------------------
// defineExoClassKit infers facet method types from the guard
// -----------------------------------------------------------------------------
// **Why this matters:** Contracts in zoe (e.g. ownable-counter) define
// multi-facet exo class kits. Test code calls `E(creatorFacet).method()` on
// the returned facets. If the type inference loses the method names, all
// E() calls fail with "Property X does not exist".
//
// **Trade-off:** The fix removed `& Methods` from the constraint
// `F extends { [K in keyof GK]: TypeFromInterfaceGuard<GK[K]> & Methods }`.
// The `& Methods` intersection caused TypeScript to absorb specific method
// keys into the `string | number | symbol` index signature
// (`'view' | string` collapses to `string`), making FilteredKeys return
// `never` and producing `Pick<X, never> = {}`. Removing it preserves the
// concrete method names while still enforcing guard-method compatibility
// via `TypeFromInterfaceGuard<GK[K]>` alone.
{
  const zone = makeHeapZone();
  const makeKit = zone.exoClassKit(
    'Counter',
    {
      counter: M.interface('Counter', {
        incr: M.call().returns(M.bigint()),
      }),
      viewer: M.interface('Viewer', {
        view: M.call().returns(M.bigint()),
      }),
    },
    () => ({ count: 0n }),
    {
      counter: {
        incr() {
          this.state.count += 1n;
          return this.state.count;
        },
      },
      viewer: {
        view() {
          return this.state.count;
        },
      },
    },
  );
  const kit = makeKit();
  // The facets must have their concrete method signatures, not collapse to `{}`
  expectType<bigint>(kit.counter.incr());
  expectType<bigint>(kit.viewer.view());
}

// -----------------------------------------------------------------------------
// CastedPattern<T> is an unconstrained cast; MatcherOf<Tag, T> requires Passable
// -----------------------------------------------------------------------------
// **Why this matters:** Remotable shapes in typeGuards.js (BrandShape,
// MintShape, …) are annotated `CastedPattern<X>` so a guard built from them
// narrows to the concrete X instead of `any`. An earlier approach used
// `MatcherOf<'remotable', X>`, whose payload is constrained to `Passable` —
// which forced bare, method-only typedefs (Mint, DepositFacet) to be
// intersected with `RemotableObject` just to satisfy that constraint.
//
// `CastedPattern<T>` places NO constraint on T, so that intersection is not
// required by the typing mechanism (the ERTP typedefs keep it only because a
// Mint genuinely is a remotable, not to make the shape annotation type-check).
// These assertions pin the contrast so nobody has to rediscover it by deleting
// the intersection and re-running tsc.

// A bare typedef: object with methods, no RemotableObject brand — the shape
// Mint and DepositFacet had before they were intersected with RemotableObject.
type BareRemotable = { doThing(): number };

{
  // MatcherOf rejects a non-Passable payload...
  // @ts-expect-error BareRemotable does not extend Passable
  type _Bad = MatcherOf<'remotable', BareRemotable>;

  // ...and accepts it only once intersected with RemotableObject (the old
  // workaround that motivated intersecting Mint/DepositFacet).
  type _Ok = MatcherOf<'remotable', BareRemotable & RemotableObject>;

  // CastedPattern needs no such constraint: the bare typedef is accepted
  // directly, exactly as `M.remotable('Bare')` is assigned to it in typeGuards.
  const shape: CastedPattern<BareRemotable> = M.remotable('Bare');

  // ...and at consuming sites it resolves back to exactly BareRemotable, not
  // `any` (the whole point of the annotation).
  expectType<BareRemotable>(null as unknown as TypeFromPattern<typeof shape>);
  expectNotType<any>(null as unknown as TypeFromPattern<typeof shape>);
}
