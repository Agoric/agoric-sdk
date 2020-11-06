// @ts-check
import '../../../exported';

import { E } from '@agoric/eventual-send';

import { depositToSeat, withdrawFromSeat } from '../../contractSupport';

export const doLiquidation = async (
  zcf,
  collateralSeat,
  autoswapPublicFacetP,
  lenderSeat,
) => {
  const zoeService = zcf.getZoeService();
  const loanMath = zcf.getTerms().maths.Loan;

  const allCollateral = collateralSeat.getAmountAllocated('Collateral');

  const { Collateral: collateralPayment } = await withdrawFromSeat(
    zcf,
    collateralSeat,
    {
      Collateral: allCollateral,
    },
  );

  const proposal = harden({
    give: { In: allCollateral },
    want: { Out: loanMath.getEmpty() },
  });

  const payments = harden({ In: collateralPayment });

  const swapInvitation = E(autoswapPublicFacetP).makeSwapInInvitation();

  const autoswapUserSeat = E(zoeService).offer(
    swapInvitation,
    proposal,
    payments,
  );

  /**
   * @param {{ Out: Promise<Payment>; In: Promise<Payment>; }} payouts
   */
  const handlePayoutsAndShutdown = async payouts => {
    const { Out: loanPayout, In: collateralPayout } = payouts;
    const { Out: loanAmount, In: collateralAmount } = await E(
      autoswapUserSeat,
    ).getCurrentAllocation();
    // AWAIT ///
    const amounts = harden({
      Collateral: collateralAmount,
      Loan: loanAmount,
    });
    const payoutPayments = harden({
      Collateral: collateralPayout,
      Loan: loanPayout,
    });
    await depositToSeat(zcf, lenderSeat, amounts, payoutPayments);

    const closeSuccessfully = () => {
      console.log('close successful');
      lenderSeat.exit();
      collateralSeat.exit();
      zcf.shutdown('your loan had to be liquidated');
    };

    const closeWithFailure = err => {
      console.log('close failure');
      lenderSeat.kickOut(err);
      collateralSeat.kickOut(err);
      zcf.shutdownWithFailure(err);
    };

    await E(autoswapUserSeat)
      .getOfferResult()
      .then(closeSuccessfully, closeWithFailure);
  };

  return E(autoswapUserSeat)
    .getPayouts()
    .then(handlePayoutsAndShutdown);
};

/**
 * This function is triggered by the priceAuthority when the value of the
 * collateral is below the mmr percentage. The function performs the
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
