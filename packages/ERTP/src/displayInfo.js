// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { pureCopy, assertRecord } from '@endo/marshal';

// TODO: assertSubset is copied from Zoe. Move this code to a location
// where it can be used by ERTP and Zoe easily. Perhaps another
// package.

/**
 * Assert all values from `part` appear in `whole`.
 *
 * @param {string[]} whole
 * @param {string[]} part
 */
const assertSubset = (whole, part) => {
  part.forEach(key => {
    assert(
      whole.includes(key),
      X`key ${q(key)} was not one of the expected keys ${q(whole)}`,
    );
  });
};

const displayInfoKeys = harden(['decimalPlaces', 'assetKind']);

/**
 * @param {AdditionalDisplayInfo} allegedDisplayInfo
 * @param {AssetKind} assetKind
 * @returns {DisplayInfo}
 */
export const coerceDisplayInfo = (allegedDisplayInfo, assetKind) => {
  // We include this check for a better error message
  assertRecord(allegedDisplayInfo, 'displayInfo');

  // `pureCopy` ensures the resulting object is not a proxy. Note that
  // `pureCopy` works in this case because displayInfo is a copyRecord
  // that is pure data, meaning no remotables and no promises.
  allegedDisplayInfo = pureCopy(allegedDisplayInfo);
  if (allegedDisplayInfo.assetKind !== undefined) {
    assert(
      allegedDisplayInfo.assetKind === assetKind,
      X`displayInfo.assetKind was present (${allegedDisplayInfo.assetKind}) and did not match the assetKind argument (${assetKind})`,
    );
  }
  const displayInfo = harden({ ...allegedDisplayInfo, assetKind });

  assertSubset(displayInfoKeys, Object.keys(displayInfo));
  if (displayInfo.decimalPlaces !== undefined) {
    assert.typeof(displayInfo.decimalPlaces, 'number');
  }
  return displayInfo;
};
