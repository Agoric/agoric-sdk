import { E, passStyleOf } from '@endo/far';

import {
  isAbandonedError,
  isUpgradeDisconnection,
} from '@agoric/internal/src/upgrade-api.js';
import { prepareExoClassKit, watchPromise } from '@agoric/vat-data';
import { M } from '@agoric/store';
import {
  PaymentPKeywordRecordShape,
  SeatShape,
} from '@agoric/zoe/src/typeGuards.js';
import { AmountShape } from '@agoric/ertp/src/typeGuards.js';
import { deeplyFulfilledObject, objectMap } from '@agoric/internal';

import { UNPUBLISHED_RESULT } from './offers.js';

/**
 * @import {OfferSpec} from './offers.js';
 * @import {ContinuingOfferResult} from './types.js';
 * @import {Passable} from '@endo/pass-style';
 * @import {PromiseWatcher} from '@agoric/swingset-liveslots';
 * @import {Baggage} from '@agoric/vat-data';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/base-zone';
 * @import {PaymentPKeywordRecord, Proposal, UserSeat, ZoeService} from '@agoric/zoe';
 * @import {InvitationMakers} from './types.js';
 * @import {PublicSubscribers} from './types.js';
 * @import {UpgradeDisconnection} from '@agoric/internal/src/upgrade-api.js';
 */

/**
 * @template {any} T
 * @typedef {PromiseWatcher<T, [UserSeat]>} OfferPromiseWatcher<T, [UserSeat]
 */

/**
 * @typedef {{
 *   resultWatcher: OfferPromiseWatcher<Passable>;
 *   numWantsWatcher: OfferPromiseWatcher<number>;
 *   paymentWatcher: OfferPromiseWatcher<PaymentPKeywordRecord>;
 * }} OutcomeWatchers
 */

/**
 * Adopted from `@agoric/vow/vat.js`
 *
 * @param {unknown} reason
 * @param {unknown} priorRetryValue
 */
const isRetryableReason = (reason, priorRetryValue) => {
  if (
    isUpgradeDisconnection(reason) &&
    (!isUpgradeDisconnection(priorRetryValue) ||
      reason.incarnationNumber > priorRetryValue.incarnationNumber)
  ) {
    return reason;
  }
  // For abandoned errors there is no way to differentiate errors from
  // consecutive upgrades
  if (isAbandonedError(reason) && !isAbandonedError(priorRetryValue)) {
    return reason;
  }
  return undefined;
};

/** @param {VowTools} vowTools */
const makeWatchForOfferResult = ({ watch }) => {
  /**
   * @param {OutcomeWatchers} watchers
   * @param {UserSeat} seat
   * @returns {Vow<void>} Vow that resolves when offer result has been processed
   *   by the resultWatcher
   */
  const watchForOfferResult = ({ resultWatcher }, seat) => {
    // Offer result may be anything, including a Vow, so watch it durably.
    return watch(E(seat).getOfferResult(), resultWatcher, seat);
  };
  return watchForOfferResult;
};

/**
 * @param {OutcomeWatchers} watchers
 * @param {UserSeat} seat
 */
const watchForNumWants = ({ numWantsWatcher }, seat) => {
  const p = E(seat).numWantsSatisfied();
  watchPromise(p, numWantsWatcher, seat);
  return p;
};

/**
 * @param {OutcomeWatchers} watchers
 * @param {UserSeat} seat
 */
const watchForPayout = ({ paymentWatcher }, seat) => {
  const p = E(seat).getPayouts();
  watchPromise(p, paymentWatcher, seat);
  return p;
};

/** @param {VowTools} vowTools */
export const makeWatchOfferOutcomes = vowTools => {
  const watchForOfferResult = makeWatchForOfferResult(vowTools);
  const { when, allVows } = vowTools;
  /**
   * @param {OutcomeWatchers} watchers
   * @param {UserSeat} seat
   */
  const watchOfferOutcomes = (watchers, seat) => {
    // Use `when` to get a promise from the vow.
    // Unlike `asPromise` this doesn't warn in case of disconnections, which is
    // fine since we actually handle the outcome durably through the watchers.
    // Only the `executeOffer` caller relies on the settlement of this promise,
    // and only in tests.
    return when(
      allVows([
        watchForOfferResult(watchers, seat),
        watchForNumWants(watchers, seat),
        watchForPayout(watchers, seat),
      ]),
    );
  };
  return watchOfferOutcomes;
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
    handleError: M.call(M.error()).returns(),
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

/**
 * @param {Baggage} baggage
 * @param {VowTools} vowTools
 * @param {Zone} zone
 */
export const prepareOfferWatcher = (baggage, vowTools, zone) => {
  const watchForOfferResult = makeWatchForOfferResult(vowTools);

  const extraProps = zone.weakMapStore('offerWatcherExtraProps');
  /**
   * Implement retry logic for offer watchers. This uses the stateful
   * `isRetryableReason` to avoid infinite promise rejection loops upon remote
   * vat upgrade.
   *
   * @param {{}} facet
   * @param {unknown} reason
   * @returns {reason is UpgradeDisconnection} roughly
   */
  const needsRetry = (facet, reason) => {
    const exists = extraProps.has(facet);
    const extra = exists ? extraProps.get(facet) : harden({});

    const key = `priorRetry`;
    const priorRetryable = extra[key];
    const retryable = isRetryableReason(reason, priorRetryable);
    if (retryable) {
      // Insert / update the new state.
      extraProps[exists ? 'set' : 'init'](
        facet,
        harden({
          ...extra,
          [key]: retryable,
        }),
      );
    } else if (exists) {
      // Delete/shrink existing state to clean up unnecessary state.
      const { [key]: _omit, ...rest } = extra;
      if (Object.keys(rest).length === 0) {
        extraProps.delete(facet);
      } else {
        extraProps.set(facet, harden(rest));
      }
    }
    return !!retryable;
  };

  return prepareExoClassKit(
    baggage,
    'OfferWatcher',
    offerWatcherGuard,
    // XXX walletHelper is `any` because the helper facet is too nested to export its type
    /**
     * @param {any} walletHelper
     * @param {{ receive: (payment: Payment) => Promise<Amount> }} deposit
     * @param {OfferSpec} offerSpec
     * @param {string} address
     * @param {Amount<'set'>} invitationAmount
     * @param {UserSeat} seatRef
     */
    (walletHelper, deposit, offerSpec, address, invitationAmount, seatRef) => ({
      walletHelper,
      deposit,
      status: offerSpec,
      address,
      invitationAmount,
      seatRef,
    }),
    {
      helper: {
        /**
         * @param {Record<string, unknown>} offerStatusUpdates
         */
        updateStatus(offerStatusUpdates) {
          const { state } = this;
          state.status = harden({ ...state.status, ...offerStatusUpdates });

          state.walletHelper.updateStatus(state.status);
        },
        /**
         * @param {string} offerId
         * @param {Amount<'set'>} invitationAmount
         * @param {InvitationMakers} invitationMakers
         * @param {PublicSubscribers} publicSubscribers
         */
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
          );
        },

        /** @param {Passable | ContinuingOfferResult} result */
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
              // @ts-expect-error narrowed by passStyle
              if ('invitationMakers' in result) {
                // save for continuing invitation offer

                void facets.helper.onNewContinuingOffer(
                  String(state.status.id),
                  state.invitationAmount,
                  // @ts-expect-error narrowed by passStyle
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
        /**
         * Called when the offer result promise rejects. The other two watchers
         * are waiting for particular values out of Zoe but they settle at the
         * same time and don't need their own error handling.
         *
         * @param {Error} err
         */
        handleError(err) {
          const { facets } = this;
          facets.helper.updateStatus({ error: err.toString() });
          const { seatRef } = this.state;
          void E.when(E(seatRef).hasExited(), hasExited => {
            if (!hasExited) {
              void E(seatRef).tryExit();
            }
          });
        },
      },

      /** @type {OutcomeWatchers['paymentWatcher']} */
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
        /**
         * If promise disconnected, watch again. Or if there's an Error, handle
         * it.
         *
         * @param {Error | UpgradeDisconnection} reason
         * @param {UserSeat} seat
         */
        onRejected(reason, seat) {
          const { facets } = this;
          if (needsRetry(facets.paymentWatcher, reason)) {
            void watchForPayout(facets, seat);
          } else {
            facets.helper.handleError(reason);
          }
        },
      },

      /** @type {OutcomeWatchers['resultWatcher']} */
      resultWatcher: {
        onFulfilled(result) {
          const { facets } = this;
          const { walletHelper } = this.state;
          const { saveResult } = this.state.status;
          if (saveResult) {
            // Note: result is passable and storable since it was received from another vat
            const name = walletHelper.saveEntry(saveResult, result);
            facets.helper.updateStatus({
              result: {
                name,
                passStyle: passStyleOf(result),
              },
            });
          } else {
            facets.helper.publishResult(result);
          }
        },
        /**
         * If promise disconnected, watch again. Or if there's an Error, handle
         * it.
         *
         * @param {Error | UpgradeDisconnection} reason
         * @param {UserSeat} seat
         */
        onRejected(reason, seat) {
          const { facets } = this;
          if (needsRetry(facets.resultWatcher, reason)) {
            void watchForOfferResult(facets, seat);
          } else {
            facets.helper.handleError(reason);
          }
          // throw so the vow watcher propagates the rejection
          throw reason;
        },
      },

      /** @type {OutcomeWatchers['numWantsWatcher']} */
      numWantsWatcher: {
        onFulfilled(numSatisfied) {
          const { facets } = this;

          facets.helper.updateStatus({ numWantsSatisfied: numSatisfied });
        },
        /**
         * If promise disconnected, watch again.
         *
         * Errors are handled by the paymentWatcher because numWantsSatisfied()
         * and getPayouts() settle the same (they await the same promise and
         * then synchronously return a local value).
         *
         * @param {Error | UpgradeDisconnection} reason
         * @param {UserSeat} seat
         */
        onRejected(reason, seat) {
          const { facets } = this;
          if (needsRetry(facets.numWantsWatcher, reason)) {
            void watchForNumWants(facets, seat);
          } else {
            facets.helper.handleError(reason);
          }
          throw reason;
        },
      },
    },
  );
};
harden(prepareOfferWatcher);

/** @typedef {ReturnType<typeof prepareOfferWatcher>} MakeOfferWatcher */
/** @typedef {ReturnType<MakeOfferWatcher>} OfferWatcher */
