// @ts-check

import { amountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import { makeWeakStore as makeNonVOWeakStore } from '@agoric/store';

import { arrayToObj, objectMap } from '../objArrayConversion';

export const makePurseStorage = () => {
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
   * Create a purse for a new, local issuer. Used only for ZCFMint issuers.
   *
   * @param {IssuerRecord} record
   * @returns {Purse}
   */
  const createLocalPurse = record => {
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

    const amountsDeposited = await Promise.all(
      giveKeywords.map(keyword =>
        doDepositPayments(payments[keyword], give[keyword]),
      ),
    );

    const amountsWanted = wantKeywords.map(keyword =>
      amountMath.makeEmptyFromAmount(want[keyword]),
    );

    // Note: payments without a matching `give` keyword are ignored.
    const initialAllocation = arrayToObj(
      [...amountsDeposited, ...amountsWanted],
      proposalKeywords,
    );

    return initialAllocation;
  };

  return {
    createPurse,
    createLocalPurse,
    withdrawPayments,
    depositPayments,
  };
};
