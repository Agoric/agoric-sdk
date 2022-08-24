// @ts-check

import { assert, details as X } from '@agoric/assert';
import { fit } from '@agoric/store';

import { DisplayInfoSchema } from './typeGuards.js';

/**
 * @param {AdditionalDisplayInfo} allegedDisplayInfo
 * @param {AssetKind} assetKind
 * @returns {DisplayInfo}
 */
export const coerceDisplayInfo = (allegedDisplayInfo, assetKind) => {
  fit(allegedDisplayInfo, DisplayInfoSchema, 'displayInfo');

  if (allegedDisplayInfo.assetKind !== undefined) {
    assert(
      allegedDisplayInfo.assetKind === assetKind,
      X`displayInfo.assetKind was present (${allegedDisplayInfo.assetKind}) and did not match the assetKind argument (${assetKind})`,
    );
  }
  const displayInfo = harden({ ...allegedDisplayInfo, assetKind });

  if (displayInfo.decimalPlaces !== undefined) {
    assert(
      Number.isSafeInteger(displayInfo.decimalPlaces),
      X`decimalPlaces ${displayInfo.decimalPlaces} is not a safe integer`,
    );
  }

  return displayInfo;
};
