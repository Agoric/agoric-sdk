/* eslint-disable no-underscore-dangle */
// @ts-check
/// <reference types="ses"/>

import { HandledPromise, E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

import './types.js';

/**
 * @template T
 * @param {Iteration<T>} tailP
 * @returns {AsyncIterator<T>}
 */
const makeSubscriptionIterator = tailP => {
  // To understand the implementation, start with
  // https://web.archive.org/web/20160404122250/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency#infinite_queue
  return Far('SubscriptionIterator', {
    next: () => {
      const resultP = E.get(tailP).head;
      tailP = E.get(tailP).tail;
      return resultP;
    },
  });
};

/**
 * Makes a behavioral presence of a possibly far subscription.
 *
 * @template T
 * @param {GetIterationSince<T>} getIterationSince
 * @returns {Subscription<T>}
 */
const makeSubscription = getIterationSince => {
  return Far('Subscription', {
    [Symbol.asyncIterator]: () => makeSubscriptionIterator(getIterationSince()),

    getIterationSince,
  });
};

/**
 * Makes a behavioral presence of a possibly far subscription.
 *
 * @template T
 * @param {ERef<Subscription<T>>} subscriptionP
 * @returns {Subscription<T>}
 */
export const shadowSubscription = subscriptionP => {
  const getIterationSince = (updateCount = NaN) =>
    E(subscriptionP).getIterationSince(updateCount);

  return makeSubscription(getIterationSince);
};
harden(shadowSubscription);

/**
 * Makes a `{ publication, subscription }` for doing lossless efficient
 * distributed pub/sub.
 *
 * @template T
 * @returns {SubscriptionRecord<T>}
 */
export const makeSubscriptionKit = () => {
  /** @type {((internals: Iteration<T>) => void) | undefined} */
  let tailR;
  let tailP = new HandledPromise(r => (tailR = r));

  let currentUpdateCount = 1;
  /** @type {Iteration<T>} */
  let currentP = tailP;
  const advanceCurrent = () => {
    if (currentP === tailP) {
      // If tailP has not advanced past currentP, do nothing.
      return;
    }
    currentUpdateCount += 1;
    currentP = tailP;
  };

  const getIterationSince = (updateCount = NaN) => {
    if (currentUpdateCount === updateCount) {
      return tailP;
    } else {
      return currentP;
    }
  };
  const subscription = makeSubscription(getIterationSince);

  /** @type {IterationObserver<T>} */
  const publication = Far('publication', {
    updateState: value => {
      if (tailR === undefined) {
        throw new Error('Cannot update state after termination.');
      }

      advanceCurrent();
      let nextTailR;
      const nextTailP = new HandledPromise(r => (nextTailR = r));
      tailR(
        harden({
          head: { value, done: false },
          updateCount: currentUpdateCount,
          tail: nextTailP,
        }),
      );
      tailP = nextTailP;
      tailR = nextTailR;
    },
    finish: finalValue => {
      if (tailR === undefined) {
        throw new Error('Cannot finish after termination.');
      }
      const readComplaint = HandledPromise.reject(
        new Error('cannot read past end of iteration'),
      );
      readComplaint.catch(_ => {}); // suppress unhandled rejection error

      advanceCurrent();
      tailR({
        head: { value: finalValue, done: true },
        updateCount: currentUpdateCount,
        tail: readComplaint,
      });
      tailR = undefined;
    },
    fail: reason => {
      if (tailR === undefined) {
        throw new Error('Cannot fail after termination.');
      }

      advanceCurrent();
      /** @type {Iteration<T>} */
      const rejection = HandledPromise.reject(reason);
      tailR(rejection);
      tailR = undefined;
    },
  });
  return harden({ publication, subscription });
};
harden(makeSubscriptionKit);
