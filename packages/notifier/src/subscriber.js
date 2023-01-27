/* eslint-disable no-underscore-dangle */
/// <reference types="ses"/>

import { E, Far } from '@endo/far';
import { makePublishKit } from './publish-kit.js';

import './types-ambient.js';

/**
 * @template T
 * @param {ERef<PublicationRecord<T>>} sharableInternalsP
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
     * @returns {ERef<PublicationRecord<T>>}
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
 * @param {ERef<PublicationRecord<T>>} tailP
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
 * @returns {SubscriptionRecord<T>}
 */
const makeSubscriptionKit = () => {
  const { publisher, subscriber } = makePublishKit();

  // The publish kit subscriber is prefix-lossy, so making *this* subscriber completely
  // lossless requires eager consumption of the former.
  // Such losslessness inhibits GC, which is why we're moving away from it.
  const pubList = subscriber.subscribeAfter();
  const subscription = makeSubscription(pubList);

  /** @type {IterationObserver<T>} */
  const publication = Far('publication', {
    updateState: publisher.publish,
    finish: publisher.finish,
    fail: publisher.fail,
  });

  return harden({ publication, subscription });
};
harden(makeSubscriptionKit);
export { makeSubscriptionKit };
