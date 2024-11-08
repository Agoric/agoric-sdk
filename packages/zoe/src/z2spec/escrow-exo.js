// @ts-check
/**
 * @file escrow exchange using exos
 *
 * @todo use ownable pattern to
 * turn the seat object into a tradable
 * guarantee-of-funds-escrowed asset.
 *
 * @todo likewise the resolver
 */

import { assert, Fail } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { deeplyFulfilledObject } from '@agoric/internal';
import { prepareDurablePublishKit } from '@agoric/notifier';
import { isOfferSafe } from '../contractFacet/offerSafety.js';
import {
  addToAllocation,
  subtractFromAllocation,
} from '../contractFacet/allocationMath.js';

/**
 * @import {Zone} from '@agoric/base-zone'
 * @import {DepositFacet} from '@agoric/ertp'
 */

/** @param {Promise<void>} cancellationP */
const failOnly = cancellationP =>
  E.when(cancellationP, cancellation => {
    throw cancellation;
  });
harden(failOnly);

/**
 * @param {Zone} zone
 * @param {<T>() => PublishKit<T>} makeDurablePublishKit
 */
export const prepareSeatKit = (zone, makeDurablePublishKit) =>
  zone.exoClassKit(
    'Seat Kit',
    undefined,
    proposal => {
      /** @type {PublishKit<unknown>} */
      const exitKit = makeDurablePublishKit();
      /** @type {PublishKit<PaymentPKeywordRecord>} */
      const payoutsKit = makeDurablePublishKit();
      return {
        proposal,
        exitKit,
        payoutsKit,
        exiting: false,
        /** @type {Allocation} */
        currentAllocation: proposal.give,
      };
    },
    {
      readOnly: {
        hasExited() {
          return this.state.exiting;
        },
        getProposal() {
          return this.state.proposal;
        },
        getCurrentAllocation() {
          return this.state.currentAllocation;
        },
        getExitSubscriber() {
          return this.state.exitKit.subscriber;
        },
      },

      /** The right to collect payouts */
      seat: {
        /** @param {Keyword} kw */
        async getPayout(kw) {
          const { payoutsKit } = this.state;
          const paid = await payoutsKit.subscriber.getUpdateSince();
          return paid.value[kw];
        },
        async getPayouts() {
          const { payoutsKit } = this.state;
          const paid = await payoutsKit.subscriber.getUpdateSince();
          return paid.value;
        },

        /** @param {unknown} completion */
        async exit(completion) {
          assert.fail('TODO');
        },
        fail(reason) {
          assert.fail('TODO');
        },

        // TODO: how to avoid repeating the accessors?
        hasExited() {
          return this.state.exiting;
        },
        getProposal() {
          return this.state.proposal;
        },
        getCurrentAllocation() {
          return this.state.currentAllocation;
        },
        getExitSubscriber() {
          return this.state.exitKit.subscriber;
        },
      },
      /** The right to allocate payouts (subject to offer safety) */
      resolver: {
        /**
         * @param {AmountKeywordRecord} more
         * @param {AmountKeywordRecord} less
         * @throws if proposal is violated
         */
        updateAllocation(more, less) {
          const { proposal, currentAllocation, exiting } = this.state;
          !exiting || Fail`already exited`;
          const candiate = subtractFromAllocation(
            addToAllocation(currentAllocation, more),
            less,
          );
          isOfferSafe(proposal, candiate) ||
            Fail`Offer safety was violated by the proposed allocation: ${candiate}. Proposal was ${proposal}`;
          this.state.currentAllocation = candiate;
        },
        /** @param {unknown} completion */
        async exit(completion) {
          if (this.state.exiting) {
            return;
          }
          const { exitKit, payoutsKit } = this.state;

          this.state.exiting = true;
          exitKit.publisher.finish(completion);
          await deeplyFulfilledObject(payoutsKit.subscriber.getUpdateSince());
        },
        fail(reason) {
          assert.fail('TODO');
        },
      },
      /**
       * Caller must escrow proposal.give worth of funds;
       * then use getExitSubscriber(); on update, provide payments.
       */
      payee: {
        async receive(payments) {
          const { payoutsKit } = this.state;
          payoutsKit.publisher.finish(payments);

          await payoutsKit.subscriber.getUpdateSince();
        },
      },
    },
  );

/**
 * @param {Issuer} issuer
 * @param {Payment} payment
 * @param {Amount} amount
 */
const escrow = async (issuer, payment, amount) => {
  const purse = E(issuer).makeEmptyPurse();
  await E(purse).deposit(payment, amount);
  return purse;
};

/** @param {Zone} zone */
export const prepareEscrowExchange = zone => {
  const makeDurablePublishKit = prepareDurablePublishKit(
    zone.mapStore('publish baggage'),
    'escrow publisher',
  );
  const makeSeatKit = prepareSeatKit(zone, makeDurablePublishKit);

  const makeEscrowExchange = zone.exoClass(
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

        const escrowPurses = {
          Money: escrow(Money, a.payment, a.give.Money),
          Stock: escrow(Stock, b.payment, b.give.Stock),
        };

        const exit = harden({ onDemand: null });
        const seats = {
          a: makeSeatKit({ give: a.give, want: a.want, exit }),
          b: makeSeatKit({ give: b.give, want: b.want, exit }),
        };
        const paid = Promise.all(
          Object.values(seats).map(async ({ readOnly, payee }) => {
            await readOnly.getExitSubscriber().subscribeAfter();
            const { want } = readOnly.getProposal();
            const [wantKW] = Object.keys(want);
            const alloc = readOnly.getCurrentAllocation(); // TODO: refund give
            const amt = alloc[wantKW];
            const purse = escrowPurses[wantKW];
            const pmt = await E(purse).withdraw(amt);
            await payee.receive({ [wantKW]: pmt });
          }),
        );

        // contract reallocates using resolver
        const offerResults = Promise.all(
          Object.values(seats).map(async ({ readOnly, resolver }) => {
            const { give, want } = readOnly.getProposal();
            // "simple exchange"
            resolver.updateAllocation(want, give);
            await resolver.exit('fun!');
          }),
        );

        // users deposit payouts
        // TODO: move to caller
        const deposited = Promise.all(
          Object.entries(seats).map(async ([name, { seat }]) => {
            const { want } = seat.getProposal();
            const [wantKW] = Object.keys(want);
            const pmt = await seat.getPayout(wantKW);
            const who = this.state.parties[name];
            await who.sink.receive(pmt);
          }),
        );

        return {
          escrowed: Promise.all(Object.values(escrowPurses)).then(() => {}),
          paid,
          offerResults,
          deposited,
        };
      },
    },
  );
  return { makeEscrowExchange, makeSeatKit };
};
