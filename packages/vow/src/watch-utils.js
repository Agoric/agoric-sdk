// @ts-check

import { M } from '@endo/patterns';

const VowShape = M.tagged(
  'Vow',
  harden({
    vowV0: M.remotable('VowV0'),
  }),
);

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {import('./watch.js').Watch} watch
 * @param {() => import('./types.js').VowKit<any>} makeVowKit
 */
export const prepareWatchUtils = (zone, watch, makeVowKit) => {
  const detached = zone.detached();
  const makeWatchUtilsKit = zone.exoClassKit(
    'WatchUtils',
    {
      utils: M.interface('Utils', {
        all: M.call(M.arrayOf(M.any())).returns(M.arrayOf(M.any())),
      }),
      watcher: M.interface('Watcher', {
        onFulfilled: M.call(M.any()).rest(M.any()).returns(M.any()),
        onRejected: M.call(M.any()).rest(M.any()).returns(M.any()),
      }),
    },
    () => {
    () => {
      /**
        * @typedef {object} VowState
        * @property {number} remaining
        * @property {MapStore<number, any>} resultMap
        * @property {import('./types.js').VowKit['resolver']} resolver
        */
        /** @type {MapStore<bigint, VowState>} */
        const idToVowState = detached.mapStore('idToVowState');
        return {
          nextId: 0n,
          idToVowState,
        };
      }  
    },
    {
      utils: {
        /**
         * @template [T=any]
         * @param {import('./types.js').Specimen<T>[]} vows
         */
        all(vows) {
          const { nextId: id, idToVowState } = this.state;
          const kit = makeVowKit();

          // Preserve the order of the vow results.
          let index = 0;
          for (const vow of vows) {
            watch(vow, this.facets.watcher, { id, index });
            index += 1;
          }
          
          if (index > 0) {
            // Save the state until rejection or all fulfilled.
            this.state.nextId += 1n;
            idToVowState.init(id, harden({
              resolver: kit.resolver,
              remaining: index,
              resultsMap: detached.mapStore('resultsMap');
            });
         } else {
            // Base case: nothing to wait for.
            kit.resolver.resolve(harden([]));
         }
         return kit.vow;
        },
      },
      watcher: {
        onFulfilled(value, { id, index }) {
          const { idToVowState } = this.state;
          if (!idToVowState.has(id)) {
            // Resolution of the returned vow happened already.
            return;
          }
          const { remaining, resultMap, resolver } = idToState.get(id);
          // Capture the fulfilled value.
          resultMap.init(index, value);
          const vowState = harden({
            remaining: remaining - 1,
            resultMap,
            resolver,
          });
          if (vowState.remaining > 0) {
            idToVowState.set(id, vowState);
            return;
          }
          // We're done!  Extract the array.
          idToVowState.delete(id);
          const results = new Array(resultMap.getSize());
          for (const [i, val] of resultMap.entries()) {
            results[i] = val;
          }
          resolver.resolve(harden(results));
        },
        onRejected(value, { id }) {
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
