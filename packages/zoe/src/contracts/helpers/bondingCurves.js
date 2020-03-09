import Nat from '@agoric/nat';
import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';

import { natSafeMath } from './safeMath';

const { add, subtract, multiply, floorDivide } = natSafeMath;

export const makeConstProductBC = zoe => {
  return harden({
    /**
     * Contains the logic for calculating how much should be given
     * back to the user in exchange for what they sent in. It also
     * calculates the new amount of the assets in the pool. Reused in
     * several different places, including to check whether an offer
     * is valid, getting the current price for an asset on user
     * request, and to do the actual reallocation after an offer has
     * been made.
     * @param  {extent} inputExtent - the extent of the assets sent in
     * to be swapped
     * @param  {extent} inputReserve - the extent in the liquidity
     * pool of the kind of asset sent in
     * @param  {extent} outputReserve - the extent in the liquidity
     * pool of the kind of asset to be sent out
     * @param  {number} feeBasisPoints=30 - the fee taken in
     * basis points. The default is 0.3% or 30 basis points. The fee is taken from
     * inputExtent
     */
    getPrice: ({
      inputExtent,
      inputReserve,
      outputReserve,
      feeBasisPoints = 30,
    }) => {
      const oneMinusFeeInTenThousandths = subtract(10000, feeBasisPoints);
      const inputWithFee = multiply(inputExtent, oneMinusFeeInTenThousandths);
      const numerator = multiply(inputWithFee, outputReserve);
      const denominator = add(multiply(inputReserve, 10000), inputWithFee);

      const outputExtent = floorDivide(numerator, denominator);
      const newOutputReserve = subtract(outputReserve, outputExtent);
      const newInputReserve = add(inputReserve, inputExtent);
      return harden({ outputExtent, newInputReserve, newOutputReserve });
    },

    // Calculate how many liquidity tokens we should be minting to
    // send back to the user when adding liquidity. Calculations are
    // based on the extents represented by index 0. If the current
    // supply is zero, start off by just taking the extent at index 0
    // and using it as the extent for the liquidity token.
    calcLiqExtentToMint: (liqTokenSupply, poolAmounts, userAmounts) =>
      liqTokenSupply > 0
        ? floorDivide(
            multiply(userAmounts[0].extent, liqTokenSupply),
            poolAmounts[0].extent,
          )
        : userAmounts[0].extent,

    // Calculate how many underlying tokens (in the form of amount)
    // should be returned when removing liquidity.
    calcAmountsToRemove: (liqTokenSupply, poolAmounts, liquidityAmountsIn) =>
      poolAmounts.map((amount, i) =>
        amountMathArray[i].make(
          floorDivide(
            multiply(liquidityAmountsIn.extent, amount.extent),
            liqTokenSupply,
          ),
        ),
      ),
  });
};
