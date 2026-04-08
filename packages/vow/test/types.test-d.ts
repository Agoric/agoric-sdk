import { expectType } from 'tsd';

import type { Zone } from '@agoric/base-zone';
import { heapVowE } from '../vat.js';
import type { Vow, VowTools } from '../src/types.js';

const vt: VowTools = null as any;

const zone: Zone = null as any;

// @ts-expect-error function param must return promise
vt.retryable(zone, 'foo', () => null);
vt.retryable(zone, 'foo', () => Promise.resolve(null));

expectType<(p1: number, p2: string) => Vow<{ someValue: 'bar' }>>(
  vt.retryable(zone, 'foo', (_p1: number, _p2: string) =>
    Promise.resolve({ someValue: 'bar' } as const),
  ),
);

expectType<
  Vow<
    (
      | { status: 'fulfilled'; value: any }
      | { status: 'rejected'; reason: any }
    )[]
  >
>(
  vt.allSettled([
    Promise.resolve(1),
    Promise.reject(new Error('test')),
    Promise.resolve('hello'),
  ]),
);

// ===== heapVowE auto-unwraps Vow chains =====
//
// Regression: a method on a remote whose return type is `Vow<T>` (or
// `Vow<Vow<T>>`, or `Promise<Vow<T>>`) should be presented to the caller
// as `Promise<T>`, not `Promise<Vow<T>>`.  The `EUnwrap` machinery in
// `@agoric/vow/src/E.js` is responsible for this: `RemoteFunctions<T>`
// and `ECallable<T>` both run return types through `EUnwrap`, which
// recursively peels `Vow | Promise | PromiseLike` layers.
//
// Historical failure mode: `heapVowE(userSeat).getOfferResult()` in
// agoric-sdk orchestration tests resolved to `Vow<Vow>` instead of the
// inner offer-result shape, breaking destructuring like
// `const { publicSubscribers } = await heapVowE(seat).getOfferResult()`.
// The fix was landed across several upstream Endo commits; this
// regression test pins the invariant so future refactors catch the
// drift at the source.

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

// Case 3: a Promise<Vow<T>> return (common for async methods that
// synchronously return a vow) unwraps all the way
{
  type Remote = { compute(): Promise<Vow<string>> };
  const r = null as unknown as Remote;
  expectType<Promise<string>>(heapVowE(r).compute());
}

// Case 4: real-world shape — a userSeat whose getOfferResult returns
// a Vow of a structured offer result.  The destructured field must
// be reachable without nested `.then(v => v.then(...))`.  This is the
// exact pattern from
// `packages/orchestration/test/examples/auto-stake-it.contract.test.ts`
// that used to error with `Property 'publicSubscribers' does not
// exist on type 'Vow<Vow>'`.
{
  type OfferResult = {
    publicSubscribers: {
      agoric: { storagePath: string };
    };
  };
  type UserSeatLike = {
    getOfferResult(): Promise<Vow<OfferResult>>;
  };
  const userSeat = null as unknown as UserSeatLike;
  async function checkDestructure() {
    const result = await heapVowE(userSeat).getOfferResult();
    expectType<OfferResult>(result);
    // Must be destructurable in one step, not two
    const { publicSubscribers } = result;
    expectType<{ agoric: { storagePath: string } }>(publicSubscribers);
  }
  void checkDestructure;
}

// Case 5: plain (non-Vow) return type is still a Promise<T>
{
  type Remote = { plain(): string };
  const r = null as unknown as Remote;
  expectType<Promise<string>>(heapVowE(r).plain());
}
