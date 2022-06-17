// @ts-check
/// <reference types="ses"/>

import { assert } from '@agoric/assert';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeAsyncIterableFromNotifier } from './asyncIterableAdaptor.js';

import './types.js';
import { makeEmptyPublishKit } from './publish-kit.js';

/**
 * @template T
 * @param {ERef<BaseNotifier<T> | NotifierInternals<T>>} sharableInternalsP
 * @returns {AsyncIterable<T> & SharableNotifier<T>}
 */
export const makeNotifier = sharableInternalsP => {
  const asyncIterable = makeAsyncIterableFromNotifier(sharableInternalsP);

  /** @type {AsyncIterable<T> & SharableNotifier<T>} */
  const notifier = Far('notifier', {
    ...asyncIterable,

    /**
     * Use this to distribute a Notifier efficiently over the network,
     * by obtaining this from the Notifier to be replicated, and applying
     * `makeNotifier` to it at the new site to get an equivalent local
     * Notifier at that site.
     */
    getSharableNotifierInternals: () => sharableInternalsP,
    getStoreKey: () => harden({ notifier }),
  });
  return notifier;
};

/**
 * Produces a pair of objects, which allow a service to produce a stream of
 * update promises.
 *
 * The initial state argument has to be truly optional even though it can
 * be any first class value including `undefined`. We need to distinguish the
 * presence vs the absence of it, which we cannot do with the optional argument
 * syntax. Rather we use the arity of the `initialStateArr` array.
 *
 * If no initial state is provided to `makeNotifierKit`, then it starts without
 * an initial state. Its initial state will instead be the state of the first
 * update.
 *
 * @template T
 * @param {[] | [T]} initialStateArr the first state to be returned (typed as rest array to permit `undefined`)
 * @returns {NotifierRecord<T>} the notifier and updater
 */
export const makeNotifierKit = (...initialStateArr) => {
  const { publisher, subscriber } = makeEmptyPublishKit();

  // In contrast to publish kit subscribers
  // (and notifiers produced by makeNotifierFromAsyncIterable),
  // notifiers produced by makeNotifierKit
  // * deal in number-valued update counts, and
  // * count from 1, and
  // * ignore any input to getUpdateSince that doesn't match the latest update count, and
  // * return a final response as if it were "next".
  //
  // https://github.com/Agoric/agoric-sdk/pull/5435 originally attempted to impose
  // tighter restrictions, but failed to do so.
  // We instead continue supporting the looser behavior.

  // Data from the backing subscriber.
  let latestPublishCount;

  // Data exposed by this notifier.
  let latestUpdateCount;
  let currentResultP;
  let nextResultP;

  const getNextResultP = () => {
    if (!nextResultP) {
      nextResultP = E.when(
        subscriber.subscribeAfter(latestPublishCount),
        ({ head: { value, done }, publishCount }) => {
          // Update local data.
          latestPublishCount = publishCount;
          latestUpdateCount =
            latestUpdateCount === undefined ? 1 : latestUpdateCount + 1;
          currentResultP = nextResultP;
          if (!done) {
            nextResultP = undefined;
          }

          // Unlike a publish kit subscriber, notifier reports no count with a final value.
          const updateCount = done ? undefined : latestUpdateCount;
          return harden({ value, updateCount });
        },
      );
    }
    return nextResultP;
  };

  /**
   * @template T
   * @type {BaseNotifier<T>}
   */
  const baseNotifier = Far('baseNotifier', {
    getUpdateSince(sinceUpdateCount = undefined) {
      // Handle requests for the next state.
      if (sinceUpdateCount === latestUpdateCount) {
        return getNextResultP();
      }

      // Handle requests for the latest state.
      if (!currentResultP) {
        currentResultP = getNextResultP();
      }
      return currentResultP;
    },
  });

  const notifier = Far('notifier', {
    ...makeNotifier(baseNotifier),
    ...baseNotifier,
  });

  // To ensure that getUpdateSince() immediately after an update
  // doesn't return stale data, invalidate currentResultP.
  const wrapPublisherFunction = fn => {
    return arg => {
      currentResultP = undefined;
      fn(arg);
    };
  };

  const updater = Far('updater', {
    updateState: wrapPublisherFunction(publisher.publish),
    finish: wrapPublisherFunction(publisher.finish),
    fail: wrapPublisherFunction(publisher.fail),
  });

  assert(initialStateArr.length <= 1, 'too many arguments');
  if (initialStateArr.length === 1) {
    updater.updateState(initialStateArr[0]);
  }

  return harden({ notifier, updater });
};

/**
 * Adaptor from async iterable to notifier.
 *
 * @template T
 * @param {ERef<AsyncIterable<T>>} asyncIterableP
 * @returns {Notifier<T>}
 */
export const makeNotifierFromAsyncIterable = asyncIterableP => {
  const iteratorP = E(asyncIterableP)[Symbol.asyncIterator]();

  /** @type {Promise<UpdateRecord<T>>|undefined} */
  let optNextPromise;
  /** @type {UpdateCount & bigint} */
  let currentUpdateCount = 0n;
  /** @type {ERef<UpdateRecord<T>>|undefined} */
  let currentResponse;
  let final = false;

  /**
   * @template T
   * @type {BaseNotifier<T>}
   */
  const baseNotifier = Far('baseNotifier', {
    getUpdateSince(updateCount = -1n) {
      if (updateCount < currentUpdateCount) {
        if (currentResponse) {
          return Promise.resolve(currentResponse);
        }
      } else if (updateCount !== currentUpdateCount) {
        throw new Error('Invalid update count');
      }

      // Return a final response if we have one, otherwise a promise for the next state.
      if (final) {
        assert(currentResponse !== undefined);
        return Promise.resolve(currentResponse);
      }
      if (!optNextPromise) {
        const nextIterResultP = E(iteratorP).next();
        optNextPromise = E.when(
          nextIterResultP,
          ({ done, value }) => {
            assert(!final);
            if (done) {
              final = true;
            }
            currentUpdateCount += 1n;
            currentResponse = harden({
              value,
              updateCount: done ? undefined : currentUpdateCount,
            });
            optNextPromise = undefined;
            return currentResponse;
          },
          _reason => {
            final = true;
            currentResponse =
              /** @type {Promise<UpdateRecord<T>>} */
              (nextIterResultP);
            optNextPromise = undefined;
            return currentResponse;
          },
        );
      }
      return optNextPromise;
    },
  });

  /** @type {Notifier<T>} */
  const notifier = Far('notifier', {
    // Don't leak the original asyncIterableP since it may be remote and we also
    // want the same semantics for this exposed iterable and the baseNotifier.
    ...makeAsyncIterableFromNotifier(baseNotifier),
    ...baseNotifier,

    /**
     * Use this to distribute a Notifier efficiently over the network,
     * by obtaining this from the Notifier to be replicated, and applying
     * `makeNotifier` to it at the new site to get an equivalent local
     * Notifier at that site.
     */
    getSharableNotifierInternals: () => baseNotifier,
    getStoreKey: () => harden({ notifier }),
  });
  return notifier;
};
harden(makeNotifierFromAsyncIterable);
