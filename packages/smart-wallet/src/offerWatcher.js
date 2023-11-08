/* global globalThis */

import { E, passStyleOf } from '@endo/far';

import { isUpgradeDisconnection } from '@agoric/internal/src/upgrade-api.js';
import { prepareExoClassKit } from '@agoric/vat-data';
import { M } from '@agoric/store';
import {
  PaymentPKeywordRecordShape,
  SeatShape,
} from '@agoric/zoe/src/typeGuards.js';
import { AmountShape } from '@agoric/store/test/borrow-guards.js';
import { objectMap, deeplyFulfilledObject } from '@agoric/internal';

/** Value for "result" field when the result can't be published */
export const UNPUBLISHED_RESULT = 'UNPUBLISHED';

/**
 * @typedef {import('./smartWallet.js').OfferSpec & {
 * error?: string,
 * numWantsSatisfied?: number
 * result?: unknown | typeof UNPUBLISHED_RESULT,
 * payouts?: AmountKeywordRecord,
 * }} OfferStatus
 */

const watchForOfferResult = (watcher, seat) => {
  const rWatcher = watcher.resultWatcher;
  globalThis.VatData.watchPromise(E(seat).getOfferResult(), rWatcher, seat);
};

const watchForNumWants = (watcher, seat) => {
  const nWatcher = watcher.numWantsWatcher;
  globalThis.VatData.watchPromise(E(seat).numWantsSatisfied(), nWatcher, seat);
};

const watchForPayout = (watcher, seat) => {
  const pWatcher = watcher.paymentWatcher;
  globalThis.VatData.watchPromise(E(seat).getPayouts(), pWatcher, seat);
};

export const watchOfferOutcomes = (watcher, seat) => {
  void watchForPayout(watcher, seat);
  void watchForNumWants(watcher, seat);
  void watchForOfferResult(watcher, seat);
};

const offerWatcherGuard = harden({
  helper: M.interface('InstanceAdminStorage', {
    updateStatus: M.call(M.any()).returns(),
    onNewContinuingOffer: M.call(
      M.or(M.number(), M.string()),
      AmountShape,
      M.any(),
    )
      .optional(M.record())
      .returns(),
    publishResult: M.call(M.any()).returns(),
    exitOpenSeats: M.call(M.any()).returns(),
  }),
  paymentWatcher: M.interface('paymentWatcher', {
    onFulfilled: M.call(PaymentPKeywordRecordShape, SeatShape).returns(
      M.promise(),
    ),
    onRejected: M.call(M.any(), SeatShape).returns(),
  }),
  resultWatcher: M.interface('resultWatcher', {
    onFulfilled: M.call(M.any(), SeatShape).returns(),
    onRejected: M.call(M.any(), SeatShape).returns(),
  }),
  numWantsWatcher: M.interface('numWantsWatcher', {
    onFulfilled: M.call(M.number(), SeatShape).returns(),
    onRejected: M.call(M.any(), SeatShape).returns(),
  }),
});

export const makeOfferWatcherMaker = baggage => {
  return prepareExoClassKit(
    baggage,
    'OfferWatcher',
    offerWatcherGuard,
    (walletHelper, deposit, offerSpec, address, iAmount, seatRef) => ({
      walletHelper,
      deposit,
      status: offerSpec,
      address,
      invitationAmount: iAmount,
      seatRef,
    }),
    {
      helper: {
        updateStatus(offerStatusUpdates) {
          const { state } = this;
          state.status = harden({ ...state.status, ...offerStatusUpdates });

          state.walletHelper.updateStatus(state.status, state.address);
        },
        onNewContinuingOffer(
          offerId,
          invitationAmount,
          invitationMakers,
          publicSubscribers,
        ) {
          const { state } = this;

          void state.walletHelper.addContinuingOffer(
            offerId,
            invitationAmount,
            invitationMakers,
            publicSubscribers,
            state.address,
          );
        },

        publishResult(result) {
          const { state, facets } = this;

          const passStyle = passStyleOf(result);
          // someday can we get TS to type narrow based on the passStyleOf result match?
          switch (passStyle) {
            case 'bigint':
            case 'boolean':
            case 'null':
            case 'number':
            case 'string':
            case 'symbol':
            case 'undefined':
              facets.helper.updateStatus({ result });
              break;
            case 'copyRecord':
              if ('invitationMakers' in result) {
                // save for continuing invitation offer

                void facets.helper.onNewContinuingOffer(
                  String(state.status.id),
                  state.invitationAmount,
                  result.invitationMakers,
                  result.publicSubscribers,
                );
              }
              facets.helper.updateStatus({ result: UNPUBLISHED_RESULT });
              break;
            default:
              // drop the result
              facets.helper.updateStatus({ result: UNPUBLISHED_RESULT });
          }
        },

        exitOpenSeats(reason) {
          const { state } = this;
          void E.when(E(state.seatRef).hasExited(), hasExited => {
            if (!hasExited) {
              void E(state.seatRef).tryExit();
            }
          });

          // propagate to caller
          throw reason;
        },
      },

      paymentWatcher: {
        async onFulfilled(payouts) {
          const { state, facets } = this;

          // This will block until all payouts succeed, but user will be updated
          // since each payout will trigger its corresponding purse notifier.
          const amountPKeywordRecord = objectMap(payouts, paymentRef =>
            E.when(paymentRef, payment => state.deposit.receive(payment)),
          );
          const amounts = await deeplyFulfilledObject(amountPKeywordRecord);
          facets.helper.updateStatus({ payouts: amounts });
        },
        onRejected(reason, seat) {
          const { facets } = this;

          if (isUpgradeDisconnection(reason)) {
            console.log(`resetting payments watcher after upgrade`, reason);
            // eslint-disable-next-line no-use-before-define
            watchForPayout(seat);
          } else {
            facets.helper.exitOpenSeats(reason);
          }
        },
      },

      resultWatcher: {
        onFulfilled(result) {
          const { facets } = this;
          facets.helper.publishResult(result);
        },
        onRejected(reason, seat) {
          const { facets } = this;
          if (isUpgradeDisconnection(reason)) {
            console.log(`resetting offerResults watcher after upgrade`, reason);
            watchForOfferResult(facets, seat);
          } else {
            facets.helper.exitOpenSeats(reason);
          }
        },
      },

      numWantsWatcher: {
        onFulfilled(numSatisfied) {
          const { facets } = this;

          facets.helper.updateStatus({ numWantsSatisfied: numSatisfied });
        },
        onRejected(reason, seat) {
          const { facets } = this;
          if (isUpgradeDisconnection(reason)) {
            console.log(`resetting numWants watcher after upgrade`, reason);
            watchForNumWants(facets, seat);
          } else {
            facets.helper.exitOpenSeats(reason);
          }
        },
      },
    },
  );
};
harden(makeOfferWatcherMaker);

/** @typedef {ReturnType<makeOfferWatcherMaker>} MakeOfferWatcher */
