// @ts-check

import '../../../exported';

import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makePromiseKit } from '@agoric/promise-kit';
import { amountMath } from '@agoric/ertp';

import {
  assertProposalShape,
  trade,
  getAmountOut,
  multiplyBy,
  getTimestamp,
} from '../../contractSupport';

import { scheduleLiquidation } from './scheduleLiquidation';
import { calculateInterest, makeDebtCalculator } from './updateDebt';
import { makeCloseLoanInvitation } from './close';
import { makeAddCollateralInvitation } from './addCollateral';

/** @type {MakeBorrowInvitation} */
export const makeBorrowInvitation = (zcf, config) => {
  const {
    mmr, // Maintenance Margin Requirement, as a Ratio
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

    // The value of the collateral in the Loan brand
    const quote = await E(priceAuthority).quoteGiven(
      collateralGiven,
      loanBrand,
    );

    const collateralPriceInLoanBrand = getAmountOut(quote);

    // Assert the required collateral was escrowed.
    const requiredMargin = multiplyBy(loanWanted, mmr);
    assert(
      amountMath.isGTE(collateralPriceInLoanBrand, requiredMargin),
      X`The required margin is ${requiredMargin.value}% but collateral only had value of ${collateralPriceInLoanBrand.value}`,
    );

    const timestamp = getTimestamp(quote);

    // Assert that the collateralGiven has not changed after the AWAIT
    assert(
      amountMath.isEqual(
        collateralGiven,
        borrowerSeat.getAmountAllocated('Collateral'),
      ),
      `The collateral allocated changed during the borrow step, which should not have been possible`,
    );

    // Assert that loanWanted <= maxLoan
    assert(
      amountMath.isGTE(maxLoan, loanWanted),
      X`The wanted loan ${loanWanted} must be below or equal to the maximum possible loan ${maxLoan}`,
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
      periodNotifier,
      interestRate,
      interestPeriod,
      basetime: timestamp,
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
    const borrowFacet = Far('borrowFacet', {
      makeCloseLoanInvitation: () =>
        makeCloseLoanInvitation(zcf, configWithBorrower),
      makeAddCollateralInvitation: () =>
        makeAddCollateralInvitation(zcf, configWithBorrower),
      getLiquidationPromise: () => liquidationPromiseKit.promise,
      getDebtNotifier,
      getLastCalculationTimestamp,
      getRecentCollateralAmount: () =>
        collateralSeat.getAmountAllocated('Collateral'),
    });

    return borrowFacet;
  };

  const customBorrowProps = harden({ maxLoan });

  return zcf.makeInvitation(borrow, 'borrow', customBorrowProps);
};
