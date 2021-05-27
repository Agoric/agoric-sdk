// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { pureCopy, passStyleOf } from '@agoric/marshal';

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

/**
 * Assert that the keys of `record` are all in `allowedKeys`. If a key
 * of `record` is not in `allowedKeys`, throw an error. If a key in
 * `allowedKeys` is not a key of record, we do not throw an error.
 *
 * @param {string[]} allowedKeys
 * @param {Object} record
 */
export const assertKeysAllowed = (allowedKeys, record) => {
  const keys = Object.getOwnPropertyNames(record);
  assertSubset(allowedKeys, keys);
  // assert that there are no symbol properties.
  assert(
    Object.getOwnPropertySymbols(record).length === 0,
    X`no symbol properties allowed`,
  );
};

// eslint-disable-next-line jsdoc/require-returns-check
/**
 * @param {DisplayInfo} allegedDisplayInfo
 * @returns {asserts allegedDisplayInfo is DisplayInfo}
 */
function assertDisplayInfo(allegedDisplayInfo) {
  assert(
    passStyleOf(allegedDisplayInfo) === 'copyRecord',
    X`A displayInfo can only be a pass-by-copy record: ${allegedDisplayInfo}`,
  );
  const displayInfoKeys = harden(['decimalPlaces', 'assetKind']);
  assertKeysAllowed(displayInfoKeys, allegedDisplayInfo);
}
export { assertDisplayInfo };

/**
 * @param {AdditionalDisplayInfo} allegedDisplayInfo
 * @param {AssetKind} assetKind
 * @returns {DisplayInfo}
 */
export const coerceDisplayInfo = (allegedDisplayInfo, assetKind) => {
  const copyDisplayInfo = pureCopy(
    harden({ ...allegedDisplayInfo, assetKind }),
  );
  assertDisplayInfo(copyDisplayInfo);
  return copyDisplayInfo;
};
