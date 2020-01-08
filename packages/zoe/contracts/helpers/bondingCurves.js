import Nat from '@agoric/nat';
import harden from '@agoric/harden';
import { insist } from '@agoric/ertp/util/insist';

import { natSafeMath } from './safeMath';

const { add, subtract, multiply, floorDivide } = natSafeMath;

/**
 * Contains the logic for calculating how many units should be given
 * back to the user in exchange for what they sent in. It also
 * calculates the new units of the assets in the pool. Reused in
 * several different places, including to check whether an offer is
 * valid, getting the current price for an asset on user request, and
 * to do the actual reallocation after an offer has been made.
 * @param  {object} zoe - the contract facet of Zoe
 * @param  {assay[]} assays - an array of assays
 *
 * Once the function is made, it has the following parameters:
 * @param  {units[]} poolUnitsArray - an array of the current units in the
 * liquidity pool
 * @param  {units} unitsIn - the units sent in by a user
 * @param  {number} feeInTenthOfPercent=3 - the fee taken in tenths of
 * a percent. The default is 0.3%. The fee is taken from unitsIn
 */

export const makeGetPrice = (zoe, assays) => (
  poolUnitsArray,
  unitsIn,
  feeInTenthOfPercent = 3,
) => {
  Nat(feeInTenthOfPercent);
  insist(feeInTenthOfPercent < 1000)`fee is not less than 1000`;
  const oneMinusFee = subtract(1000, feeInTenthOfPercent);

  // Calculates how much can be bought by selling input
  const getInputPrice = (input, inputReserve, outputReserve) => {
    const inputWithFee = multiply(input, oneMinusFee);
    const numerator = multiply(inputWithFee, outputReserve);
    const denominator = add(multiply(inputReserve, 1000), inputWithFee);
    return floorDivide(numerator, denominator);
  };

  // Calculates how much needed to buy output
  // Not currently used in this version of autoswap
  // eslint-disable-next-line no-unused-vars
  const getOutputPrice = (output, inputReserve, outputReserve) => {
    const numerator = multiply(multiply(inputReserve, output), 1000);
    const denominator = multiply(subtract(outputReserve, output), oneMinusFee);
    return add(floorDivide(numerator, denominator), 1);
  };

  const assayIn = unitsIn.label.assay;
  const X = 0;
  const Y = 1;
  const [xUnitOps, yUnitOps] = zoe.getUnitOpsForAssays(assays);
  const xReserve = poolUnitsArray[X].extent;
  const yReserve = poolUnitsArray[Y].extent;
  if (assayIn === assays[X]) {
    const xExtentIn = unitsIn.extent;
    const yExtentOut = getInputPrice(xExtentIn, xReserve, yReserve);
    const newPoolUnitsArray = [...poolUnitsArray];
    newPoolUnitsArray[X] = xUnitOps.make(add(xReserve, xExtentIn));
    newPoolUnitsArray[Y] = yUnitOps.make(subtract(yReserve, yExtentOut));
    return {
      unitsOut: yUnitOps.make(yExtentOut),
      newPoolUnitsArray: harden(newPoolUnitsArray),
    };
  }
  if (assayIn === assays[Y]) {
    const yExtentIn = unitsIn.extent;
    const xExtentOut = getInputPrice(yExtentIn, yReserve, xReserve);
    const newPoolUnitsArray = [...poolUnitsArray];
    newPoolUnitsArray[X] = xUnitOps.make(subtract(xReserve, xExtentOut));
    newPoolUnitsArray[Y] = yUnitOps.make(add(yReserve, yExtentIn));
    return {
      unitsOut: xUnitOps.make(xExtentOut),
      newPoolUnitsArray: harden(newPoolUnitsArray),
    };
  }
  throw new Error(`unitsIn ${unitsIn} were malformed`);
};
