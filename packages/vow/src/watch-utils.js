// @ts-check

import { M } from '@endo/patterns';
import { PromiseWatcherI } from '@agoric/base-zone';

const { Fail, bare } = assert;

/**
 * @import {MapStore} from '@agoric/store/src/types.js'
 * @import { Zone } from '@agoric/base-zone'
 * @import { Watch } from './watch.js'
 * @import { When } from './when.js'
 * @import {VowKit, AsPromiseFunction} from './types.js'
 * @import {IsRetryableReason} from './types.js'
 */

const VowShape = M.tagged(
  'Vow',
  harden({
    vowV0: M.remotable('VowV0'),
  }),
);

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
         * @param {unknown[]} vows
         */
        all(vows) {
          const { nextId: id, idToVowState } = this.state;
          /** @type {VowKit<any[]>} */
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
            idToVowState.init(
              id,
              harden({
                resolver: kit.resolver,
                remaining: index,
                resultsMap: detached.mapStore('resultsMap'),
              }),
            );
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
        onFulfilled(value, { id, index }) {
          const { idToVowState } = this.state;
          if (!idToVowState.has(id)) {
            // Resolution of the returned vow happened already.
            return;
          }
          const { remaining, resultsMap, resolver } = idToVowState.get(id);
          // Capture the fulfilled value.
          resultsMap.init(index, value);
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
          const results = new Array(resultsMap.getSize());
          for (const [i, val] of resultsMap.entries()) {
            results[i] = val;
          }
          resolver.resolve(harden(results));
        },
        onRejected(value, { id, index: _index }) {
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
            Fail`Pending ${bare(failedOp)} could not retry; {reason}`;
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
