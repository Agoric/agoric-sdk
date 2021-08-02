// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { compareRank } from '@agoric/marshal';
import { keyKindOf } from './keyKind.js';

const { details: X } = assert;
const { ownKeys } = Reflect;

/**
 * @typedef {-1 | 0 | 1 | undefined} KeyComp
 */

/**
 * @param {Key} left
 * @param {Key} right
 * @returns {KeyComp}
 */
export const compareKeys = (left, right) => {
  const leftKeyKind = keyKindOf(left);
  const rightKeyKind = keyKindOf(right);
  if (leftKeyKind !== rightKeyKind) {
    // Different keyKinds are incommensurate
    return undefined;
  }
  switch (leftKeyKind) {
    case 'undefined':
    case 'null':
    case 'boolean':
    case 'bigint':
    case 'string': {
      // for these, keys compare the same as rank
      return compareRank(left, right);
    }
    case 'number': {
      const rankComp = compareRank(left, right);
      if (rankComp === 0) {
        return 0;
      }
      if (Number.isNaN(left) || Number.isNaN(right)) {
        // NaN is equal to itself, but incommensurate with everything else
        assert(!Number.isNaN(left) || !Number.isNaN(right));
        return undefined;
      }
      return rankComp;
    }
    case 'symbol':
    case 'remotable': {
      if (left === right) {
        return 0;
      }
      // For both symbols and remotables, if they are not the sameKey then,
      // as keys, they are incommensurate.
      return undefined;
    }
    case 'copyArray': {
      // Lexicographic
      const len = Math.min(left.length, right.length);
      for (let i = 0; i < len; i += 1) {
        const result = compareKeys(left[i], right[i]);
        if (result !== 0) {
          return result;
        }
      }
      // If all matching elements are sameKey, then according to their lengths
      return compareRank(left.length, right.length);
    }
    case 'copyRecord': {
      // Pareto partial order comparison
      const leftNames = harden(ownKeys(left).sort());
      const rightNames = harden(ownKeys(right).sort());
      // eslint-disable-next-line no-use-before-define
      if (!sameKey(leftNames, rightNames)) {
        // If they do not have exactly the same properties,
        // they are incommensurate
        return undefined;
      }
      /** @type {-1 | 0 | 1} */
      let result = 0; // start with hypothesis they are sameKey
      for (const name of leftNames) {
        const comp = compareKeys(left[name], right[name]);
        if (comp === undefined) {
          return undefined;
        }
        if (result !== comp && comp !== 0) {
          if (result === 0) {
            result = comp;
          } else {
            assert(
              (result === -1 && comp === 1) || (result === 1 && comp === -1),
            );
            return undefined;
          }
        }
      }
      return result;
    }
    case 'copySet': {
      // TODO implement
      assert.fail(X`Set comparison not yet implemented: ${left} vs ${right}`);
    }
    case 'copyMap': {
      // TODO implement
      assert.fail(X`Map comparison not yet implemented: ${left} vs ${right}`);
    }
    default: {
      return undefined;
    }
  }
};
harden(compareKeys);

export const sameKey = (left, right) => compareKeys(left, right) === 0;
harden(sameKey);
