// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { isPromise } from '@agoric/promise-kit';
import { isPrimitive, PASS_STYLE } from './helpers/passStyleHelpers.js';

import { CopyArrayPlug } from './helpers/copyArray.js';
import { CopyRecordPlug } from './helpers/copyRecord.js';
import { CopySetPlug } from './helpers/copySet.js';
import { CopyMapPlug } from './helpers/copyMap.js';
import { CopyErrorPlug } from './helpers/copyError.js';
import { RemotablePlug } from './helpers/remotable.js';

import './types.js';
import './helpers/internal-types.js';
/**
 * TODO Why do I need these?
 *
 * @typedef {import('./helpers/internal-types.js').PassStylePlug} PassStylePlug
 */
import '@agoric/assert/exported.js';
import { PatternNodePlug } from './helpers/patternNode.js';

const { details: X, quote: q } = assert;
const { ownKeys } = Reflect;
const { isFrozen } = Object;

/**
 * @param {PassStylePlug[]} passStylePlugs The passStylePlugs to register,
 * in priority order.
 * NOTE These must all be "trusted",
 * complete, and non-colliding. `makePassStyleOf` may *assume* that each plug
 * does what it is supposed to do. `makePassStyleOf` is not trying to defend
 * itself against malicious plugs, though it does defend against some
 * accidents.
 * @returns {{passStyleOf: PassStyleOf, PlugTable: any}}
 */
const makePassStyleOfKit = passStylePlugs => {
  const PlugTable = {
    __proto__: null,
    copyArray: undefined,
    copyRecord: undefined,
    copySet: undefined,
    copyMap: undefined,
    copyError: undefined,
    patternNode: undefined,
    remotable: undefined,
  };
  for (const plug of passStylePlugs) {
    const { styleName } = plug;
    assert(styleName in PlugTable);
    assert.equal(PlugTable[styleName], undefined);
    PlugTable[styleName] = plug;
  }
  for (const styleName of ownKeys(PlugTable)) {
    assert(
      PlugTable[styleName] !== undefined,
      X`missing plug for ${styleName}`,
    );
  }
  harden(PlugTable);
  const remotablePlug = PlugTable.remotable;

  /**
   * Purely for performance. However it is mutable static state, and
   * it does have some observability on proxies. TODO need to assess
   * whether this creates a static communications channel.
   *
   * passStyleOf does a full recursive walk of pass-by-copy
   * structures, in order to validate that they are acyclic. In addition
   * it is used by other algorithms to recursively walk these pass-by-copy
   * structures, so without this cache, these algorithms could be
   * O(N**2) or worse.
   *
   * @type {WeakMap<Passable, PassStyle>}
   */
  const passStyleOfCache = new WeakMap();

  /**
   * @type {PassStyleOf}
   */
  const passStyleOf = passable => {
    // Even when a WeakSet is correct, when the set has a shorter lifetime
    // than its keys, we prefer a Set due to expected implementation
    // tradeoffs.
    const inProgress = new Set();

    /**
     * @type {PassStyleOf}
     */
    const passStyleOfRecur = inner => {
      const isObject = !isPrimitive(inner);
      if (isObject) {
        if (passStyleOfCache.has(inner)) {
          // @ts-ignore TypeScript doesn't know that `get` after `has` is safe
          return passStyleOfCache.get(inner);
        }
        assert(
          !inProgress.has(inner),
          X`Pass-by-copy data cannot be cyclic ${inner}`,
        );
        inProgress.add(inner);
      }
      // eslint-disable-next-line no-use-before-define
      const passStyle = passStyleOfInternal(inner);
      if (isObject) {
        passStyleOfCache.set(inner, passStyle);
        inProgress.delete(inner);
      }
      return passStyle;
    };

    /**
     * @type {PassStyleOf}
     */
    const passStyleOfInternal = inner => {
      const typestr = typeof inner;
      switch (typestr) {
        case 'undefined':
        case 'string':
        case 'boolean':
        case 'number':
        case 'bigint':
        case 'symbol': {
          return typestr;
        }
        case 'object': {
          if (inner === null) {
            return 'null';
          }
          assert(
            isFrozen(inner),
            X`Cannot pass non-frozen objects like ${inner}. Use harden()`,
          );
          if (isPromise(inner)) {
            return 'promise';
          }
          assert(
            typeof inner.then !== 'function',
            X`Cannot pass non-promise thenables`,
          );
          const passStyleTag = inner[PASS_STYLE];
          if (passStyleTag !== undefined) {
            assert.typeof(passStyleTag, 'string');
            const plug = PlugTable[passStyleTag];
            assert(
              plug !== undefined,
              X`Unrecognized PassStyle: ${q(passStyleTag)}`,
            );
            plug.assertValid(inner, passStyleOfRecur);
            return /** @type {PassStyle} */ (passStyleTag);
          }
          for (const plug of passStylePlugs) {
            if (plug.canBeValid(inner)) {
              plug.assertValid(inner, passStyleOfRecur);
              return plug.styleName;
            }
          }
          remotablePlug.assertValid(inner, passStyleOfRecur);
          return 'remotable';
        }
        case 'function': {
          assert(
            isFrozen(inner),
            X`Cannot pass non-frozen objects like ${inner}. Use harden()`,
          );
          assert(
            typeof inner.then !== 'function',
            X`Cannot pass non-promise thenables`,
          );
          remotablePlug.assertValid(inner, passStyleOfRecur);
          return 'remotable';
        }
        default: {
          assert.fail(X`Unrecognized typeof ${q(typestr)}`, TypeError);
        }
      }
    };

    return passStyleOfRecur(passable);
  };
  return harden({ passStyleOf, PlugTable });
};

const { passStyleOf, PlugTable } = makePassStyleOfKit([
  CopyArrayPlug,
  CopyRecordPlug,
  CopySetPlug,
  CopyMapPlug,
  CopyErrorPlug,
  PatternNodePlug,
  RemotablePlug,
]);

export { passStyleOf };

export const everyPassableChild = (passable, fn) => {
  const passStyle = passStyleOf(passable);
  const plug = PlugTable[passStyle];
  if (plug) {
    // everyPassable guards .every so that each plug only gets a
    // genuine passable of its own flavor.
    return plug.every(passable, fn);
  }
  return true;
};
harden({ everyPassable: everyPassableChild });

// ////////////////////////// Comparable ///////////////////////////

/**
 * TODO If the path to the non-comparable becomes an important diagnostic,
 * consider factoring this into a checkComparable that also takes
 * a `path` and a `check` function.
 *
 * @param {Passable} passable
 * @returns {boolean}
 */
const isComparableInternal = passable => {
  const passStyle = passStyleOf(passable);
  switch (passStyle) {
    case 'null':
    case 'undefined':
    case 'string':
    case 'boolean':
    case 'number':
    case 'bigint': {
      return true;
    }

    case 'remotable':
    case 'copyArray':
    case 'copyRecord':
    case 'copySet':
    case 'copyMap': {
      // eslint-disable-next-line no-use-before-define
      return everyPassableChild(passable, isComparable);
    }

    // Errors are no longer comparable
    case 'copyError':
    case 'promise':
    case 'patternNode': {
      return false;
    }
    default: {
      assert.fail(X`Unrecognized passStyle: ${q(passStyle)}`, TypeError);
    }
  }
};

// Like the passStyleCache. An optimization only. Works because comparability
// is guaranteed stable.
const comparableCache = new WeakMap();

/**
 * If `passable` is not a Passable, throw. Otherwise say whether it is
 * comparable.
 *
 * @param {Passable} passable
 * @returns {boolean}
 */
export const isComparable = passable => {
  const isObject = !isPrimitive(passable);
  if (isObject) {
    if (comparableCache.has(passable)) {
      return comparableCache.get(passable);
    }
  }
  const result = isComparableInternal(passable);
  if (isObject) {
    comparableCache.set(passable, result);
  }
  return result;
};
harden(isComparable);

/**
 * @param {Comparable} comparable
 */
export const assertComparable = comparable =>
  assert(
    isComparable(comparable),
    X`Must be comparable: ${comparable}`,
    TypeError,
  );
harden(assertComparable);
