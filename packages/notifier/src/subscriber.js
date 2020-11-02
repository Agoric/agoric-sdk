// @ts-check
// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { HandledPromise, E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import './types';

/**
 * @template T
 * @param {SubscriptionInternals} startP
 * @returns {Subscription<T>}
 */
const makeSubscription = startP => {
  return harden({
    // eslint-disable-next-line no-use-before-define
    [Symbol.asyncIterator]: () => makeSubscriptionIterator(startP),
    /**
     *
     */
    getSharableSubscriptionInternals: () => startP,
  });
};
harden(makeSubscription);
export { makeSubscription };

/**
 * @template T
 * @param {SubscriptionInternals} tailP
 * @returns {SubscriptionIterator<T>}
 */
const makeSubscriptionIterator = tailP => {
  // To understand the implementation, start with
  // https://web.archive.org/web/20160404122250/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency#infinite_queue
  return harden({
    subscribe: () => makeSubscription(tailP),
    [Symbol.asyncIterator]: () => makeSubscriptionIterator(tailP),
    next: () => {
      const resultP = E.G(tailP).head;
      tailP = E.G(tailP).tail;
      return resultP;
    },
  });
};

/**
 *
 * @template T
 * @returns {SubscriptionRecord<T>}
 */
const makeSubscriptionKit = () => {
  let rear;
  const subscription = makeSubscription(new HandledPromise(r => (rear = r)));

  const publication = harden({
    updateState: value => {
      if (rear === undefined) {
        throw new Error('Cannot update state after termination.');
      }
      const { promise: nextTailE, resolve: nextRear } = makePromiseKit();
      rear(harden({ head: { value, done: false }, tail: nextTailE }));
      rear = nextRear;
    },
    finish: finalValue => {
      if (rear === undefined) {
        throw new Error('Cannot finish after termination.');
      }
      const readComplaint = HandledPromise.reject(
        new Error('cannot read past end of iteration'),
      );
      readComplaint.catch(_ => {}); // suppress unhandled rejection error
      rear({ head: { value: finalValue, done: true }, tail: readComplaint });
      rear = undefined;
    },
    fail: reason => {
      if (rear === undefined) {
        throw new Error('Cannot fail after termination.');
      }
      rear(HandledPromise.reject(reason));
      rear = undefined;
    },
  });
  return harden({ publication, subscription });
};
harden(makeSubscriptionKit);
export { makeSubscriptionKit };
