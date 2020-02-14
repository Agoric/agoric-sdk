import Nat from '@agoric/nat';
import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';

import { natSafeMath } from './safeMath';

const { add, subtract, multiply, floorDivide } = natSafeMath;

export const makeConstProductBC = (zoe, issuers) => {
  const amountMathArray = zoe.getAmountMathForIssuers(issuers);
  return harden({
    /**
     * Contains the logic for calculating how many amount should be given
     * back to the user in exchange for what they sent in. It also
     * calculates the new amount of the assets in the pool. Reused in
     * several different places, including to check whether an offer is
     * valid, getting the current price for an asset on user request, and
     * to do the actual reallocation after an offer has been made.
     * @param  {amount[]} poolAmountsArray - an array of the current amount in the
     * liquidity pool
     * @param  {amount} amountIn - the amount sent in by a user
     * @param  {number} feeInTenthOfPercent=3 - the fee taken in tenths of
     * a percent. The default is 0.3%. The fee is taken from amountIn
     */
    getPrice: (poolAmountsArray, amountIn, feeInTenthOfPercent = 3) => {
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

      const issuerIn = amountIn.label.issuer;
      const X = 0;
      const Y = 1;
      const [xAmountMath, yAmountMath] = zoe.getAmountMathForIssuers(issuers);
      const xReserve = poolAmountsArray[X].extent;
      const yReserve = poolAmountsArray[Y].extent;
      if (issuerIn === issuers[X]) {
        const xExtentIn = amountIn.extent;
        const yExtentOut = getInputPrice(xExtentIn, xReserve, yReserve);
        const newPoolAmountsArray = [...poolAmountsArray];
        newPoolAmountsArray[X] = xAmountMath.make(add(xReserve, xExtentIn));
        newPoolAmountsArray[Y] = yAmountMath.make(
          subtract(yReserve, yExtentOut),
        );
        return {
          amountOut: yAmountMath.make(yExtentOut),
          newPoolAmountsArray: harden(newPoolAmountsArray),
        };
      }
      if (issuerIn === issuers[Y]) {
        const yExtentIn = amountIn.extent;
        const xExtentOut = getInputPrice(yExtentIn, yReserve, xReserve);
        const newPoolAmountsArray = [...poolAmountsArray];
        newPoolAmountsArray[X] = xAmountMath.make(
          subtract(xReserve, xExtentOut),
        );
        newPoolAmountsArray[Y] = yAmountMath.make(add(yReserve, yExtentIn));
        return {
          amountOut: xAmountMath.make(xExtentOut),
          newPoolAmountsArray: harden(newPoolAmountsArray),
        };
      }
      throw new Error(`amountIn ${amountIn} were malformed`);
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
