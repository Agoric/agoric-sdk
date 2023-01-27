/// <reference types="ses"/>

import { assert } from '@agoric/assert';
import { makePromiseKit } from '@endo/promise-kit';
import { makeAsyncIterableFromNotifier } from './asyncIterableAdaptor.js';
import { E, Far } from '@endo/far';

import './types-ambient.js';

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
  /** @type {PromiseRecord<UpdateRecord<T>>|undefined} */
  let optNextPromiseKit;
  /** @type {UpdateCount & (number | undefined)} */
  let currentUpdateCount = 1; // avoid falsy numbers
  /** @type {UpdateRecord<T>|undefined} */
  let currentResponse;

  const hasState = () => currentResponse !== undefined;

  const final = () => currentUpdateCount === undefined;

  const baseNotifier = Far('baseNotifier', {
    // NaN matches nothing
    getUpdateSince(updateCount = NaN) {
      if (
        hasState() &&
        (final() ||
          (currentResponse && currentResponse.updateCount !== updateCount))
      ) {
        // If hasState() and either it is final() or it is
        // not the state of updateCount, return the current state.
        assert(currentResponse !== undefined);
        return Promise.resolve(currentResponse);
      }
      // otherwise return a promise for the next state.
      if (!optNextPromiseKit) {
        optNextPromiseKit = makePromiseKit();
      }
      return optNextPromiseKit.promise;
    },
  });

  const notifier = Far('notifier', {
    ...makeNotifier(baseNotifier),
    ...baseNotifier,
  });

  const updater = Far('updater', {
    updateState(state) {
      if (final()) {
        throw new Error('Cannot update state after termination.');
      }

      // become hasState() && !final()
      assert(currentUpdateCount);
      currentUpdateCount += 1;
      currentResponse = harden({
        value: state,
        updateCount: currentUpdateCount,
      });
      if (optNextPromiseKit) {
        optNextPromiseKit.resolve(currentResponse);
        optNextPromiseKit = undefined;
      }
    },

    finish(finalState) {
      if (final()) {
        throw new Error('Cannot finish after termination.');
      }

      // become hasState() && final()
      currentUpdateCount = undefined;
      currentResponse = harden({
        value: finalState,
        updateCount: currentUpdateCount,
      });
      if (optNextPromiseKit) {
        optNextPromiseKit.resolve(currentResponse);
        optNextPromiseKit = undefined;
      }
    },

    fail(reason) {
      if (final()) {
        throw new Error('Cannot fail after termination.');
      }

      // become !hasState() && final()
      currentUpdateCount = undefined;
      currentResponse = undefined;
      if (!optNextPromiseKit) {
        optNextPromiseKit = makePromiseKit();
      }
      // Don't trigger Node.js's UnhandledPromiseRejectionWarning
      optNextPromiseKit.promise.catch(_ => {});
      optNextPromiseKit.reject(reason);
    },
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
 * @template T
 * @param {ERef<Subscriber<T>>} subscriberP
 * @returns {Notifier<T>}
 */
export const makeNotifierFromSubscriber = subscriberP => {
  /** @type {bigint} */
  let latestInboundCount;
  /** @type {UpdateCount & bigint} */
  let latestUpdateCount = 0n;
  /** @type {WeakMap<PublicationRecord<T>, Promise<UpdateRecord<T>>>} */
  const outboundResults = new WeakMap();

  /**
   * @param {PublicationRecord<T>} record
   * @returns {Promise<UpdateRecord<T>>}
   */
  const translateInboundPublicationRecord = record => {
    // Leverage identity preservation of `record`.
    const existingOutboundResult = outboundResults.get(record);
    if (existingOutboundResult) {
      return existingOutboundResult;
    }

    latestInboundCount = record.publishCount;
    latestUpdateCount += 1n;
    const resultP = E.when(record.head, ({ value, done }) => {
      if (done) {
        // Final results have undefined updateCount.
        return harden({ value, updateCount: undefined });
      }
      return harden({ value, updateCount: latestUpdateCount });
    });
    outboundResults.set(record, resultP);
    return resultP;
  };

  /**
   * @template T
   * @type {BaseNotifier<T>}
   */
  const baseNotifier = Far('baseNotifier', {
    getUpdateSince(updateCount = -1n) {
      assert(
        updateCount <= latestUpdateCount,
        'argument must be a previously-issued updateCount.',
      );

      if (updateCount < latestUpdateCount) {
        // Return the most recent result possible without imposing an unnecessary delay.
        return E(subscriberP)
          .subscribeAfter()
          .then(translateInboundPublicationRecord);
      }

      // Return a result that follows the last-returned result,
      // skipping over intermediate results if latestInboundCount
      // no longer corresponds with the latest result.
      // Note that unlike notifiers and subscribers respectively returned by
      // makeNotifierKit and makePublishKit, this result is not guaranteed
      // to follow the result returned when a non-latest updateCount is provided
      // (e.g., it is possible for `notifierFromSubscriber.getUpdateSince()` and
      // `notifierFromSubscriber.getUpdateSince(latestUpdateCount)` to both
      // settle to the same object `newLatest` where `newLatest.updateCount`
      // is one greater than `latestUpdateCount`).
      return E(subscriberP)
        .subscribeAfter(latestInboundCount)
        .then(translateInboundPublicationRecord);
    },
  });

  /** @type {Notifier<T>} */
  const notifier = Far('notifier', {
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
harden(makeNotifierFromSubscriber);

/**
 * Adaptor from async iterable to notifier.
 *
 * @deprecated The resulting notifier is lossless, which is not desirable.
 * Prefer makeNotifierFromSubscriber, and refer to
 * https://github.com/Agoric/agoric-sdk/issues/5413 and
 * https://github.com/Agoric/agoric-sdk/pull/5695 for context.
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
        throw new Error(
          'getUpdateSince argument must be a previously-issued updateCount.',
        );
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
