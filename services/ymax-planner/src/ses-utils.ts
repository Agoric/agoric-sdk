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
  const exponential =
    value.toExponential().match(/^(\d)(?:\.(\d+))?e([+-]\d+)$/) ||
    Fail`internal: scaleToNat requires parsable toExponential() output from ${value}`;
  const [, n, f = '', e] = exponential;
  const exp = Number(e);

  // exp defines the relevant partitioning of `${n}${f}`.
  let prefixLen = 1 + exp + fixedPlaces;

  // Fast path for short input.
  const fillLen = prefixLen - f.length - 1;
  if (fillLen >= 0) {
    return Nat(Number(BigInt(`${n}${f}${'0'.repeat(fillLen)}`)));
  }

  // Collect post-prefix digits according to the strictness threshold, requiring
  // them to either be zeros (and truncated) or nines (and rounding the prefix
  // up). For example, 17.578324000000002 with fixedPlaces=6 passes when
  // strictness<=8.
  const allDigits = `${prefixLen < 0 ? '0'.repeat(-prefixLen) : ''}${n}${f}`;
  if (prefixLen < 0) prefixLen = 0;
  const suffix = allDigits.slice(prefixLen, prefixLen + strictness);
  if (
    suffix.match(/^0*$/) ||
    (suffix.match(/^9+$/) && [suffix.length, Infinity].includes(strictness))
  ) {
    const prefixBigint = BigInt(allDigits.slice(0, prefixLen));
    const roundUp = allDigits.charAt(prefixLen).match(/[5-9]/);
    return Nat(Number(roundUp ? prefixBigint + 1n : prefixBigint));
  }

  throw Fail`scaleToNat found precision loss at scale ${q(fixedPlaces)}: ${value}`;
};
harden(scaleToNat);
