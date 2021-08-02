// @ts-check

// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { E } from '@agoric/eventual-send';
/**
 * @template T
 * @typedef {import('@agoric/eventual-send').ERef<T>} ERef
 */
import { isPromise } from '@agoric/promise-kit';
import { getTag, passStyleOf } from '@agoric/marshal';
import { isKey } from './keyKind.js';

const { details: X, quote: q } = assert;
const { ownKeys } = Reflect;
const { fromEntries } = Object;

/**
 * We say that a function *reveals* an X when it returns either an X
 * or a promise for an X.
 *
 * Given a passable, reveal a corresponding key, where each
 * leaf promise of the passable has been replaced with the
 * corresponding key it fulfills to, recursively.
 * If any non-keys are encountered then reject the promise for the result.
 *
 * @param {Passable} val
 * @returns {ERef<Key>}
 */
export const fulfillToKey = val => {
  if (isKey(val)) {
    // Causes deep memoization, so is amortized fast.
    // This case takes care of all primitives, remotables, and copySets.
    // Anything that validates as a copySet can only contain keys, and
    // so is a key.
    return val;
  }
  if (isPromise(val)) {
    return E.when(val, nonp => fulfillToKey(nonp));
  }
  const passStyle = passStyleOf(val);
  switch (passStyle) {
    case 'copyRecord': {
      const names = ownKeys(val);
      const valPs = names.map(name => fulfillToKey(val[name]));
      return E.when(Promise.all(valPs), vals =>
        harden(fromEntries(vals.map((c, i) => [names[i], c]))),
      );
    }
    case 'copyArray': {
      const valPs = val.map(p => fulfillToKey(p));
      return E.when(Promise.all(valPs), vals => harden(vals));
    }
    case 'tagged': {
      const tag = getTag(val);
      // TODO implement
      assert.fail(X`fulfillToKey tagged ${q(tag)} not yet implemented: ${val}`);
    }
    case 'error': {
      assert.fail(X`An error cannot be a key: ${val}`);
    }
    case 'promise': {
      return E.when(val, nonp => fulfillToKey(nonp));
    }
    default: {
      assert.fail(X`Unexpected keyKind ${q(passStyle)}`, TypeError);
    }
  }
};
harden(fulfillToKey);
