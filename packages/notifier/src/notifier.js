// @ts-check
/// <reference types="ses"/>

import { assert } from '@agoric/assert';
import { makePromiseKit } from '@endo/promise-kit';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeAsyncIterableFromNotifier } from './asyncIterableAdaptor.js';

import './types.js';

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
 * Adaptor from async iterable to notifier.
 *
 * @template T
 * @param {ERef<AsyncIterable<T>>} asyncIterableP
 * @returns {Notifier<T>}
 */
export const makeNotifierFromAsyncIterable = asyncIterableP => {
  const iteratorP = E(asyncIterableP)[Symbol.asyncIterator]();

  const resultPromiseMap = new WeakMap();
  let latestResultInP, latestResultOutP, nextResultInR, nextResultOutP;
  let latestUpdateCount = 0n;
  let finished = false;
  let finalResultOut = undefined;

  // Consume results as soon as their predecessors settle.
  (async function() {
    try {
      do {
        latestResultInP = E(iteratorP).next();
        if (nextResultInR) {
          nextResultInR(latestResultInP);
          nextResultInR = undefined;
        }
      } while (!(await latestResultInP).done);
    } catch (err) {}
    if (nextResultInR) {
      nextResultInR(latestResultInP);
      nextResultInR = undefined;
    }
  })();

  // Create outbound results on-demand, but at most once.
  function getLatestResultOutP() {
    if (!latestResultOutP) {
      assert(latestResultInP !== undefined);
      latestResultOutP = resultPromiseMap.get(latestResultInP);
      if (!latestResultOutP) {
        latestResultOutP = translateInboundResult(latestResultInP);
        resultPromiseMap.set(latestResultInP, latestResultOutP);
      }
    }
    return latestResultOutP;
  }
  function translateInboundResult(resultInP) {
    return resultInP.then(
      ({value, done}) => {
        // If this is resolving a post-finish request, preserve the final result.
        if (finished) {
          return finalResultOut;
        }

        let updateCount = undefined;
        if (done) {
          finished = true;

          // If there is a pending next-value promise, resolve it.
          if (nextResultInR) {
            nextResultInR(/*resultInP*/);
            nextResultInR = undefined;
          }

          finalResultOut = harden({value, updateCount});
          return finalResultOut;
        }

        latestUpdateCount += 1n;
        updateCount = latestUpdateCount;

        // Discard any pending promise.
        latestResultOutP = nextResultOutP = nextResultInR = undefined;

        return harden({value, updateCount});
      },
      rejection => {
        if (!finished) {
          finished = true;

          // If there is a pending next-value promise, resolve it.
          if (nextResultInR) {
            nextResultInR(resultInP);
            nextResultInR = undefined;
          }
        }
        throw rejection;
      },
    );
  }

  /**
   * @template T
   * @type {BaseNotifier<T>}
   */
  const baseNotifier = Far('baseNotifier', {
    getUpdateSince(updateCount = -1n) {
      assert(updateCount <= latestUpdateCount, 'argument must be a previously-issued updateCount.');

      // If we don't yet have an inbound result or a promise for an outbound result,
      // create the latter.
      if (!latestResultInP && !latestResultOutP) {
        const { promise, resolve } = makePromiseKit();
        nextResultInR = resolve;
        latestResultOutP = nextResultOutP = translateInboundResult(promise);
      }

      if (updateCount < latestUpdateCount) {
        // Each returned promise is unique.
        return getLatestResultOutP().then();
      }

      if (!nextResultOutP) {
        if (finished) {
          nextResultOutP = getLatestResultOutP();
        } else {
          const { promise, resolve } = makePromiseKit();
          nextResultInR = resolve;
          nextResultOutP = translateInboundResult(promise);
        }
      }

      // Each returned promise is unique.
      return nextResultOutP.then();
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
