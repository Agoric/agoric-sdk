// @ts-check
/// <reference types="ses"/>

import { assert } from '@agoric/assert';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeAsyncIterableFromNotifier } from './asyncIterableAdaptor.js';

import './types.js';
import { makeEmptyPublishKit } from './publish-kit.js';

/**
 * TODO Believe it or not, some tool in our toolchain still cannot handle
 * bigint literals.
 * See https://github.com/Agoric/agoric-sdk/issues/5438
 */
const ONE = BigInt(1);

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

  /**
   * @template T
   * @type {BaseNotifier<T>}
   */
  const baseNotifier = Far('baseNotifier', {
    getUpdateSince(sinceUpdateCount = undefined) {
      return E.when(
        subscriber.subscribeAfter(sinceUpdateCount),
        ({ head: { value, done }, publishCount }) => {
          // Unlike publish kit, notifier reports no count with a final value.
          const updateCount = done ? undefined : publishCount;
          return harden({ value, updateCount });
        },
      );
    },
  });

  const notifier = Far('notifier', {
    ...makeNotifier(baseNotifier),
    ...baseNotifier,
  });

  const updater = Far('updater', {
    updateState: publisher.publish,
    finish: publisher.finish,
    fail: publisher.fail,
  });

  assert(initialStateArr.length <= 1, 'too many arguments');
  if (initialStateArr.length === 1) {
    updater.updateState(initialStateArr[0]);
  }

  // notifier facet is separate so it can be handed out while updater
  // is tightly held
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
  let currentUpdateCount = ONE - ONE;
  /** @type {ERef<UpdateRecord<T>>|undefined} */
  let currentResponse;
  let final = false;

  /**
   * @template T
   * @type {BaseNotifier<T>}
   */
  const baseNotifier = Far('baseNotifier', {
    getUpdateSince(updateCount = -ONE) {
      if (updateCount < currentUpdateCount) {
        if (currentResponse) return Promise.resolve(currentResponse);
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
            if (done) final = true;
            currentUpdateCount += ONE;
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
