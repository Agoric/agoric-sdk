// @jessie-check

import { Fail } from '@endo/errors';
import { mustMatch } from '@agoric/store';

import { DisplayInfoShape } from './typeGuards.js';

/** @import {AdditionalDisplayInfo, AssetKind, DisplayInfo} from './types.js' */

/**
 * @param {AdditionalDisplayInfo} allegedDisplayInfo
 * @param {AssetKind} assetKind
 * @returns {DisplayInfo}
 */
export const coerceDisplayInfo = (allegedDisplayInfo, assetKind) => {
  mustMatch(allegedDisplayInfo, DisplayInfoShape, 'displayInfo');

  if (allegedDisplayInfo.assetKind !== undefined) {
    allegedDisplayInfo.assetKind === assetKind ||
      Fail`displayInfo.assetKind was present (${allegedDisplayInfo.assetKind}) and did not match the assetKind argument (${assetKind})`;
  }
  const displayInfo = harden({ ...allegedDisplayInfo, assetKind });

  if (displayInfo.decimalPlaces !== undefined) {
    Number.isSafeInteger(displayInfo.decimalPlaces) ||
      Fail`decimalPlaces ${displayInfo.decimalPlaces} is not a safe integer`;
  }

  return displayInfo;
};
