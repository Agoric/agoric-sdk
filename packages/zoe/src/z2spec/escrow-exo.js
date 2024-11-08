// @ts-check
/**
 * @import {Zone} from '@agoric/base-zone'
 * @import {DepositFacet} from '@agoric/ertp'
 */

import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { makePromiseKit as withResolvers } from '@endo/promise-kit';

/** @param {Promise<void>} cancellationP */
const failOnly = cancellationP =>
  E.when(cancellationP, cancellation => {
    throw cancellation;
  });
harden(failOnly);

/**
 * @param {Issuer} issuer
 * @param {Promise<void>} decisionP
 * @param {{ payment: Payment, sink: ERef<DepositFacet>}} src
 * @param {ERef<DepositFacet>} dstPurseP
 * @param {Amount} amount
 */
const transfer = (issuer, decisionP, src, dstPurseP, amount) => {
  const escrowPurseP = E(issuer).makeEmptyPurse();
  // setup phase 2
  const paid = E.when(
    decisionP,
    _ =>
      E(escrowPurseP)
        .withdraw(amount)
        .then(pmt => E(dstPurseP).receive(pmt, amount)),
    _ =>
      E(escrowPurseP)
        .withdraw(amount)
        .then(pmt => E(src.sink).receive(pmt, amount)),
  );
  return {
    escrowed: E(escrowPurseP).deposit(src.payment, amount), // phase 1
    paid,
  };
};

/** @param {Zone} zone */
export const prepareEscrowExchange = zone =>
  zone.exoClass(
    'EscrowExchange',
    M.interface('EscrowExchangeI', {}, { defaultGuards: 'passable' }),
    /**
     * @typedef {{ payment: Payment, sink: ERef<DepositFacet>, cancel: Promise<void> }} Common
     * @param {{
     *   a: Common & { give: {Money: Amount}, want: {Stock: Amount}};
     *   b: Common & { give: {Stock: Amount}, want: {Money: Amount}};
     * }} parties
     * @param {{ Money: Issuer, Stock: Issuer }} issuers
     */
    (parties, issuers) => ({ parties, issuers }),
    {
      run() {
        const { a, b } = this.state.parties;
        const { Money, Stock } = this.state.issuers;
        /** @type {PromiseKit<void>} */
        const decision = withResolvers();
        const decisionP = decision.promise;
        const txfr = {
          Money: transfer(Money, decisionP, a, b.sink, b.want.Money),
          Stock: transfer(Stock, decisionP, b, a.sink, a.want.Stock),
        };
        decision.resolve(
          Promise.race([
            Promise.all(Object.values(txfr).map(t => t.escrowed)),
            ...[a, b].map(who => failOnly(who.cancel)),
          ]).then(_ => {}),
        );
        return {
          escrowed: decisionP,
          paid: Promise.all(Object.values(txfr).map(t => t.paid)).then(_ => {}),
        };
      },
    },
  );
