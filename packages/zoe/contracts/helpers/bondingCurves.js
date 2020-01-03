import { natSafeMath } from './safeMath';

const { add, subtract, multiply, divide } = natSafeMath;

/**
 * `calculateConstProduct` contains the logic for calculating how many
 * units should be given back to the user in exchange for what they
 * sent in. It also calculates the new units of the assets in the
 * pool. `calculateConstProduct` is reused in several different
 * places, including to check whether an offer is valid, getting the
 * current price for an asset on user request, and to do the actual
 * reallocation after an offer has been made.
 * @param  {assay[]} assays - an array of assays
 * @param  {unitOps[]} unitOpsArray - an array of unitOps, in the same
 * order as the corresponding assays array
 * @param  {units[]} poolUnits - an array of the current units in the
 * liquidity pool
 * @param  {units} unitsIn - the units sent in by a user
 * @param  {number} feeInTenthOfPercent=3 - the fee taken in tenths of
 * a percent. The default is 0.3%. The fee is taken from unitsIn
 */

export const makeCalculateConstProduct = (zoe, assays) => {
  const unitOpsArray = zoe.getUnitOpsForAssays(assays);
  return (poolUnitsArray, unitsIn, feeInTenthOfPercent = 3) => {
    const brandIn = unitsIn.label.assay;
    if (brandIn !== assays[0] && brandIn !== assays[1]) {
      throw new Error(`unitsIn ${unitsIn} were malformed`);
    }
    const IN_INDEX = brandIn === assays[0] ? 0 : 1;
    const OUT_INDEX = 1 - IN_INDEX;

    // Constant product invariant means:
    // tokenInPoolE * tokenOutPoolE =
    //   (tokenInPoolE + tokenInE) *
    //   (tokenOutPoolE - tokensOutE)

    // newTokenInPoolE = tokenInPoolE + tokenInE;
    const newPoolUnitsArray = [...poolUnitsArray];
    newPoolUnitsArray[IN_INDEX] = unitOpsArray[IN_INDEX].with(
      poolUnitsArray[IN_INDEX],
      unitsIn,
    );

    // newTokenOutPool = tokenOutPool / (1 + (tokenInE/tokenInPoolE)*(1-.003))

    // the order in which we do this makes a difference because of
    // rounding to floor.

    // We use extents here because we are multiplying two different
    // kinds of digital assets
    const constantProduct = multiply(
      poolUnitsArray[IN_INDEX].extent,
      poolUnitsArray[OUT_INDEX].extent,
    );
    const numerator = multiply(constantProduct, 1000);
    const denominator = add(
      multiply(poolUnitsArray[IN_INDEX].extent, 1000),
      multiply(unitsIn.extent, subtract(1000, feeInTenthOfPercent)),
    );
    // save divide for last
    newPoolUnitsArray[OUT_INDEX] = unitOpsArray[OUT_INDEX].make(
      divide(numerator, denominator),
    );

    const unitsOut = unitOpsArray[OUT_INDEX].without(
      poolUnitsArray[OUT_INDEX],
      newPoolUnitsArray[OUT_INDEX],
    );

    return {
      unitsOut,
      newPoolUnitsArray,
    };
  };
};
