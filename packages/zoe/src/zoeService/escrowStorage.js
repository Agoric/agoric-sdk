// @ts-check

import { amountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { makeWeakStore as makeNonVOWeakStore } from '@agoric/store';

import './types';

import { arrayToObj, objectMap } from '../objArrayConversion';

/**
 * Store the pool purses whose purpose is to escrow assets, with one
 * purse per brand.
 */
export const makeEscrowStorage = () => {
  /** @type {WeakStore<Brand, ERef<Purse>>} */
  const brandToPurse = makeNonVOWeakStore('brand');

  /**
   * Create a purse for a new issuer
   *
   * @param {IssuerRecord} record
   * @returns {void}
   */
  const createPurse = record => {
    if (!brandToPurse.has(record.brand)) {
      brandToPurse.init(record.brand, E(record.issuer).makeEmptyPurse());
    }
  };

  /**
   * Make a purse for a new, local issuer. Used only for ZCFMint issuers.
   *
   * @param {IssuerRecord} record
   * @returns {Purse}
   */
  const makeLocalPurse = record => {
    const localPurse = record.issuer.makeEmptyPurse();
    brandToPurse.init(record.brand, localPurse);
    return localPurse;
  };

  /** @type {WithdrawPayments} */
  const withdrawPayments = allocation => {
    return harden(
      objectMap(allocation, ([keyword, amount]) => {
        const purse = brandToPurse.get(amount.brand);
        return [keyword, E(purse).withdraw(amount)];
      }),
    );
  };

  /**
   *
   *  Only used internally. Actually deposit a payment or promise for payment.
   *
   * @param {ERef<Payment>} paymentP
   * @param {Amount} amount
   * @returns {Promise<Amount>}
   */
  const doDepositPayments = (paymentP, amount) => {
    const purse = brandToPurse.get(amount.brand);
    return E.when(paymentP, payment => E(purse).deposit(payment, amount));
  };

  // Proposal is cleaned, but payments are not

  /**
   * Deposits payments or promises for payments according to the
   * `give` property of the proposal. Using the proposal, creates an
   * initial allocation including the amount deposited for `give`
   * keywords and an empty amount for `want` keywords.
   *
   * @param {ProposalRecord} proposal
   * @param {PaymentPKeywordRecord} payments
   * @returns {Promise<Allocation>}
   */
  const depositPayments = async (proposal, payments) => {
    const { give, want } = proposal;
    const giveKeywords = Object.keys(give);
    const wantKeywords = Object.keys(want);
    const proposalKeywords = harden([...giveKeywords, ...wantKeywords]);

    // If any of these deposits hang or fail, then depositPayments
    // hangs or fails, the offer does not succeed, and any funds that
    // were deposited into the pool purses are lost. We have a ticket
    // for giving the user a refund of what was already deposited, and
    // offer safety and payout liveness are still meaningful as long
    // as issuers are well-behaved. For more, see
    // https://github.com/Agoric/agoric-sdk/issues/1271
    const amountsDeposited = await Promise.all(
      giveKeywords.map(keyword =>
        doDepositPayments(payments[keyword], give[keyword]),
      ),
    );

    const emptyAmountsForWantKeywords = wantKeywords.map(keyword =>
      amountMath.makeEmptyFromAmount(want[keyword]),
    );

    // Note: payments without a matching `give` keyword are ignored.
    const initialAllocation = arrayToObj(
      [...amountsDeposited, ...emptyAmountsForWantKeywords],
      proposalKeywords,
    );

    return initialAllocation;
  };

  return {
    createPurse, // createPurse does not return a purse
    makeLocalPurse,
    withdrawPayments,
    depositPayments,
  };
};
