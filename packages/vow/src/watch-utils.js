// @ts-check

import { M } from '@endo/patterns';

/**
 * @import {MapStore} from '@agoric/store/src/types.js'
 * @import { Zone } from '@agoric/base-zone'
 * @import { Watch } from './watch.js'
 * @import {VowKit} from './types.js'
 */

const VowShape = M.tagged(
  'Vow',
  harden({
    vowV0: M.remotable('VowV0'),
  }),
);

/**
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
 * @param {Watch} watch
 * @param {() => VowKit<any>} makeVowKit
 */
export const prepareWatchUtils = (zone, watch, makeVowKit) => {
  const detached = zone.detached();
  const utilsToEphemeralResults = new WeakMap();

  const makeWatchUtilsKit = zone.exoClassKit(
    'WatchUtils',
    {
      utils: M.interface('Utils', {
        all: M.call(M.arrayOf(M.any())).returns(VowShape),
      }),
      watcher: M.interface('Watcher', {
        onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
        onRejected: M.call(M.any()).rest(M.any()).returns(M.any()),
      }),
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
         * @param {unknown[]} vows
         */
        all(vows) {
          const { nextId: id, idToVowState } = this.state;
          /** @type {VowKit<any[]>} */
          const kit = makeVowKit();

          // Preserve the order of the vow results.
          let index = 0;
          for (const vow of vows) {
            watch(vow, this.facets.watcher, {
              id,
              index,
              numResults: vows.length,
            });
            index += 1;
          }

          if (index > 0) {
            // Save the state until rejection or all fulfilled.
            this.state.nextId += 1n;
            idToVowState.init(
              id,
              harden({
                resolver: kit.resolver,
                remaining: index,
                resultsMap: detached.mapStore('resultsMap'),
              }),
            );
            const resultsMap = provideLazyMap(
              utilsToEphemeralResults,
              this.facets.utils,
              () => new Map(),
            );
            resultsMap.set(id, new Map());
          } else {
            // Base case: nothing to wait for.
            kit.resolver.resolve(harden([]));
          }
          return kit.vow;
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
          const idToEphemeralResults = provideLazyMap(
            utilsToEphemeralResults,
            this.facets.utils,
            () => new Map(),
          );
          const ephemeralResults = provideLazyMap(
            idToEphemeralResults,
            id,
            () => new Map(),
          );

          // Capture the fulfilled value.
          if (zone.isStorable(value)) {
            resultsMap.init(index, value);
          } else {
            ephemeralResults.set(index, value);
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
            if (ephemeralResults.has(i)) {
              results[i] = ephemeralResults.get(i);
            } else if (resultsMap.has(i)) {
              results[i] = resultsMap.get(i);
            } else {
              numLost += 1;
            }
          }
          if (numLost > 0) {
            resolver.reject(
              assert.error(`${numLost} unstorable results were lost.`),
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
    },
  );

  const makeWatchUtil = () => {
    const { utils } = makeWatchUtilsKit();
    return harden(utils);
  };

  return makeWatchUtil;
};

harden(prepareWatchUtils);
