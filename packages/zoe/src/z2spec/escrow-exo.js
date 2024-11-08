// @ts-check
/**
 * @import {Zone} from '@agoric/base-zone'
 * @import {DepositFacet} from '@agoric/ertp'
 */

import { E } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';

/** @param {Promise<void>} cancellationP */
const failOnly = cancellationP =>
  Promise.resolve(cancellationP).then(cancellation => {
    throw cancellation;
  });
harden(failOnly);

/** @param {Zone} zone */
export const prepareEscrowExchange = zone =>
  zone.exoClass(
    'EscrowExchange',
    undefined, // interface TODO
    /**
     * @typedef {{ payment: Payment, sink: DepositFacet, cancel: Promise<void> }} Common
     * @param {{
     *   a: Common & { give: {Money: Amount}, want: {Stock: Amount}};
     *   b: Common & { give: {Stock: Amount}, want: {Money: Amount}};
     * }} parties
     * @param {{
     *   Money: Issuer,
     *   Stock: Issuer,
     * }} issuers
     */
    (parties, issuers) => ({ parties, issuers }),
    {
      run() {
        const { a, b } = this.state.parties;
        const { Money, Stock } = this.state.issuers;
        const { self } = this;
        /** @type {PromiseKit<void>} */
        const decision = makePromiseKit();
        const decisionP = decision.promise;
        decision.resolve(
          Promise.race([
            Promise.all([
              self.transfer(Money, decisionP, a, b.sink, b.want.Money),
              self.transfer(Stock, decisionP, b, a.sink, a.want.Stock),
            ]),
            failOnly(a.cancel),
            failOnly(b.cancel),
          ]).then(_ => {}),
        );
        return decision.promise;
      },

      /**
       * @param {Issuer} issuer
       * @param {Promise<void>} decisionP
       * @param {{ payment: Payment, sink: ERef<DepositFacet>}} src
       * @param {ERef<DepositFacet>} dstPurseP
       * @param {Amount} amount
       */
      transfer(issuer, decisionP, src, dstPurseP, amount) {
        const escrowPurseP = E(issuer).makeEmptyPurse();
        // setup phase 2
        Promise.resolve(decisionP).then(
          _ =>
            E(escrowPurseP)
              .withdraw(amount)
              .then(pmt => E(dstPurseP).receive(pmt, amount)),
          _ =>
            E(escrowPurseP)
              .withdraw(amount)
              .then(pmt => E(src.sink).receive(pmt, amount)),
        );
        return E(escrowPurseP).deposit(src.payment, amount); // phase 1
      },
    },
  );
