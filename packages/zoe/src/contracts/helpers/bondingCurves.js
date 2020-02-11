import Nat from '@agoric/nat';
import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';

import { natSafeMath } from './safeMath';

const { add, subtract, multiply, floorDivide } = natSafeMath;

export const makeConstProductBC = (zoe, assays) => {
  const unitOpsArray = zoe.getUnitOpsForAssays(assays);
  return harden({
    /**
     * Contains the logic for calculating how many units should be given
     * back to the user in exchange for what they sent in. It also
     * calculates the new units of the assets in the pool. Reused in
     * several different places, including to check whether an offer is
     * valid, getting the current price for an asset on user request, and
     * to do the actual reallocation after an offer has been made.
     * @param  {units[]} poolUnitsArray - an array of the current units in the
     * liquidity pool
     * @param  {units} unitsIn - the units sent in by a user
     * @param  {number} feeInTenthOfPercent=3 - the fee taken in tenths of
     * a percent. The default is 0.3%. The fee is taken from unitsIn
     */
    getPrice: (poolUnitsArray, unitsIn, feeInTenthOfPercent = 3) => {
      Nat(feeInTenthOfPercent);
      assert(
        feeInTenthOfPercent < 1000,
        details`fee ${feeInTenthOfPercent} is not less than 1000`,
      );
      const oneMinusFeeInThousandths = subtract(1000, feeInTenthOfPercent);

      // Calculates how much can be bought by selling input
      const getInputPrice = (input, inputReserve, outputReserve) => {
        const inputWithFee = multiply(input, oneMinusFeeInThousandths);
        const numerator = multiply(inputWithFee, outputReserve);
        const denominator = add(multiply(inputReserve, 1000), inputWithFee);
        return floorDivide(numerator, denominator);
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
    },

    // Calculate how many liquidity tokens we should be minting to
    // send back to the user when adding liquidity. Calculations are
    // based on the extents represented by index 0. If the current
    // supply is zero, start off by just taking the extent at index 0
    // and using it as the extent for the liquidity token.
    calcLiqExtentToMint: (liqTokenSupply, poolUnits, userUnits) =>
      liqTokenSupply > 0
        ? floorDivide(
            multiply(userUnits[0].extent, liqTokenSupply),
            poolUnits[0].extent,
          )
        : userUnits[0].extent,

    // Calculate how many underlying tokens (in the form of units)
    // should be returned when removing liquidity.
    calcUnitsToRemove: (liqTokenSupply, poolUnits, liquidityUnitsIn) =>
      poolUnits.map((units, i) =>
        unitOpsArray[i].make(
          floorDivide(
            multiply(liquidityUnitsIn.extent, units.extent),
            liqTokenSupply,
          ),
        ),
      ),
  });
};
