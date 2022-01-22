// @ts-check

import {
  assertRankSorted,
  compareAntiRank,
  makeFullOrderComparatorKit,
  sortByRank,
} from '../patterns/rankOrder.js';
import { makeSetOfElements } from './copySet.js';

const { details: X } = assert;

/**
 * Asserts that `elements` is already rank sorted by `rankCompare`, where there
 * may be contiguous regions of elements tied for the same rank.
 * Returns an iterable that will enumerate all the elements in order
 * according to `fullOrder`, which should differ from `rankOrder` only
 * by being more precise.
 *
 * This should be equivalent to resorting the entire `elements` array according
 *  to `fullOrder`. However, it optimizes for the case where these contiguous
 * runs that need to be resorted are either absent or small.
 *
 * @template T
 * @param {T[]} elements
 * @param {FullCompare} rankCompare
 * @param {FullCompare} fullCompare
 * @returns {Iterable<T>}
 */
const windowResort = (elements, rankCompare, fullCompare) => {
  assertRankSorted(elements, rankCompare);
  const { length } = elements;
  let i = 0;
  let optInnerIterator;
  return harden({
    [Symbol.iterator]: () =>
      harden({
        next: () => {
          if (optInnerIterator) {
            const result = optInnerIterator.next();
            if (result.done) {
              optInnerIterator = undefined;
              // fall through
            } else {
              return result;
            }
          }
          if (i < length) {
            const value = elements[i];
            let j = i + 1;
            while (j < length && rankCompare(value, elements[j]) === 0) {
              j += 1;
            }
            if (j === i + 1) {
              i = j;
              return harden({ done: false, value });
            }
            const similarRun = elements.slice(i, j);
            i = j;
            const resorted = sortByRank(similarRun, fullCompare);
            optInnerIterator = resorted[Symbol.iterator]();
            return optInnerIterator.next();
          } else {
            return harden({ done: true, value: null });
          }
        },
      }),
  });
};

/**
 * @template T
 * @param {T[]} xelements
 * @param {T[]} yelements
 * @returns {Iterable<[T,bigint,bigint]>}
 */
const merge = (xelements, yelements) => {
  // This fullOrder contains history dependent state. It is specific
  // to this one `merge` call and does not survive it.
  const fullCompare = makeFullOrderComparatorKit().antiComparator;

  const xs = windowResort(xelements, compareAntiRank, fullCompare);
  const ys = windowResort(yelements, compareAntiRank, fullCompare);
  return harden({
    [Symbol.iterator]: () => {
      const xi = xs[Symbol.iterator]();
      /** @type {T} */
      let x;
      let xDone;
      const nextX = () => {
        assert(!xDone);
        ({ done: xDone, value: x } = xi.next());
      };
      nextX();

      const yi = ys[Symbol.iterator]();
      /** @type {T} */
      let y;
      let yDone;
      const nextY = () => {
        assert(!yDone);
        ({ done: yDone, value: y } = yi.next());
      };
      nextY();

      return harden({
        next: () => {
          /** @type {boolean} */
          let done = false;
          /** @type {[T,bigint,bigint]} */
          let value;
          if (xDone && yDone) {
            done = true;
            // @ts-ignore Because the terminating value does not matter
            value = [null, 0n, 0n];
          } else if (xDone) {
            // only ys are left
            value = [y, 0n, 1n];
            nextY();
          } else if (yDone) {
            // only xs are left
            value = [x, 1n, 0n];
            nextX();
          } else {
            const comp = fullCompare(x, y);
            if (comp === 0) {
              // x and y are equivalent, so report both
              value = [x, 1n, 1n];
              nextX();
              nextY();
            } else if (comp < 0) {
              // x is earlier, so report it
              value = [x, 1n, 0n];
              nextX();
            } else {
              // y is earlier, so report it
              assert(comp > 0);
              value = [y, 0n, 1n];
              nextY();
            }
          }
          return harden({ done, value });
        },
      });
    },
  });
};
harden(merge);

const iterIsSuperset = xyi => {
  for (const [_m, xc, _yc] of xyi) {
    if (xc === 0n) {
      // something in y is not in x, so x is not a superset of y
      return false;
    }
  }
  return true;
};

const iterIsDisjoint = xyi => {
  for (const [_m, xc, yc] of xyi) {
    if (xc >= 1n && yc >= 1n) {
      // Something in both, so not disjoint
      return false;
    }
  }
  return true;
};

const iterCompare = xyi => {
  let loneY = false;
  let loneX = false;
  for (const [_m, xc, yc] of xyi) {
    if (xc === 0n) {
      // something in y is not in x, so x is not a superset of y
      loneY = true;
    }
    if (yc === 0n) {
      // something in x is not in y, so y is not a superset of x
      loneX = true;
    }
    if (loneX && loneY) {
      return NaN;
    }
  }
  if (loneX) {
    return 1;
  } else if (loneY) {
    return -1;
  } else {
    assert(!loneX && !loneY);
    return 0;
  }
};

const iterUnion = xyi => {
  const result = [];
  for (const [m, xc, yc] of xyi) {
    if (xc >= 0n) {
      result.push(m);
    } else {
      assert(yc >= 0n);
      // if x and y were both ready, then they were equivalent and
      // above clause already took care of it. Otherwise push here.
      result.push(m);
    }
  }
  return result;
};

const iterDisjointUnion = xyi => {
  const result = [];
  for (const [m, xc, yc] of xyi) {
    assert(xc === 0n || yc === 0n, X`Sets must not have common elements: ${m}`);
    if (xc >= 1n) {
      result.push(m);
    } else {
      assert(yc >= 1n);
      result.push(m);
    }
  }
  return result;
};

const iterIntersection = xyi => {
  const result = [];
  for (const [m, xc, yc] of xyi) {
    if (xc >= 1n && yc >= 1n) {
      // If they are both present, then they were equivalent
      result.push(m);
    }
  }
  return result;
};

const iterDisjointSubtract = xyi => {
  const result = [];
  for (const [m, xc, yc] of xyi) {
    assert(xc >= 1n, X`right element ${m} was not in left`);
    if (yc === 0n) {
      // the x was not in y
      result.push(m);
    }
  }
  return result;
};

const mergeify = iterOp => (xelements, yelements) =>
  iterOp(merge(xelements, yelements));

export const elementsIsSuperset = mergeify(iterIsSuperset);
export const elementsIsDisjoint = mergeify(iterIsDisjoint);
export const elementsCompare = mergeify(iterCompare);
export const elementsUnion = mergeify(iterUnion);
export const elementsDisjointUnion = mergeify(iterDisjointUnion);
export const elementsIntersection = mergeify(iterIntersection);
export const elementsDisjointSubtract = mergeify(iterDisjointSubtract);

const rawSetify = elementsOp => (xset, yset) =>
  elementsOp(xset.payload, yset.payload);

const setify = elementsOp => (xset, yset) =>
  makeSetOfElements(elementsOp(xset.payload, yset.payload));

export const setIsSuperset = rawSetify(elementsIsSuperset);
export const setIsDisjoint = rawSetify(elementsIsDisjoint);
export const setCompare = rawSetify(elementsCompare);
export const setUnion = setify(elementsUnion);
export const setDisjointUnion = setify(elementsDisjointUnion);
export const setIntersection = setify(elementsIntersection);
export const setDisjointSubtract = setify(elementsDisjointSubtract);
