/**
 * @file Utility functions that are dependent upon a hardened environment.
 */

import { Fail, q } from '@endo/errors';
import { Nat } from '@endo/nat';

const { freeze } = Object;

function* generateDiffInternal<T = unknown>(
  oldSource: Iterable<T>,
  newSource: Iterable<T>,
  compare: (a: T, b: T) => number = (a, b) => (a < b ? -1 : a > b ? 1 : 0),
): Generator<{ state: 'common' | 'removed' | 'added'; value: T }> {
  const iters = [oldSource, newSource].map(source => source[Symbol.iterator]());
  for (let resultPair = iters.map(iter => iter.next()); ; ) {
    const [oldResult, newResult] = resultPair;
    const [oldDone, newDone] = [oldResult.done, newResult.done];
    const [oldValue, newValue] = [oldResult.value, newResult.value];
    const forceCmp = oldDone || newDone ? NaN : undefined;
    const cmp = forceCmp ?? compare(oldValue, newValue);
    if (cmp === 0) {
      yield freeze({ state: 'common', value: oldValue });
      resultPair = iters.map(iter => iter.next());
    } else if (!oldDone && (newDone || cmp < 0)) {
      yield freeze({ state: 'removed', value: oldValue });
      resultPair[0] = iters[0].next();
    } else if (!newDone && (oldDone || cmp > 0)) {
      yield freeze({ state: 'added', value: newValue });
      resultPair[1] = iters[1].next();
    } else {
      (oldDone && newDone) ||
        Fail`bad comparison: ${q({ oldResult, newResult, cmp })}`;
      break;
    }
  }
}

export const generateDiff = <T>(
  ...args: Parameters<typeof generateDiffInternal<T>>
): ReturnType<typeof generateDiffInternal<T>> =>
  harden(generateDiffInternal(...args));
harden(generateDiff);

/**
 * Scale a floating-point number up to a natural number without rounding (beyond
 * a configurable count of subsequent decimal places that must be entirely zeros
 * or entirely nines).
 */
export const scaleToNat = (
  value: unknown,
  fixedPlaces: number,
  strictness: number = Infinity,
): bigint => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw Fail`scaleToNat requires a non-negative finite number, not ${value}`;
  }
  const [, N, F = '', E] =
    value.toExponential().match(/^(\d)(?:\.(\d+))?e([+-]\d+)$/) ||
    Fail`internal: scaleToNat requires parsable toExponential() output from ${value}`;
  const exp = Number(E);
  let [n, f] = [N, F];
  try {
    let fracDigitCount = f.length - exp;
    if (fracDigitCount > fixedPlaces) {
      // We have unexpected fractional digits, but they might still fit within
      // our strictness (e.g., 17.578324000000002 with fixedPlaces=6 passes when
      // strictness<=8).
      const tail = f.slice(exp + fixedPlaces, exp + fixedPlaces + strictness);
      if (tail.match(/^0+$/)) {
        // round down via truncation
        f = f.slice(0, exp + fixedPlaces);
        fracDigitCount = fixedPlaces;
      } else if (tail.length === strictness && tail.match(/^9+$/)) {
        // round up, possibly with carry
        f = f.slice(0, exp + fixedPlaces);
        fracDigitCount = fixedPlaces;
        if (f.match(/^9+$/)) {
          n = String(Number(n) + 1);
          f = f.replaceAll('9', '0');
        } else {
          f = String(Number(f) + 1);
        }
      } else {
        throw Fail``;
      }
    }
    const big = BigInt(`${n}${f}${'0'.repeat(fixedPlaces - fracDigitCount)}`);
    return Nat(Number(big));
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_err) {
    throw Fail`scaleToNat found precision loss at scale ${q(fixedPlaces)}: ${value}`;
  }
};
harden(scaleToNat);
