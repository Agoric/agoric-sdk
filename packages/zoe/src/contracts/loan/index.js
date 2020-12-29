// @ts-check
import '../../../exported';

import { assert } from '@agoric/assert';
import Nat from '@agoric/nat';

import { assertIssuerKeywords } from '../../contractSupport';
import { makeLendInvitation } from './lend';
import { makePercent } from '../../contractSupport/percentMath';

/**
 * Add collateral of a particular brand and get a loan of another
 * brand. Collateral (also known as margin) must be greater than the
 * loan value, at an amount set by the Maintenance Margin Requirement
 * (mmr) in the terms of the contract. The loan does not have a
 * distinct end time. Rather, if the value of the collateral changes
 * such that insufficient margin is provided, the collateral is
 * liquidated, and the loan is closed. At any time, the borrower can
 * add collateral or repay the loan with interest, closing the loan.
 * The borrower can set up their own margin calls by getting the
 * `priceAuthority` from the terms and calling
 * `E(priceAuthority).quoteWhenLT(allCollateral, x)` where x is the
 * value of the collateral in the Loan brand at which they want a
 * reminder to addCollateral.
 *
 * Note that all collateral must be of the same brand and all of the
 * loaned amount and interest must be of the same (separate) brand.
 *
 * Terms:
 *  * mmr (default = 150) - the Maintenance Margin Requirement, in
 *    percent. The default is 150, meaning that collateral should be
 *    worth at least 150% of the loan. If the value of the collateral
 *    drops below mmr, liquidation occurs.
 *  * priceAuthority - will be used for getting the current value of
 *    collateral and setting liquidation triggers.
 *  * autoswapInstance - The running contract instance for an Autoswap
 *    or Multipool Autoswap installation. The publicFacet of the
 *    instance is used for producing an invitation to sell the
 *    collateral on liquidation.
 *  * periodNotifier - the Notifier that provides notifications that
 *    periods have passed, on which compound interest will be
 *    calculated using the interestRate. Notifiers don't guarantee
 *    that clients will see all the changes, so the contract must
 *    track when interest last accrued.
 *  * interestRate - the rate in basis points that will be multiplied
 *    with the debt on every period to compound interest.
 *  * interestPeriod - the period at which interest compounds.
 *
 * IssuerKeywordRecord:
 *  * Keyword: 'Collateral' - The issuer for the digital assets to be
 *    escrowed as collateral.
 *  * Keyword: 'Loan' - The issuer for the digital assets to be loaned
 *    out.
 *
 * @type {ContractStartFn}
 */
const start = async zcf => {
  assertIssuerKeywords(zcf, harden(['Collateral', 'Loan']));
  const loanMath = zcf.getTerms().maths.Loan;

  // Rather than grabbing the terms each time we use them, let's set
  // some defaults and add them to a contract-wide config.

  const {
    mmr = makePercent(150, loanMath), // Maintenance Margin Requirement
    autoswapInstance,
    priceAuthority,
    periodNotifier,
    interestRate,
    interestPeriod,
  } = zcf.getTerms();

  assert(autoswapInstance, `autoswapInstance must be provided`);
  assert(priceAuthority, `priceAuthority must be provided`);
  assert(periodNotifier, `periodNotifier must be provided`);
  assert(Nat(interestRate), `interestRate must be a positive integer`);
  assert(Nat(interestPeriod), `interestPeriod must be a positive integer`);

  /** @type {LoanTerms} */
  const config = {
    mmr,
    autoswapInstance,
    priceAuthority,
    periodNotifier,
    interestRate,
    interestPeriod,
  };

  const creatorInvitation = makeLendInvitation(zcf, harden(config));

  return { creatorInvitation };
};

harden(start);
export { start };
