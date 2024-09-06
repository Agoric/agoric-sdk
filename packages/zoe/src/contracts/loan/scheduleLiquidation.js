import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';

import { liquidate } from './liquidate.js';
import {
  getAmountIn,
  ceilMultiplyBy,
  atomicTransfer,
} from '../../contractSupport/index.js';

/** @type {ScheduleLiquidation} */
export const scheduleLiquidation = (zcf, configWithBorrower) => {
  const {
    collateralSeat,
    lenderSeat,
    priceAuthority,
    liquidationPromiseKit,
    getDebt,
    mmr,
  } = configWithBorrower;

  const currentDebt = getDebt();

  // The liquidationTriggerValue is when the value of the collateral
  // equals mmr of the current debt
  // Formula: liquidationTriggerValue = (currentDebt * mmr)
  const liquidationTriggerValue = ceilMultiplyBy(currentDebt, mmr);

  const allCollateral = collateralSeat.getAmountAllocated('Collateral');

  const internalLiquidationPromise = E(priceAuthority).quoteWhenLT(
    allCollateral,
    liquidationTriggerValue,
  );

  internalLiquidationPromise
    .then(priceQuote => {
      const amountIn = getAmountIn(priceQuote);
      // Only liquidate if this trigger is still pertinent.  Check
      // that the quote is for exactly the current amount of
      // collateral. If the amount is wrong, we will have already
      // scheduled another liquidation for the right amount.
      const currentCollateral = collateralSeat.getAmountAllocated('Collateral');
      if (AmountMath.isEqual(amountIn, currentCollateral)) {
        liquidationPromiseKit.resolve(priceQuote);
        void liquidate(zcf, configWithBorrower);
      }
    })
    .catch(err => {
      console.error(
        `Could not schedule automatic liquidation at the liquidationTriggerValue ${liquidationTriggerValue} using this priceAuthority ${priceAuthority}`,
      );
      console.error(err);
      // The borrower has exited at this point with their loan. The
      // collateral is on the collateral seat. If an error occurs, we
      // reallocate the collateral to the lender and shutdown the
      // contract, kicking out any remaining seats.
      atomicTransfer(zcf, collateralSeat, lenderSeat, {
        Collateral: allCollateral,
      });

      zcf.shutdownWithFailure(err);
      throw err;
    });
};
