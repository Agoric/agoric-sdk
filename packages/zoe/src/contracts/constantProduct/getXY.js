// This does not support secondary to secondary. That has to happen at
// a higher abstraction

/**
 *
 * @param {Object} opt
 * @param {Amount=} opt.amountGiven
 * @param {{ Central: Amount, Secondary: Amount }} opt.poolAllocation
 * @param {Amount=} opt.amountWanted
 * @returns {{ x: Amount, y: Amount, deltaX: Amount, wantedDeltaY:
 * Amount }}
 */
export const getXY = ({ amountGiven, poolAllocation, amountWanted }) => {
  // Regardless of whether we are specifying the amountIn or the
  // amountOut, the xBrand is the brand of the amountIn.
  const xBrand = amountGiven && amountGiven.brand;
  const yBrand = amountWanted && amountWanted.brand;
  const secondaryBrand = poolAllocation.Secondary.brand;
  const centralBrand = poolAllocation.Central.brand;

  const deltas = {
    deltaX: amountGiven,
    wantedDeltaY: amountWanted,
  };

  if (secondaryBrand === xBrand || centralBrand === yBrand) {
    return harden({
      x: poolAllocation.Secondary,
      y: poolAllocation.Central,
      ...deltas,
    });
  }
  if (centralBrand === xBrand || secondaryBrand === yBrand) {
    return harden({
      x: poolAllocation.Central,
      y: poolAllocation.Secondary,
      ...deltas,
    });
  }
  assert.fail(`brand ${xBrand} was not recognized as Central or Secondary`);
};
