// @ts-check

import { M } from '@endo/patterns';
import { PromiseWatcherI } from '@agoric/base-zone';

const { Fail, bare, details: X } = assert;

/**
 * @import {MapStore} from '@agoric/store/src/types.js';
 * @import {Zone} from '@agoric/base-zone';
 * @import {Watch} from './watch.js';
 * @import {When} from './when.js';
 * @import {VowKit, AsPromiseFunction, IsRetryableReason, Vow} from './types.js';
 */

const VowShape = M.tagged(
  'Vow',
  harden({
    vowV0: M.remotable('VowV0'),
  }),
);

/**
 * Like `provideLazy`, but accepts non-Passable values.
 *
 * @param {WeakMap} map
 * @param {any} key
 * @param {(key: any) => any} makeValue
 */
const provideLazyMap = (map, key, makeValue) => {
  if (!map.has(key)) {
    map.set(key, makeValue(key));
  }
  return map.get(key);
};

/**
 * @param {Zone} zone
 * @param {object} powers
 * @param {Watch} powers.watch
 * @param {When} powers.when
 * @param {() => VowKit<any>} powers.makeVowKit
 * @param {IsRetryableReason} powers.isRetryableReason
 */
export const prepareWatchUtils = (
  zone,
  { watch, when, makeVowKit, isRetryableReason },
) => {
  const detached = zone.detached();
  const utilsToNonStorableResults = new WeakMap();

  const makeWatchUtilsKit = zone.exoClassKit(
    'WatchUtils',
    {
      utils: M.interface('Utils', {
        all: M.call(M.arrayOf(M.any())).returns(VowShape),
        allSettled: M.call(M.arrayOf(M.any())).returns(VowShape),
        asPromise: M.call(M.raw()).rest(M.raw()).returns(M.promise()),
      }),
      watcher: M.interface('Watcher', {
        onFulfilled: M.call(M.raw()).rest(M.raw()).returns(M.raw()),
        onRejected: M.call(M.raw()).rest(M.raw()).returns(M.raw()),
      }),
      helper: M.interface('Helper', {
        createVow: M.call(M.arrayOf(M.any()), M.boolean()).returns(VowShape),
        processResult: M.call(M.raw()).rest(M.raw()).returns(M.undefined()),
      }),
      retryRejectionPromiseWatcher: PromiseWatcherI,
    },
    () => {
      /**
       * @typedef {object} VowState
       * @property {number} remaining
       * @property {MapStore<number, any>} resultsMap
       * @property {VowKit['resolver']} resolver
       * @property {boolean} [isAllSettled]
       */
      /** @type {MapStore<bigint, VowState>} */
      const idToVowState = detached.mapStore('idToVowState');

      return {
        nextId: 0n,
        idToVowState,
      };
    },
    {
      utils: {
        /** @param {unknown[]} specimens */
        all(specimens) {
          return this.facets.helper.createVow(specimens, false);
        },
        /** @param {unknown[]} specimens */
        allSettled(specimens) {
          return /** @type {Vow<({status: 'fulfilled', value: any} | {status: 'rejected', reason: any})[]>} */ (
            this.facets.helper.createVow(specimens, true)
          );
        },
        /** @type {AsPromiseFunction} */
        asPromise(specimenP, ...watcherArgs) {
          // Watch the specimen in case it is an ephemeral promise.
          const vow = watch(specimenP, ...watcherArgs);
          const promise = when(vow);
          // Watch the ephemeral result promise to ensure that if its settlement is
          // lost due to upgrade of this incarnation, we will at least cause an
          // unhandled rejection in the new incarnation.
          zone.watchPromise(promise, this.facets.retryRejectionPromiseWatcher);

          return promise;
        },
      },
      watcher: {
        /**
         * @param {unknown} value
         * @param {object} ctx
         * @param {bigint} ctx.id
         * @param {number} ctx.index
         * @param {number} ctx.numResults
         * @param {boolean} ctx.isAllSettled
         */
        onFulfilled(value, ctx) {
          this.facets.helper.processResult(value, ctx, 'fulfilled');
        },
        /**
         * @param {unknown} reason
         * @param {object} ctx
         * @param {bigint} ctx.id
         * @param {number} ctx.index
         * @param {number} ctx.numResults
         * @param {boolean} ctx.isAllSettled
         */
        onRejected(reason, ctx) {
          this.facets.helper.processResult(reason, ctx, 'rejected');
        },
      },
      helper: {
        /**
         * @param {unknown[]} specimens
         * @param {boolean} isAllSettled
         */
        createVow(specimens, isAllSettled) {
          const { nextId: id, idToVowState } = this.state;
          /** @type {VowKit<any[]>} */
          const kit = makeVowKit();

          // Preserve the order of the results.
          for (let index = 0; index < specimens.length; index += 1) {
            watch(specimens[index], this.facets.watcher, {
              id,
              index,
              numResults: specimens.length,
              isAllSettled,
            });
          }

          if (specimens.length > 0) {
            // Save the state until rejection or all fulfilled.
            this.state.nextId += 1n;
            idToVowState.init(
              id,
              harden({
                resolver: kit.resolver,
                remaining: specimens.length,
                resultsMap: detached.mapStore('resultsMap'),
                isAllSettled,
              }),
            );
            const idToNonStorableResults = provideLazyMap(
              utilsToNonStorableResults,
              this.facets.utils,
              () => new Map(),
            );
            idToNonStorableResults.set(id, new Map());
          } else {
            // Base case: nothing to wait for.
            kit.resolver.resolve(harden([]));
          }
          return kit.vow;
        },
        /**
         * @param {unknown} result
         * @param {object} ctx
         * @param {bigint} ctx.id
         * @param {number} ctx.index
         * @param {number} ctx.numResults
         * @param {boolean} ctx.isAllSettled
         * @param {'fulfilled' | 'rejected'} status
         */
        processResult(result, { id, index, numResults, isAllSettled }, status) {
          const { idToVowState } = this.state;
          if (!idToVowState.has(id)) {
            // Resolution of the returned vow happened already.
            return;
          }
          const { remaining, resultsMap, resolver } = idToVowState.get(id);
          if (!isAllSettled && status === 'rejected') {
            // For 'all', we reject immediately on the first rejection
            idToVowState.delete(id);
            resolver.reject(result);
            return;
          }

          const possiblyWrappedResult = isAllSettled
            ? harden({
                status,
                [status === 'fulfilled' ? 'value' : 'reason']: result,
              })
            : result;

          const idToNonStorableResults = provideLazyMap(
            utilsToNonStorableResults,
            this.facets.utils,
            () => new Map(),
          );
          const nonStorableResults = provideLazyMap(
            idToNonStorableResults,
            id,
            () => new Map(),
          );

          // Capture the fulfilled value.
          if (zone.isStorable(possiblyWrappedResult)) {
            resultsMap.init(index, possiblyWrappedResult);
          } else {
            nonStorableResults.set(index, possiblyWrappedResult);
          }
          const vowState = harden({
            remaining: remaining - 1,
            resultsMap,
            resolver,
            isAllSettled,
          });
          if (vowState.remaining > 0) {
            idToVowState.set(id, vowState);
            return;
          }
          // We're done!  Extract the array.
          idToVowState.delete(id);
          const results = new Array(numResults);
          let numLost = 0;
          for (let i = 0; i < numResults; i += 1) {
            if (nonStorableResults.has(i)) {
              results[i] = nonStorableResults.get(i);
            } else if (resultsMap.has(i)) {
              results[i] = resultsMap.get(i);
            } else {
              numLost += 1;
              results[i] = isAllSettled
                ? { status: 'rejected', reason: 'Unstorable result was lost' }
                : undefined;
            }
          }
          if (numLost > 0 && !isAllSettled) {
            resolver.reject(
              assert.error(X`${numLost} unstorable results were lost`),
            );
          } else {
            resolver.resolve(harden(results));
          }
        },
      },
      retryRejectionPromiseWatcher: {
        onFulfilled(_result) {},
        onRejected(reason, failedOp) {
          if (isRetryableReason(reason, undefined)) {
            Fail`Pending ${bare(failedOp)} could not retry; ${reason}`;
          }
        },
      },
    },
  );

  const makeWatchUtil = () => {
    const { utils } = makeWatchUtilsKit();
    return harden(utils);
  };

  return makeWatchUtil;
};

harden(prepareWatchUtils);
