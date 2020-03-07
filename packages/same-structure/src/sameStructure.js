import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';
import { assert, details, openDetail } from '@agoric/assert';
import { sameKey } from '../../store/src/store';

// Shim of Object.fromEntries from
// https://github.com/tc39/proposal-object-from-entries/blob/master/polyfill.js
function ObjectFromEntries(iter) {
  const obj = {};

  for (const pair of iter) {
    if (Object(pair) !== pair) {
      throw new TypeError('iterable for fromEntries should yield objects');
    }

    // Consistency with Map: contract is that entry has "0" and "1" keys, not
    // that it is an array or iterable.

    const { '0': key, '1': val } = pair;

    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: val,
    });
  }

  return obj;
}

// A *passable* is something that may be marshalled. It consists of a
// graph of pass-by-copy data terminating in leaves of passable
// non-pass-by-copy data. These leaves may be promises, or
// pass-by-presence objects. A *comparable* is a passable whose leaves
// contain no promises. Two comparables can be synchronously compared
// for structural equivalence.
//
// TODO: Currently, all algorithms here treat the pass-by-copy
// superstructure as a tree. This means that dags are unwound at
// potentially exponential cost, and cycles cause failure to
// terminate. We must fix both problems, making all these algorithms
// graph-aware.

// We say that a function *reveals* an X when it returns either an X
// or a promise for an X.

// Given a passable, reveal a corresponding comparable, where each
// leaf promise of the passable has been replaced with its
// corresponding comparable.
function allComparable(passable) {
  const passStyle = passStyleOf(passable);
  switch (passStyle) {
    case 'null':
    case 'undefined':
    case 'string':
    case 'boolean':
    case 'number':
    case 'symbol':
    case 'bigint':
    case 'presence':
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
      const names = Object.getOwnPropertyNames(passable);
      const valPs = names.map(name => allComparable(passable[name]));
      return Promise.all(valPs).then(vals =>
        harden(ObjectFromEntries(vals.map((val, i) => [names[i], val]))),
      );
    }
    default: {
      throw new TypeError(`unrecognized passStyle ${passStyle}`);
    }
  }
}
harden(allComparable);

// Are left and right structurally equivalent comparables? This
// compares pass-by-copy data deeply until non-pass-by-copy values are
// reached. The non-pass-by-copy values at the leaves of the
// comparison may only be pass-by-presence objects. If they are
// anything else, including promises, throw an error.
//
// Pass-by-presence objects compare identities.

function sameStructure(left, right) {
  const leftStyle = passStyleOf(left);
  const rightStyle = passStyleOf(right);
  assert(
    leftStyle !== 'promise',
    details`Cannot structurally compare promises: ${left}`,
  );
  assert(
    rightStyle !== 'promise',
    details`Cannot structurally compare promises: ${right}`,
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
    case 'symbol':
    case 'bigint':
    case 'presence': {
      return sameKey(left, right);
    }
    case 'copyRecord':
    case 'copyArray': {
      const leftNames = Object.getOwnPropertyNames(left);
      const rightNames = Object.getOwnPropertyNames(right);
      if (leftNames.length !== rightNames.length) {
        return false;
      }
      for (const name of leftNames) {
        // TODO: Better hasOwnProperty check
        if (!Object.getOwnPropertyDescriptor(right, name)) {
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
      throw new TypeError(`unrecognized passStyle ${leftStyle}`);
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
      details`${openDetail(message)}: ${openDetail(problem)} at ${openDetail(
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
    case 'symbol':
    case 'bigint':
    case 'presence': {
      if (!sameKey(left, right)) {
        complain('different');
      }
      break;
    }
    case 'copyRecord':
    case 'copyArray': {
      const leftNames = Object.getOwnPropertyNames(left);
      const rightNames = Object.getOwnPropertyNames(right);
      if (leftNames.length !== rightNames.length) {
        complain(`${leftNames.length} vs ${rightNames.length} own properties`);
      }
      for (const name of leftNames) {
        // TODO: Better hasOwnProperty check
        if (!Object.getOwnPropertyDescriptor(right, name)) {
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
function mustBeSameStructure(left, right, message) {
  mustBeSameStructureInternal(left, right, `${message}`, null);
}
harden(mustBeSameStructure);

// If `val` would be a valid input to `sameStructure`, return
// normally. Otherwise error.
function mustBeComparable(val) {
  mustBeSameStructure(val, val, 'not comparable');
}

export { allComparable, sameStructure, mustBeSameStructure, mustBeComparable };
