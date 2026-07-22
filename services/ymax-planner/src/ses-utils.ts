/**
 * @file Utility functions that are dependent upon a hardened environment.
 */

import { Fail, q } from '@endo/errors';

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
