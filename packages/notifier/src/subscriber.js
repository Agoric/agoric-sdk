/* eslint-disable no-underscore-dangle */
// @ts-check
/// <reference types="ses"/>

import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeEmptyPublishKit } from './publish-kit.js';

import './types.js';

/**
 * @template T
 * @param {ERef<SubscriptionInternals<T>>} sharableInternalsP
 * @returns {Subscription<T>}
 */
const makeSubscription = sharableInternalsP => {
  const subscription = Far('Subscription', {
    // eslint-disable-next-line no-use-before-define
    [Symbol.asyncIterator]: () => makeSubscriptionIterator(sharableInternalsP),

    /**
     * Use this to distribute a Subscription efficiently over the network,
     * by obtaining this from the Subscription to be replicated, and applying
     * `makeSubscription` to it at the new site to get an equivalent local
     * Subscription at that site.
     *
     * @returns {ERef<SubscriptionInternals<T>>}
     */
    getSharableSubscriptionInternals: () => sharableInternalsP,

    getStoreKey: () => harden({ subscription }),
  });
  return subscription;
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
      Promise.resolve(tailP).catch(() => {}); // suppress unhandled rejection error
      return resultP;
    },
  });
};

/**
 * Makes a `{ publication, subscription }` for doing lossless efficient
 * distributed pub/sub.
 *
 * @template T
 * @param {T[]} optionalInitialState
 * @returns {SubscriptionRecord<T>}
 */
const makeSubscriptionKit = (...optionalInitialState) => {
  const { publisher, subscriber } = makeEmptyPublishKit();

  // Unlike the Subscriber contract, the Subscription contract is completely
  // lossless, do we get the PublicationList immediately and then reuse that.
  // This losslessness will inhibit gc, which is why we're moving away from
  // it.
  const pubList = subscriber.subscribeAfter();
  const sharableInternalsP = /** @type {ERef<SubscriptionInternals<T>>} */ (
    /** @type {unknown} */ (pubList)
  );
  const subscription = makeSubscription(sharableInternalsP);

  /** @type {IterationObserver<T>} */
  const publication = Far('publication', {
    updateState: publisher.publish,
    finish: publisher.finish,
    fail: publisher.fail,
  });

  if (optionalInitialState.length > 0) {
    publication.updateState(optionalInitialState[0]);
  }
  return harden({ publication, subscription });
};
harden(makeSubscriptionKit);
export { makeSubscriptionKit };
