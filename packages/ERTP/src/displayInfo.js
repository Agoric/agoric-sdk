// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import {
  pureCopy,
  passStyleOf,
  REMOTE_STYLE,
  getInterfaceOf,
} from '@agoric/marshal';

// TODO: assertSubset and assertKeysAllowed are copied from Zoe. Move
// this code to a location where it can be used by ERTP and Zoe
// easily. Perhaps another package.

/**
 * Assert all values from `part` appear in `whole`.
 *
 * @param {string[]} whole
 * @param {string[]} part
 */
export const assertSubset = (whole, part) => {
  part.forEach(key => {
    assert.typeof(key, 'string');
    assert(
      whole.includes(key),
      X`key ${q(key)} was not one of the expected keys ${q(whole)}`,
    );
  });
};

// Assert that the keys of `record` are all in `allowedKeys`. If a key
// of `record` is not in `allowedKeys`, throw an error. If a key in
// `allowedKeys` is not a key of record, we do not throw an error.
export const assertKeysAllowed = (allowedKeys, record) => {
  const keys = Object.getOwnPropertyNames(record);
  assertSubset(allowedKeys, keys);
  // assert that there are no symbol properties.
  assert(
    Object.getOwnPropertySymbols(record).length === 0,
    X`no symbol properties allowed`,
  );
};

export const assertDisplayInfo = allegedDisplayInfo => {
  if (allegedDisplayInfo === undefined) {
    return;
  }
  const displayInfoKeys = harden(['decimalPlaces']);
  assertKeysAllowed(displayInfoKeys, allegedDisplayInfo);
};

export const coerceDisplayInfo = allegedDisplayInfo => {
  if (passStyleOf(allegedDisplayInfo) === REMOTE_STYLE) {
    // These condition together try to ensure that `allegedDisplayInfo`
    // is a plain empty object. It will accept all plain empty objects
    // that it should. It will reject most things we want to reject including
    // remotables that are explicitly declared `Remotable`. But a normal
    // HandledPromise presence not explicitly declared `Remotable` will
    // be mistaken for a plain empty object. Even in this case, the copy
    // has a new identity, so the only danger is that we didn't reject
    // with a diagnostic, potentially masking a programmer error.
    assert(Object.isFrozen(allegedDisplayInfo));
    assert.equal(Reflect.ownKeys(allegedDisplayInfo).length, 0);
    assert.equal(Object.getPrototypeOf(allegedDisplayInfo), Object.prototype);
    assert.equal(getInterfaceOf(allegedDisplayInfo), undefined);
    return harden({});
  }
  allegedDisplayInfo = pureCopy(allegedDisplayInfo);
  assertDisplayInfo(allegedDisplayInfo);
  return allegedDisplayInfo;
};
