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
export const calculateConstProduct = (
  assays,
  unitOpsArray,
  poolUnits,
  unitsIn,
  feeInTenthOfPercent = 3,
) => {
  let IN_INDEX;
  let OUT_INDEX;
  // the user has sent in units of kind assays[0]
  if (unitsIn.label.assay === assays[0]) {
    IN_INDEX = 0;
    OUT_INDEX = 1;
    // the user has sent in units of kind assays[1]
  } else if (unitsIn.label.assay === assays[1]) {
    IN_INDEX = 1;
    OUT_INDEX = 0;
  } else {
    throw new Error(`unitsIn ${unitsIn} were malformed`);
  }

  // Constant product invariant means:
  // tokenInPoolE * tokenOutPoolE =
  //   (tokenInPoolE + tokenInE) *
  //   (tokenOutPoolE - tokensOutE)

  // newTokenInPoolE = tokenInPoolE + tokenInE;
  const newPoolUnits = [...poolUnits];
  newPoolUnits[IN_INDEX] = unitOpsArray.with(poolUnits[IN_INDEX], unitsIn);

  // newTokenOutPool = tokenOutPool / (1 + (tokenInE/tokenInPoolE)*(1-.003))

  // the order in which we do this makes a difference because of
  // rounding to floor.

  // We use extents here because we are multiplying two different
  // kinds of digital assets
  const constantProduct = multiply(poolUnits[0].extent, poolUnits[1].extent);
  const numerator = multiply(constantProduct, 1000);
  const denominator = add(
    multiply(poolUnits[IN_INDEX].extent, 1000),
    multiply(unitsIn.extent, subtract(1000, feeInTenthOfPercent)),
  );
  // save divide for last
  newPoolUnits[OUT_INDEX] = unitOpsArray[OUT_INDEX].make(
    divide(numerator, denominator),
  );

  const unitsOut = unitOpsArray[OUT_INDEX].without(
    poolUnits[OUT_INDEX],
    newPoolUnits[OUT_INDEX],
  );

  return {
    unitsOut,
    newPoolUnits,
  };
};
