import { E } from '@endo/eventual-send';
import { panic } from '@agoric/internal';
import { AmountMath } from '@agoric/ertp';

import { offerTo } from '../../contractSupport/zoeHelpers.js';

/**
 * @import {ShutdownWithFailure} from '@agoric/swingset-vat';
 */

export const doLiquidation = async (
  zcf,
  collateralSeat,
  autoswapPublicFacetP,
  lenderSeat,
  loanBrand,
) => {
  const allCollateral = collateralSeat.getAmountAllocated('Collateral');
  const swapInvitation = E(autoswapPublicFacetP).makeSwapInInvitation();
  const toAmounts = harden({ In: allCollateral });
  const proposal = harden({
    give: toAmounts,
    want: { Out: AmountMath.makeEmpty(loanBrand) },
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

  const offerResultP = E(autoswapUserSeat).getOfferResult();
  await deposited;
  await offerResultP.then(closeSuccessfully, panic);
};

/**
 * This function is triggered by the priceAuthority when the value of the
 * collateral is below the mmr. The function performs the
 * liquidation and then shuts down the contract. Note that if a
 * liquidation occurs, the borrower gets nothing and they can take no
 * further action.
 *
 * For simplicity, we will sell all collateral.
 *
 * @param {ZCF} zcf
 * @param {LoanConfigWithBorrower} config
 * @returns {Promise<void>}
 */
export const liquidate = async (zcf, config) => {
  const { collateralSeat, autoswapInstance, lenderSeat, loanBrand } = config;

  const zoeService = zcf.getZoeService();

  const autoswapPublicFacetP = E(zoeService).getPublicFacet(autoswapInstance);

  // For testing purposes, make it easier to mock the autoswap public facet.
  return doLiquidation(
    zcf,
    collateralSeat,
    autoswapPublicFacetP,
    lenderSeat,
    loanBrand,
  );
};
