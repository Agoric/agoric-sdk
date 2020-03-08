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
     * several different places, including to check whether an offer is
     * valid, getting the current price for an asset on user request, and
     * to do the actual reallocation after an offer has been made.
     * @param  {object} poolAmounts - an object of the current amounts in the
     * liquidity pool keyed by role
     * @param  {object} amountIn - the amount sent in by a user, keyed
     * by role
     * @param  {number} feeInTenthOfPercent=3 - the fee taken in tenths of
     * a percent. The default is 0.3%. The fee is taken from amountIn
     */
    getPrice: (
      tokenRoleNames,
      amountMaths,
      poolAmounts,
      amountIn,
      feeInTenthOfPercent = 3,
    ) => {
      Nat(feeInTenthOfPercent);
      assert(
        feeInTenthOfPercent < 1000,
        details`fee ${feeInTenthOfPercent} is not less than 1000`,
      );

      // Calculates how much can be bought by selling input
      const getInputPrice = (input, inputReserve, outputReserve) => {
        const oneMinusFeeInThousandths = subtract(1000, feeInTenthOfPercent);
        const inputWithFee = multiply(input, oneMinusFeeInThousandths);
        const numerator = multiply(inputWithFee, outputReserve);
        const denominator = add(multiply(inputReserve, 1000), inputWithFee);
        return floorDivide(numerator, denominator);
      };

      const allegedAmountInRole = Object.getOwnPropertyNames(amountIn)[0];
      const poolRoles = Object.getOwnPropertyNames(poolAmounts);

      assert(
        tokenRoleNames.includes(allegedAmountInRole),
        details`amountIn role ${allegedAmountInRole} was not valid`,
      );
      poolRoles.forEach(poolRole =>
        assert(
          tokenRoleNames.includes(poolRole),
          details`pool role ${poolRole} was not valid`,
        ),
      );

      // The input is which token brand?
      const roleIn = allegedAmountInRole;
      const inputIndex = tokenRoleNames.indexOf(roleIn);
      // The output role is the other role.
      const outputIndex = 1 - inputIndex;
      const roleOut = poolRoles[outputIndex];

      const inputExtent = amountMaths[roleIn].getExtent(amountIn[roleIn]);
      const inputReserve = amountMaths[roleIn].getExtent(poolAmounts[roleIn]);
      const outputReserve = amountMaths[roleOut].getExtent(
        poolAmounts[roleOut],
      );
      const outputExtent = getInputPrice(
        inputExtent,
        inputReserve,
        outputReserve,
      );

      const newPoolAmounts = { ...poolAmounts };
      newPoolAmounts[roleIn] = amountMaths[roleIn].make(
        add(inputReserve, inputExtent),
      );
      newPoolAmounts[roleOut] = amountMaths[roleOut].make(
        subtract(outputReserve, outputExtent),
      );

      const amountOut = {};
      amountOut[roleOut] = amountMaths[roleOut].make(outputExtent);

      return {
        amountOut,
        newPoolAmounts,
      };
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
