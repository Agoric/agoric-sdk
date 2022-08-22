// @ts-check

import { assert, details as X } from '@agoric/assert';
import { fit } from '@agoric/store';

import { DisplayInfoShape } from './typeGuards.js';

/**
 * @param {AdditionalDisplayInfo} allegedDisplayInfo
 * @param {AssetKind} assetKind
 * @returns {DisplayInfo}
 */
export const coerceDisplayInfo = (allegedDisplayInfo, assetKind) => {
  fit(allegedDisplayInfo, DisplayInfoShape, 'displayInfo');

  if (allegedDisplayInfo.assetKind !== undefined) {
    if (!(allegedDisplayInfo.assetKind === assetKind)) {
      assert.fail(
        X`displayInfo.assetKind was present (${allegedDisplayInfo.assetKind}) and did not match the assetKind argument (${assetKind})`,
      );
    }
  }
  const displayInfo = harden({ ...allegedDisplayInfo, assetKind });

  if (displayInfo.decimalPlaces !== undefined) {
    if (!Number.isSafeInteger(displayInfo.decimalPlaces)) {
      assert.fail(
        X`decimalPlaces ${displayInfo.decimalPlaces} is not a safe integer`,
      );
    }
  }

  return displayInfo;
};
