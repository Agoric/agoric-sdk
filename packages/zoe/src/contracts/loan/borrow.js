// @ts-check
import '../../../exported';

import { assert, details } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import { assertProposalShape, trade, natSafeMath } from '../../contractSupport';

import { scheduleLiquidation } from './scheduleLiquidation';
import { calculateInterest, makeDebtCalculator } from './updateDebt';
import { makeCloseLoanInvitation } from './close';
import { makeAddCollateralInvitation } from './addCollateral';

/** @type {MakeBorrowInvitation} */
export const makeBorrowInvitation = (zcf, config) => {
  const {
    mmr, // Maintenance Margin Requirement, in percent
    priceAuthority,
    periodNotifier,
    interestRate,
    interestPeriod,
    lenderSeat,
  } = config;

  // We can only lend what the lender has already escrowed.
  const maxLoan = lenderSeat.getAmountAllocated('Loan');

  /** @type {OfferHandler} */
  const borrow = async borrowerSeat => {
    assertProposalShape(borrowerSeat, {
      give: { Collateral: null },
      want: { Loan: null },
    });

    const collateralGiven = borrowerSeat.getAmountAllocated('Collateral');
    const loanWanted = borrowerSeat.getProposal().want.Loan;
    const loanBrand = zcf.getTerms().brands.Loan;
    const loanMath = zcf.getTerms().maths.Loan;
    const collateralMath = zcf.getTerms().maths.Collateral;

    // The value of the collateral in the Loan brand
    const { quoteAmount } = await E(priceAuthority).quoteGiven(
      collateralGiven,
      loanBrand,
    );
    // AWAIT ///

    const collateralPriceInLoanBrand = quoteAmount.value[0].amountOut;

    // formula: assert collateralValue*100 >= loanWanted*mmr

    // Calculate approximate value just for the error message if needed
    const approxForMsg = loanMath.make(
      natSafeMath.floorDivide(natSafeMath.multiply(loanWanted.value, mmr), 100),
    );

    // Assert the required collateral was escrowed.
    assert(
      loanMath.isGTE(
        loanMath.make(
          natSafeMath.multiply(collateralPriceInLoanBrand.value, 100),
        ),
        loanMath.make(natSafeMath.multiply(loanWanted.value, mmr)),
      ),
      details`The required margin is approximately ${approxForMsg} but collateral only had value of ${collateralPriceInLoanBrand}`,
    );

    // Assert that the collateralGiven has not changed after the AWAIT
    assert(
      collateralMath.isEqual(
        collateralGiven,
        borrowerSeat.getAmountAllocated('Collateral'),
      ),
      `The collateral allocated changed during the borrow step, which should not have been possible`,
    );

    // Assert that loanWanted <= maxLoan
    assert(
      loanMath.isGTE(maxLoan, loanWanted),
      details`The wanted loan ${loanWanted} must be below or equal to the maximum possible loan ${maxLoan}`,
    );

    const { zcfSeat: collateralSeat } = zcf.makeEmptySeatKit();

    // Transfer the wanted Loan amount to the collateralSeat
    trade(
      zcf,
      {
        seat: lenderSeat,
        gains: {},
      },
      { seat: collateralSeat, gains: { Loan: loanWanted } },
    );

    // Transfer *all* collateral to the collateral seat. Transfer the
    // wanted Loan amount to the borrower.
    trade(
      zcf,
      {
        seat: collateralSeat,
        gains: { Collateral: collateralGiven },
      },
      { seat: borrowerSeat, gains: { Loan: loanWanted } },
    );

    // We now exit the borrower seat so that the borrower gets their
    // loan. However, the borrower gets an object as their offerResult
    // that will let them continue to interact with the contract.
    borrowerSeat.exit();

    const liquidationPromiseKit = makePromiseKit();

    /** @type {DebtCalculatorConfig} */
    const debtCalculatorConfig = {
      calcInterestFn: calculateInterest,
      originalDebt: loanWanted,
      loanMath,
      periodNotifier,
      interestRate,
      interestPeriod,
      zcf,
      configMinusGetDebt: {
        ...config,
        collateralSeat,
        liquidationPromiseKit,
      },
    };
    const {
      getDebt,
      getDebtNotifier,
      getLastCalculationTimestamp,
    } = makeDebtCalculator(harden(debtCalculatorConfig));

    /** @type {LoanConfigWithBorrower} */
    const configWithBorrower = {
      ...config,
      collateralSeat,
      getDebt,
      liquidationPromiseKit,
    };

    // Schedule the liquidation. If the liquidation cannot be scheduled
    // because of a problem with a misconfigured priceAuthority, an
    // error will be thrown and the borrower will be stuck with their
    // loan and the lender will receive the collateral. It is
    // important for the borrower to validate the priceAuthority for
    // this reason.

    scheduleLiquidation(zcf, configWithBorrower);

    // TODO: Add ability to liquidate partially
    // TODO: Add ability to withdraw excess collateral
    // TODO: Add ability to repay partially

    /** @type {BorrowFacet} */
    const borrowFacet = {
      makeCloseLoanInvitation: () =>
        makeCloseLoanInvitation(zcf, configWithBorrower),
      makeAddCollateralInvitation: () =>
        makeAddCollateralInvitation(zcf, configWithBorrower),
      getLiquidationPromise: () => liquidationPromiseKit.promise,
      getDebtNotifier,
      getLastCalculationTimestamp,
      getRecentCollateralAmount: () =>
        collateralSeat.getAmountAllocated('Collateral'),
    };

    return harden(borrowFacet);
  };

  const customBorrowProps = harden({ maxLoan });

  return zcf.makeInvitation(borrow, 'borrow', customBorrowProps);
};
