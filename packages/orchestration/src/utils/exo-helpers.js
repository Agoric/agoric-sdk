import { Shape as NetworkShape } from '@agoric/network';
import { M } from '@endo/patterns';

/**
 * @import {EVow, Vow, VowTools, Promissory, Fulfilled} from '@agoric/vow';
 * @import {HostInterface} from '@agoric/async-flow';
 */

/**
 * The utilities that are named like `Something$(subshape)` indicate that they
 * return a Shape of `Something`, with a `subshape` parameter.
 */
const { Vow$ } = NetworkShape; // TODO #9611
const EVow$ = shape => M.or(Vow$(shape), M.promise(/* shape */));

/**
 * @template T
 * @typedef {T extends HostInterface<infer U>
 *     ? HostFulfilled<U>
 *     : T extends Promissory<infer U>
 *       ? HostFulfilled<U>
 *       : T} HostFulfilled
 */

/**
 * @param {Pick<VowTools, 'watch'>} powers
 */
export const makeVowExoHelpers = ({ watch }) => ({
  helper: {
    /**
     * @template {readonly Record<PropertyKey, any>} R
     * @template {PropertyKey} K
     * @param {EVow<R>} vow
     * @param {K} prop
     * @returns {Vow<R[K]>}
     */
    pickVowProp(vow, prop) {
      return watch(vow, this.facets.pickDataWatcher, prop);
    },
    /**
     * @template {readonly unknown[]} T
     * @template {number} I
     * @param {EVow<T>} vow
     * @param {I} index
     * @returns {Vow<T[I]>}
     */
    pickVowIndex(vow, index) {
      return watch(vow, this.facets.pickDataWatcher, index);
    },
    /**
     * @param {Vow<unknown>} resultV
     * @returns {Vow<void>}
     */
    voidVow(resultV) {
      return watch(resultV, this.facets.overrideVowWatcher);
    },
    /**
     * @template [T=undefined]
     * @param {Vow<unknown>} resultV
     * @param {T} [newValue]
     * @returns {Vow<T>}
     */
    overrideVow(resultV, newValue) {
      return watch(resultV, this.facets.overrideVowWatcher, newValue);
    },
  },
  helperShapes: {
    pickVowIndex: M.call(Vow$(M.array()), M.number()).returns(EVow$(M.any())),
    pickVowProp: M.call(Vow$(M.record()), M.or(M.string(), M.number())).returns(
      EVow$(M.any()),
    ),
    voidVow: M.call(EVow$(M.any())).returns(EVow$(M.undefined())),
    overrideVow: M.call(EVow$(M.any()))
      .optional(M.any())
      .returns(EVow$(M.any())),
  },
  watcherShapes: {
    pickDataWatcher: M.interface('pickArrayDataWatcher', {
      onFulfilled: M.call(
        M.or(M.array(), M.record()),
        M.or(M.number(), M.string()),
      ).returns(M.any()),
    }),
    overrideVowWatcher: M.interface('overrideVowWatcher', {
      onFulfilled: M.call(M.any()).optional(M.any()).returns(M.any()),
    }),
  },
  watchers: {
    pickDataWatcher: {
      onFulfilled(record, key) {
        return harden(record[key]);
      },
    },
    overrideVowWatcher: {
      onFulfilled(_value, newValue) {
        return newValue;
      },
    },
  },
});
