// @ts-check

import { sortByRank } from '../patterns/rankOrder.js';
import {
  getCopySetKeys,
  makeCheckNoDuplicates,
  makeCopySet,
} from './copySet.js';

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
 * @param {FullCompare} fullCompare
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

const isIterSuperset = xyi => {
  for (const [x, _yr] of xyi) {
    if (x === PUMPKIN) {
      // something in y is not in x, so x is not a superset of y
      return false;
    }
  }
  return true;
};

const isIterDisjoint = xyi => {
  for (const [x, y] of xyi) {
    if (x !== PUMPKIN && y !== PUMPKIN) {
      // Something in both, so not disjoint
      return false;
    }
  }
  return true;
};

const iterUnion = xyi => {
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

const iterDisjointUnion = xyi => {
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

const iterIntersection = xyi => {
  const result = [];
  for (const [x, y] of xyi) {
    if (x !== PUMPKIN && y !== PUMPKIN) {
      // If they are both present, then they were equivalent
      result.push(x);
    }
  }
  return result;
};

const iterDisjointSubtract = xyi => {
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
 *
 * @property {(keys: Key[], check?: Checker) => boolean} checkNoDuplicates
 *
 * @property {(xlist: T[], ylist: T[]) => boolean} isListSuperset
 * @property {(xlist: T[], ylist: T[]) => boolean} isListDisjoint
 * @property {(xlist: T[], ylist: T[]) => T[]} listUnion
 * @property {(xlist: T[], ylist: T[]) => T[]} listDisjointUnion
 * @property {(xlist: T[], ylist: T[]) => T[]} listIntersection
 * @property {(xlist: T[], ylist: T[]) => T[]} listDisjointSubtract
 *
 * @property {(x: CopySet<T>, y: CopySet<T>) => boolean} isSetSuperset
 * @property {(x: CopySet<T>, y: CopySet<T>) => boolean} isSetDisjoint
 * @property {(x: CopySet<T>, y: CopySet<T>) => CopySet<T>} setUnion
 * @property {(x: CopySet<T>, y: CopySet<T>) => CopySet<T>} setDisjointUnion
 * @property {(x: CopySet<T>, y: CopySet<T>) => CopySet<T>} setIntersection
 * @property {(x: CopySet<T>, y: CopySet<T>) => CopySet<T>} setDisjointSubtract
 */

/**
 * @template T
 * @param {FullCompare} fullCompare
 * Must be a total order, not just a rank order. See makeFullOrderComparatorKit.
 * @returns {SetOps<T>}
 */
export const makeSetOps = fullCompare => {
  const checkNoDuplicates = makeCheckNoDuplicates(fullCompare);

  const listify = iterOp => (xlist, ylist) => {
    const xs = sortByRank(xlist, fullCompare);
    const ys = sortByRank(ylist, fullCompare);
    const xyi = merge(xs, ys, fullCompare);
    return iterOp(xyi);
  };

  const isListSuperset = listify(isIterSuperset);
  const isListDisjoint = listify(isIterDisjoint);
  const listUnion = listify(iterUnion);
  const listDisjointUnion = listify(iterDisjointUnion);
  const listIntersection = listify(iterIntersection);
  const listDisjointSubtract = listify(iterDisjointSubtract);

  const rawSetify = listOp => (xset, yset) =>
    listOp(getCopySetKeys(xset), getCopySetKeys(yset));

  const setify = listOp => (xset, yset) =>
    makeCopySet(listOp(getCopySetKeys(xset), getCopySetKeys(yset)));

  return harden({
    checkNoDuplicates,

    isListSuperset,
    isListDisjoint,
    listUnion,
    listDisjointUnion,
    listIntersection,
    listDisjointSubtract,

    isSetSuperset: rawSetify(isListSuperset),
    isSetDisjoint: rawSetify(isListDisjoint),
    setUnion: setify(listUnion),
    setDisjointUnion: setify(listDisjointUnion),
    setIntersection: setify(listIntersection),
    setDisjointSubtract: setify(listDisjointSubtract),
  });
};
harden(makeSetOps);
