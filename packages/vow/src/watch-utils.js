// @ts-check

import { M } from '@endo/patterns';
import { PromiseWatcherI } from '@agoric/base-zone';

const { Fail, bare, details: X } = assert;

/**
 * @import {MapStore} from '@agoric/store/src/types.js';
 * @import {Zone} from '@agoric/base-zone';
 * @import {Watch} from './watch.js';
 * @import {When} from './when.js';
 * @import {VowKit, AsPromiseFunction, IsRetryableReason, EVow} from './types.js';
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
        asPromise: M.call(M.raw()).rest(M.raw()).returns(M.promise()),
      }),
      watcher: M.interface('Watcher', {
        onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
        onRejected: M.call(M.any()).rest(M.any()).returns(M.any()),
      }),
      retryRejectionPromiseWatcher: PromiseWatcherI,
    },
    () => {
      /**
       * @typedef {object} VowState
       * @property {number} remaining
       * @property {MapStore<number, any>} resultsMap
       * @property {VowKit['resolver']} resolver
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
        /**
         * @param {EVow<unknown>[]} vows
         */
        all(vows) {
          const { nextId: id, idToVowState } = this.state;
          /** @type {VowKit<any[]>} */
          const kit = makeVowKit();

          // Preserve the order of the vow results.
          for (let index = 0; index < vows.length; index += 1) {
            watch(vows[index], this.facets.watcher, {
              id,
              index,
              numResults: vows.length,
            });
          }

          if (vows.length > 0) {
            // Save the state until rejection or all fulfilled.
            this.state.nextId += 1n;
            idToVowState.init(
              id,
              harden({
                resolver: kit.resolver,
                remaining: vows.length,
                resultsMap: detached.mapStore('resultsMap'),
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
        onFulfilled(value, { id, index, numResults }) {
          const { idToVowState } = this.state;
          if (!idToVowState.has(id)) {
            // Resolution of the returned vow happened already.
            return;
          }
          const { remaining, resultsMap, resolver } = idToVowState.get(id);
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
          if (zone.isStorable(value)) {
            resultsMap.init(index, value);
          } else {
            nonStorableResults.set(index, value);
          }
          const vowState = harden({
            remaining: remaining - 1,
            resultsMap,
            resolver,
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
            }
          }
          if (numLost > 0) {
            resolver.reject(
              assert.error(X`${numLost} unstorable results were lost`),
            );
          } else {
            resolver.resolve(harden(results));
          }
        },
        onRejected(value, { id, index: _index, numResults: _numResults }) {
          const { idToVowState } = this.state;
          if (!idToVowState.has(id)) {
            // First rejection wins.
            return;
          }
          const { resolver } = idToVowState.get(id);
          idToVowState.delete(id);
          resolver.reject(value);
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
