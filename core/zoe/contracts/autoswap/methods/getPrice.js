import harden from '@agoric/harden';
import {
  assetDescsToExtentsArray,
  makeAssetDesc,
} from '../../../contractUtils';
import { calculateSwap, getTokenIndices } from '../calculateSwap';
/**
 * `getPrice` calculates the result of a trade, given a certain assetDesc
 * of tokens in.
 * @param  {object} zoeInstance - the zoeInstance for the governing contract.
 * @param  {object} poolOfferId  - the unique offer id object for the
 * liquidity pool.
 */
const makeGetPrice = (zoeInstance, poolOfferId) => assetDescsIn => {
  const poolExtents = zoeInstance.getExtentsFor(harden([poolOfferId]))[0];
  const extentOpsArray = zoeInstance.getExtentOpsArray();
  const labels = zoeInstance.getLabels();
  const extentsIn = assetDescsToExtentsArray(extentOpsArray, assetDescsIn);
  const { tokenOutIndex } = getTokenIndices(extentsIn);
  const { tokenOutQ } = calculateSwap(poolExtents, extentsIn);
  return makeAssetDesc(
    extentOpsArray[tokenOutIndex],
    labels[tokenOutIndex],
    tokenOutQ,
  );
};
harden(makeGetPrice);

export { makeGetPrice };
