// @ts-check
import '../../../exported';

import { E } from '@agoric/eventual-send';

import { offerTo } from '../../contractSupport/zoeHelpers';

export const doLiquidation = async (
  zcf,
  collateralSeat,
  autoswapPublicFacetP,
  lenderSeat,
) => {
  const loanMath = zcf.getTerms().maths.Loan;

  const allCollateral = collateralSeat.getAmountAllocated('Collateral');

  const swapInvitation = E(autoswapPublicFacetP).makeSwapInInvitation();

  const toAmounts = harden({ In: allCollateral });

  const proposal = harden({
    give: toAmounts,
    want: { Out: loanMath.getEmpty() },
  });

  const keywordMapping = harden({
    Collateral: 'In',
    Loan: 'Out',
  });

  const { userSeatPromise: autoswapUserSeat, deposited } = await offerTo(
    zcf,
    swapInvitation,
    keywordMapping,
    proposal,
    collateralSeat,
    lenderSeat,
  );

  const closeSuccessfully = () => {
    lenderSeat.exit();
    collateralSeat.exit();
    zcf.shutdown('your loan had to be liquidated');
  };

  const closeWithFailure = err => {
    lenderSeat.fail(err);
    collateralSeat.fail(err);
    zcf.shutdownWithFailure(err);
    throw err;
  };

  const offerResultP = E(autoswapUserSeat).getOfferResult();
  await deposited;
  await offerResultP.then(closeSuccessfully, closeWithFailure);
};

/**
 * This function is triggered by the priceAuthority when the value of the
 * collateral is below the mmrRatio. The function performs the
 * liquidation and then shuts down the contract. Note that if a
 * liquidation occurs, the borrower gets nothing and they can take no
 * further action.
 *
 * For simplicity, we will sell all collateral.
 *
 * @type {Liquidate}
 */
export const liquidate = async (zcf, config) => {
  const { collateralSeat, autoswapInstance, lenderSeat } = config;

  const zoeService = zcf.getZoeService();

  const autoswapPublicFacetP = E(zoeService).getPublicFacet(autoswapInstance);

  // For testing purposes, make it easier to mock the autoswap public facet.
  return doLiquidation(zcf, collateralSeat, autoswapPublicFacetP, lenderSeat);
};
