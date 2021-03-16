// @ts-check

import './types';

import { assert, details as X } from '@agoric/assert';
import { amountMath } from '@agoric/ertp';

import { assertProposalShape, trade } from '../../contractSupport';

// The debt, the amount which must be repaid, is just the amount
// loaned plus interest (aka stability fee). All debt must be repaid
// in one offer. In exchange for total repayment, all collateral is
// given back and the contract is shut down.

/** @type {MakeCloseLoanInvitation} */
export const makeCloseLoanInvitation = (zcf, config) => {
  const { collateralSeat, getDebt, lenderSeat } = config;

  /** @type {OfferHandler} */
  const repayAndClose = repaySeat => {
    assertProposalShape(repaySeat, {
      give: { Loan: null },
      want: { Collateral: null },
    });

    const loanBrand = zcf.getTerms().brands.Loan;
    const collateralBrand = zcf.getTerms().brands.Collateral;

    const repaid = repaySeat.getAmountAllocated('Loan', loanBrand);

    // This must be a function because the amount of debt will change
    // over time as interest is added.
    const debt = getDebt();

    // All debt must be repaid.
    assert(
      amountMath.isGTE(repaid, debt),
      X`Not enough Loan assets have been repaid.  ${debt} is required, but only ${repaid} was repaid.`,
    );

    // We cannot use `swap` or `swapExact` helper because the collateralSeat
    // doesn't have a `want`.

    // Transfer the collateral to the repaySeat and remove the
    // required Loan amount. Any excess Loan amount is kept by the repaySeat.
    trade(
      zcf,
      {
        seat: repaySeat,
        gains: {
          Collateral: collateralSeat.getAmountAllocated(
            'Collateral',
            collateralBrand,
          ),
        },
      },
      {
        seat: collateralSeat,
        gains: { Loan: debt },
      },
    );

    // Transfer the repaid loan amount to the lender
    trade(
      zcf,
      {
        seat: lenderSeat,
        gains: { Loan: debt },
      },
      {
        seat: collateralSeat,
        gains: {},
      },
    );

    repaySeat.exit();
    lenderSeat.exit();
    collateralSeat.exit();
    const closeMsg = 'your loan is closed, thank you for your business';
    zcf.shutdown(closeMsg);
    return closeMsg;
  };

  // Note: we can't put the debt to be repaid in the customProperties
  // because it will change
  return zcf.makeInvitation(repayAndClose, 'repayAndClose');
};
