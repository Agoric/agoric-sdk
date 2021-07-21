// @ts-check

import { passStyleOf } from '@agoric/marshal';
import { assert, details as X, q } from '@agoric/assert';

const {
  is,
  defineProperty,
  getOwnPropertyNames,
  getOwnPropertyDescriptor,
} = Object;

// Shim of Object.fromEntries from
// https://github.com/tc39/proposal-object-from-entries/blob/master/polyfill.js
// TODO reconcile and dedup with the Object.fromEntries ponyfill in
// SES-shim/packages/ses/src/commons.js
function objectFromEntries(iter) {
  const obj = {};

  for (const pair of iter) {
    if (Object(pair) !== pair) {
      throw new TypeError('iterable for fromEntries should yield objects');
    }

    // Consistency with Map: contract is that entry has "0" and "1" keys, not
    // that it is an array or iterable.

    const { '0': key, '1': val } = pair;

    defineProperty(obj, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: val,
    });
  }

  return obj;
}

/**
 * This is the equality comparison used by JavaScript's Map and Set
 * abstractions, where NaN is the same as NaN and -0 is the same as
 * 0. Marshal serializes -0 as zero, so the semantics of our distributed
 * object system does not distinguish 0 from -0.
 *
 * `sameValueZero` is the EcmaScript spec name for this equality comparison,
 * but TODO we need a better name for the API.
 *
 * @param {any} x
 * @param {any} y
 * @returns {boolean}
 */
function sameValueZero(x, y) {
  return x === y || is(x, y);
}
harden(sameValueZero);

/**
 * A *passable* is something that may be marshalled. It consists of an acyclic
 * graph representing a tree of pass-by-copy data terminating in leaves of
 * passable non-pass-by-copy data. These leaves may be promises, or
 * pass-by-presence objects. A *comparable* is a passable whose leaves
 * contain no promises. Two comparables can be synchronously compared
 * for structural equivalence.
 *
 * We say that a function *reveals* an X when it returns either an X
 * or a promise for an X.
 *
 * Given a passable, reveal a corresponding comparable, where each
 * leaf promise of the passable has been replaced with its
 * corresponding comparable.
 *
 * @param {Passable} passable
 * @returns {Promise<Comparable>}
 */
function allComparable(passable) {
  // passStyleOf now asserts that passable has no pass-by-copy cycles.
  const passStyle = passStyleOf(passable);
  switch (passStyle) {
    case 'null':
    case 'undefined':
    case 'string':
    case 'boolean':
    case 'number':
    case 'bigint':
    case 'remotable':
    case 'copyError': {
      return passable;
    }
    case 'promise': {
      return passable.then(nonp => allComparable(nonp));
    }
    case 'copyArray': {
      const valPs = passable.map(p => allComparable(p));
      return Promise.all(valPs).then(vals => harden(vals));
    }
    case 'copyRecord': {
      const names = getOwnPropertyNames(passable);
      const valPs = names.map(name => allComparable(passable[name]));
      return Promise.all(valPs).then(vals =>
        harden(objectFromEntries(vals.map((val, i) => [names[i], val]))),
      );
    }
    default: {
      assert.fail(X`unrecognized passStyle ${passStyle}`, TypeError);
    }
  }
}
harden(allComparable);

/**
 * Are left and right structurally equivalent comparables? This
 * compares pass-by-copy data deeply until non-pass-by-copy values are
 * reached. The non-pass-by-copy values at the leaves of the
 * comparison may only be pass-by-presence objects. If they are
 * anything else, including promises, throw an error.
 *
 * Pass-by-presence objects compare identities.
 *
 * @param {Comparable} left
 * @param {Comparable} right
 * @returns {boolean}
 */
function sameStructure(left, right) {
  const leftStyle = passStyleOf(left);
  const rightStyle = passStyleOf(right);
  assert(
    leftStyle !== 'promise',
    X`Cannot structurally compare promises: ${left}`,
  );
  assert(
    rightStyle !== 'promise',
    X`Cannot structurally compare promises: ${right}`,
  );

  if (leftStyle !== rightStyle) {
    return false;
  }
  switch (leftStyle) {
    case 'null':
    case 'undefined':
    case 'string':
    case 'boolean':
    case 'number':
    case 'bigint':
    case 'remotable': {
      return sameValueZero(left, right);
    }
    case 'copyRecord':
    case 'copyArray': {
      const leftNames = getOwnPropertyNames(left);
      const rightNames = getOwnPropertyNames(right);
      if (leftNames.length !== rightNames.length) {
        return false;
      }
      for (const name of leftNames) {
        // TODO: Better hasOwnProperty check
        if (!getOwnPropertyDescriptor(right, name)) {
          return false;
        }
        // TODO: Make cycle tolerant
        if (!sameStructure(left[name], right[name])) {
          return false;
        }
      }
      return true;
    }
    case 'copyError': {
      return left.name === right.name && left.message === right.message;
    }
    default: {
      assert.fail(X`unrecognized passStyle ${leftStyle}`, TypeError);
    }
  }
}
harden(sameStructure);

function pathStr(path) {
  if (path === null) {
    return 'top';
  }
  const [base, index] = path;
  let i = index;
  const baseStr = pathStr(base);
  if (typeof i === 'string' && /^[a-zA-Z]\w*$/.test(i)) {
    return `${baseStr}.${i}`;
  }
  if (typeof i === 'string' && `${+i}` === i) {
    i = +i;
  }
  return `${baseStr}[${JSON.stringify(i)}]`;
}

// TODO: Reduce redundancy between sameStructure and
// mustBeSameStructureInternal
function mustBeSameStructureInternal(left, right, message, path) {
  function complain(problem) {
    assert.fail(
      X`${q(message)}: ${q(problem)} at ${q(
        pathStr(path),
      )}: (${left}) vs (${right})`,
    );
  }

  const leftStyle = passStyleOf(left);
  const rightStyle = passStyleOf(right);
  if (leftStyle === 'promise') {
    complain('Promise on left');
  }
  if (rightStyle === 'promise') {
    complain('Promise on right');
  }

  if (leftStyle !== rightStyle) {
    complain('different passing style');
  }
  switch (leftStyle) {
    case 'null':
    case 'undefined':
    case 'string':
    case 'boolean':
    case 'number':
    case 'bigint':
    case 'remotable': {
      if (!sameValueZero(left, right)) {
        complain('different');
      }
      break;
    }
    case 'copyRecord':
    case 'copyArray': {
      const leftNames = getOwnPropertyNames(left);
      const rightNames = getOwnPropertyNames(right);
      if (leftNames.length !== rightNames.length) {
        complain(`${leftNames.length} vs ${rightNames.length} own properties`);
      }
      for (const name of leftNames) {
        // TODO: Better hasOwnProperty check
        if (!getOwnPropertyDescriptor(right, name)) {
          complain(`${name} not found on right`);
        }
        // TODO: Make cycle tolerant
        mustBeSameStructureInternal(left[name], right[name], message, [
          path,
          name,
        ]);
      }
      break;
    }
    case 'copyError': {
      if (left.name !== right.name) {
        complain(`different error name: ${left.name} vs ${right.name}`);
      }
      if (left.message !== right.message) {
        complain(
          `different error message: ${left.message} vs ${right.message}`,
        );
      }
      break;
    }
    default: {
      complain(`unrecognized passStyle ${leftStyle}`);
      break;
    }
  }
}

/**
 * @param {Comparable} left
 * @param {Comparable} right
 * @param {string} message
 */
function mustBeSameStructure(left, right, message) {
  mustBeSameStructureInternal(left, right, `${message}`, null);
}
harden(mustBeSameStructure);

/**
 * If `val` would be a valid input to `sameStructure`, return
 * normally. Otherwise error.
 *
 * @param {Comparable} val
 */
function mustBeComparable(val) {
  mustBeSameStructure(val, val, 'not comparable');
}

export {
  sameValueZero,
  allComparable,
  sameStructure,
  mustBeSameStructure,
  mustBeComparable,
};
