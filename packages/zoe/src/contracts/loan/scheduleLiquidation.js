// ts-check

import '../../../exported';

import { E } from '@agoric/eventual-send';

import { liquidate } from './liquidate';
import { getAmountIn, multiplyBy } from '../../contractSupport';

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

  // TODO(hibbert) drop mmr as Percent before Beta
  let {
    mmrRatio, // Maintenance Margin Requirement, as a ratio
  } = configWithBorrower;
  if (!mmrRatio) {
    mmrRatio = mmr.makeRatio();
  }

  const currentDebt = getDebt();

  // The liquidationTriggerValue is when the value of the collateral
  // equals mmrRatio of the current debt
  // Formula: liquidationTriggerValue = (currentDebt * mmrRatio) / 100
  const liquidationTriggerValue = multiplyBy(currentDebt, mmrRatio);

  const collateralMath = zcf.getTerms().maths.Collateral;

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
      if (collateralMath.isEqual(amountIn, currentCollateral)) {
        liquidationPromiseKit.resolve(priceQuote);
        liquidate(zcf, configWithBorrower);
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
      zcf.reallocate(
        lenderSeat.stage({ Collateral: allCollateral }),
        lenderSeat.stage({}),
      );
      zcf.shutdownWithFailure(err);
      throw err;
    });
};
