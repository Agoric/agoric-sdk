/* eslint-disable no-underscore-dangle */
// @ts-check
/// <reference types="ses"/>

import { HandledPromise, E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makePromiseKit } from '@endo/promise-kit';

import './types.js';

export const DEFAULT_SUBSCRIPTION_HISTORY_LIMIT = Infinity;

/**
 * @template T
 * @param {(() => ERef<SubscriptionInternals<T>>) |
 *   ERef<SubscriptionInternals<T>>
 * } internalsOrThunk
 * @returns {Subscription<T>}
 */
const makeSubscription = internalsOrThunk => {
  const getSharableSubscriptionInternals =
    typeof internalsOrThunk === 'function'
      ? () => internalsOrThunk()
      : () => internalsOrThunk;

  return Far('Subscription', {
    [Symbol.asyncIterator]: () =>
      // eslint-disable-next-line no-use-before-define
      makeSubscriptionIterator(getSharableSubscriptionInternals()),

    /**
     * Use this to distribute a Subscription efficiently over the network,
     * by obtaining this from the Subscription to be replicated, and applying
     * `makeSubscription` to it at the new site to get an equivalent local
     * Subscription at that site.
     *
     * @returns {ERef<SubscriptionInternals<T>>}
     */
    getSharableSubscriptionInternals,
  });
};
harden(makeSubscription);
export { makeSubscription };

/**
 * @template T
 * @param {ERef<SubscriptionInternals<T>>} tailP
 * @returns {SubscriptionIterator<T>}
 */
const makeSubscriptionIterator = tailP => {
  // To understand the implementation, start with
  // https://web.archive.org/web/20160404122250/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency#infinite_queue
  return Far('SubscriptionIterator', {
    subscribe: () => makeSubscription(tailP),
    [Symbol.asyncIterator]: () => makeSubscriptionIterator(tailP),
    next: () => {
      const resultP = E.get(tailP).head;
      tailP = E.get(tailP).tail;
      return resultP;
    },
  });
};

/**
 * Makes a `{ publication, subscription }` for doing lossless efficient
 * distributed pub/sub.
 *
 * @template T
 * @param {number} [historyLimit]
 * @returns {SubscriptionRecord<T>}
 */
const makeSubscriptionKit = (
  historyLimit = DEFAULT_SUBSCRIPTION_HISTORY_LIMIT,
) => {
  historyLimit = Math.max(historyLimit, 0);

  /** @type {((internals: ERef<SubscriptionInternals<T>>) => void) | undefined} */
  let rear;
  const hp = new HandledPromise(r => (rear = r));

  /**
   * An array of [...historicalPromises, nextPromise].
   *
   * @type {Promise<SubscriptionInternals<T>>[]}
   */
  const history = [hp];

  // Our state to start from is the earliest historical promise.
  const subscription = makeSubscription(() => history[0]);

  /** @type {IterationObserver<T>} */
  const publication = Far('publication', {
    updateState: value => {
      if (rear === undefined) {
        throw new Error('Cannot update state after termination.');
      }
      const { promise: nextTailE, resolve: nextRear } = makePromiseKit();
      rear(harden({ head: { value, done: false }, tail: nextTailE }));
      rear = nextRear;

      // Prune history.
      history.splice(0, Math.max(history.length - historyLimit, 0));
      history.push(nextTailE);
    },
    finish: finalValue => {
      if (rear === undefined) {
        throw new Error('Cannot finish after termination.');
      }
      const readComplaint = HandledPromise.reject(
        new Error('cannot read past end of iteration'),
      );
      readComplaint.catch(_ => {}); // suppress unhandled rejection error
      rear(
        harden({
          head: { value: finalValue, done: true },
          tail: readComplaint,
        }),
      );
      rear = undefined;
    },
    fail: reason => {
      if (rear === undefined) {
        throw new Error('Cannot fail after termination.');
      }
      /** @type {Promise<SubscriptionInternals<T>>} */
      const rejection = HandledPromise.reject(reason);
      rear(rejection);
      rear = undefined;
    },
  });
  return harden({ publication, subscription });
};
harden(makeSubscriptionKit);
export { makeSubscriptionKit };
