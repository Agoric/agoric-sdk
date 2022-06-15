// @ts-check

import { assert, details as X, q } from '@agoric/assert';
import { assertRecord, isObject, passStyleOf } from '@endo/marshal';

// One GOOGOLth should be enough decimal places for anybody.
export const MAX_ABSOLUTE_DECIMAL_PLACES = 100;

// TODO Once https://github.com/endojs/endo/pull/1061 is merged, then we
// should add `assertPure` to the imports from `@endo/marshal` and remove
// the redundant definition here.
const assertPure = (pureData, optNameOfData = 'Allegedly pure data') => {
  const passStyle = passStyleOf(pureData);
  switch (passStyle) {
    case 'copyArray':
    case 'copyRecord':
    case 'tagged': {
      return true;
    }
    default: {
      if (!isObject(pureData)) {
        return true;
      }
      assert.fail(
        X`${q(optNameOfData)} ${pureData} must be pure, not a ${q(passStyle)}`,
      );
    }
  }
};

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
  assertPure(allegedDisplayInfo, 'displayInfo');

  if (allegedDisplayInfo.assetKind !== undefined) {
    assert(
      allegedDisplayInfo.assetKind === assetKind,
      X`displayInfo.assetKind was present (${allegedDisplayInfo.assetKind}) and did not match the assetKind argument (${assetKind})`,
    );
  }
  const displayInfo = harden({ ...allegedDisplayInfo, assetKind });

  assertSubset(displayInfoKeys, Object.keys(displayInfo));
  if (displayInfo.decimalPlaces !== undefined) {
    assert(
      Number.isSafeInteger(displayInfo.decimalPlaces),
      X`decimalPlaces ${displayInfo.decimalPlaces} is not a safe integer`,
    );
    assert(
      displayInfo.decimalPlaces <= MAX_ABSOLUTE_DECIMAL_PLACES,
      X`decimalPlaces ${displayInfo.decimalPlaces} exceeds ${MAX_ABSOLUTE_DECIMAL_PLACES}`,
    );
    assert(
      displayInfo.decimalPlaces >= -MAX_ABSOLUTE_DECIMAL_PLACES,
      X`decimalPlaces ${displayInfo.decimalPlaces} is less than -${MAX_ABSOLUTE_DECIMAL_PLACES}`,
    );
  }

  return displayInfo;
};
