import { E, Far } from '@endo/far';
import { makeNotifier } from '@agoric/notifier';

/**
 * @template T
 * @param {ERef<Notifier<T>>} notifier
 * @returns {ConsistentAsyncIterable<T>}
 */
export const makeNotifierIterable = notifier =>
  makeNotifier(E(notifier).getSharableNotifierInternals());

/**
 * TODO: Remove this function when we have `makePublisherKit`.
 *
 * @template T
 * @param {ERef<PublicationRecord<T>>} tailP
 * @returns {AsyncIterator<T>}
 */
const makeSubscriptionIterator = tailP => {
  // To understand the implementation, start with
  // https://web.archive.org/web/20160404122250/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency#infinite_queue
  return Far('SubscriptionIterator', {
    next: async () => {
      const resultP = E.get(tailP).head;
      tailP = E.get(tailP).tail;
      return resultP;
    },
  });
};

/**
 * TODO: Remove this function when we have `makePublisherKit`.
 *
 * @template T
 * @param {ERef<Subscription<T>>} subscription
 * @returns {ConsistentAsyncIterable<T>}
 */
export const makeSubscriptionIterable = subscription =>
  harden({
    [Symbol.asyncIterator]: () =>
      makeSubscriptionIterator(
        E(subscription).getSharableSubscriptionInternals(),
      ),
  });

/**
 * @template TIn
 * @template TOut
 * @param {AsyncIterable<TIn>} iterable
 * @param {(value: TIn) => TOut} transform
 * @returns {AsyncIterable<TOut>}
 */
export const mapAsyncIterable = (iterable, transform) => {
  async function* transformGenerator() {
    for await (const value of iterable) {
      yield transform(value);
    }
  }
  return transformGenerator();
};

/**
 * TODO: Remove this function when we have `makePublisherKit`.
 *
 * @template T
 * @param {ERef<import('./types').Follower<T>>} follower
 */
export const iterateLatest = follower =>
  // For now, just pass through the iterable.
  Far('iterateLatest iterable', {
    /** @returns {AsyncIterator<T>} */
    [Symbol.asyncIterator]: () => {
      const latestIterable = E(follower).getLatestIterable();
      const iterator = E(latestIterable)[Symbol.asyncIterator]();
      return Far('iterateLatest iterator', {
        next: () => E(iterator).next(),
      });
    },
  });

/**
 * TODO: Remove this function when we have `makePublisherKit`.
 *
 * @template T
 * @param {ERef<import('./types.js').Follower<T>>} follower
 * @param {import('./types.js').IterateEachOptions} [options]
 */
export const iterateEach = (follower, options) =>
  // For now, just pass through the iterable.
  Far('iterateEach iterable', {
    /** @returns {AsyncIterator<T>} */
    [Symbol.asyncIterator]: () => {
      const eachIterable = E(follower).getEachIterable(options);
      const iterator = E(eachIterable)[Symbol.asyncIterator]();
      return Far('iterateEach iterator', {
        next: () => E(iterator).next(),
      });
    },
  });

/**
 * @template T
 * @param {ERef<import('./types.js').Follower<T>>} follower
 * @param {import('./types.js').IterateEachOptions} [options]
 */
export const iterateReverse = (follower, options) =>
  // For now, just pass through the iterable.
  Far('iterateReverse iterable', {
    /** @returns {AsyncIterator<T>} */
    [Symbol.asyncIterator]: () => {
      const eachIterable = E(follower).getReverseIterable(options);
      const iterator = E(eachIterable)[Symbol.asyncIterator]();
      return Far('iterateEach iterator', {
        next: () => E(iterator).next(),
      });
    },
  });
