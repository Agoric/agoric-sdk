// @ts-check

import {
  makeFullOrderComparatorKit,
  sortByRank,
} from '../patterns/rankOrder.js';

const { details: X } = assert;

/**
 * Different than any valid value. Therefore, must not escape this module.
 *
 * @typedef {symbol} Pumpkin
 */
const PUMPKIN = Symbol('pumpkin');

/**
 * @template T
 * @typedef {T | Pumpkin} Opt
 */

/**
 * @template T
 * @param {Iterable<T>} xs
 * @param {Iterable<T>} ys
 * @param {CompareRank} fullCompare
 * @returns {Iterable<[Opt<T>,Opt<T>]>}
 */
const merge = (xs, ys, fullCompare) => {
  return harden({
    [Symbol.iterator]: () => {
      const xi = xs[Symbol.iterator]();
      /** @type {Opt<T>} */
      let x; // PUMPKIN when done
      const nextX = () => {
        assert(x !== PUMPKIN);
        const { done, value } = xi.next();
        x = done ? PUMPKIN : value;
      };
      nextX();

      const yi = ys[Symbol.iterator]();
      /** @type {Opt<T>} */
      let y; // PUMPKIN when done
      const nextY = () => {
        assert(y !== PUMPKIN);
        const { done, value } = yi.next();
        y = done ? PUMPKIN : value;
      };
      nextY();

      return harden({
        next: () => {
          /** @type {boolean} */
          let done = false;
          /** @type {[Opt<T>,Opt<T>]} */
          let value = [x, y];
          if (x === PUMPKIN && y === PUMPKIN) {
            done = true;
          } else if (x === PUMPKIN) {
            // only ys are left
            nextY();
          } else if (y === PUMPKIN) {
            // only xs are left
            nextX();
          } else {
            const comp = fullCompare(x, y);
            if (comp === 0) {
              // x and y are equivalent, so report both
              nextX();
              nextY();
            } else if (comp < 0) {
              // x is earlier, so report it
              value = [x, PUMPKIN];
              nextX();
            } else {
              // y is earlier, so report it
              assert(comp > 0);
              value = [PUMPKIN, y];
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

const isSupersetOp = xyi => {
  for (const [x, _yr] of xyi) {
    if (x === PUMPKIN) {
      // something in y is not in x, so x is not a superset of y
      return false;
    }
  }
  return true;
};

const isDisjointOp = xyi => {
  for (const [x, y] of xyi) {
    if (x !== PUMPKIN && y !== PUMPKIN) {
      // Something in both, so not disjoint
      return false;
    }
  }
  return true;
};

const unionOp = xyi => {
  const result = [];
  for (const [x, y] of xyi) {
    if (x !== PUMPKIN) {
      result.push(x);
    } else {
      assert(y !== PUMPKIN);
      // if x and y were both ready, then they were equivalent and
      // above clause already took care of it. Only push y
      // if x was absent.
      result.push(y);
    }
  }
  return result;
};

const disjointUnionOp = xyi => {
  const result = [];
  for (const [x, y] of xyi) {
    assert(
      x === PUMPKIN || y === PUMPKIN,
      X`Sets must not have common elements: ${x}`,
    );
    if (x !== PUMPKIN) {
      result.push(x);
    } else {
      assert(y !== PUMPKIN);
      result.push(y);
    }
  }
  return result;
};

const intersectionOp = xyi => {
  const result = [];
  for (const [x, y] of xyi) {
    if (x !== PUMPKIN && y !== PUMPKIN) {
      // If they are both present, then they were equivalent
      result.push(x);
    }
  }
  return result;
};

const disjointSubtractOp = xyi => {
  const result = [];
  for (const [x, y] of xyi) {
    assert(x !== PUMPKIN, X`right element ${y} was not in left`);
    if (y === PUMPKIN) {
      // the x was not in y
      result.push(x);
    }
  }
  return result;
};

/**
 * @template T
 * @typedef {Object} SetOps
 * @property {CompareRank} fullCompare
 * @property {(xlist: T[], ylist: T[]) => boolean} isSuperset
 * @property {(xlist: T[], ylist: T[]) => boolean} isDisjoint
 * @property {(xlist: T[], ylist: T[]) => T[]} union
 * @property {(xlist: T[], ylist: T[]) => T[]} disjointUnion
 * @property {(xlist: T[], ylist: T[]) => T[]} intersection
 * @property {(xlist: T[], ylist: T[]) => T[]} disjointSubtract
 */

/**
 * @template T
 * @param {boolean=} longLived
 * @returns {SetOps<T>}
 */
export const makeSetOps = (longLived = false) => {
  const { antiComparator: fullCompare } = makeFullOrderComparatorKit(longLived);
  const composeOp = op => (xlist, ylist) => {
    const xs = sortByRank(xlist, fullCompare);
    const ys = sortByRank(ylist, fullCompare);
    const xyi = merge(xs, ys, fullCompare);
    return op(xyi);
  };
  return harden({
    fullCompare,
    isSuperset: composeOp(isSupersetOp),
    isDisjoint: composeOp(isDisjointOp),
    union: composeOp(unionOp),
    disjointUnion: composeOp(disjointUnionOp),
    intersection: composeOp(intersectionOp),
    disjointSubtract: composeOp(disjointSubtractOp),
  });
};
harden(makeSetOps);
