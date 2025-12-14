import { Shape as NetworkShape } from '@agoric/network';
import { M } from '@endo/patterns';

/**
 * @import {EVow, Vow, VowTools} from '@agoric/vow';
 * @import {InterfaceGuard, MethodGuard} from '@endo/patterns';
 */

/**
 * The utilities that are named like `Something$` and take a `subshape`
 * parameter indicate that they return a Shape of `Something`, specialized for
 * `subshape`.
 */
const { Vow$ } = NetworkShape; // TODO #9611
const EVow$ = shape => M.or(Vow$(shape), M.promise(/* shape */));

/**
 * @param {Pick<VowTools, 'watch'>} powers
 */
export const makeVowExoHelpers = ({ watch }) => {
  const vowExoHelpers = {
    /**
     * These are functions that operate on vows, intended to be added to an
     * internal `helper` facet of an exoClassKit.
     */
    helper: {
      /**
       * Return a vow that fulfills with the property at `prop` of the
       * fulfilment of `inputV`. If `inputV` rejects, the returned vow rejects
       * with the same reason.
       *
       * @template {readonly Record<PropertyKey, any>} R
       * @template {PropertyKey} K
       * @param {EVow<R>} inputV
       * @param {K} prop
       * @returns {Vow<R[K]>}
       */
      pickVowProp(inputV, prop) {
        return watch(inputV, this.facets.pickDataWatcher, prop);
      },
      /**
       * Return a vow that fulfills with the element at `index` of the
       * fulfilment of `inputV`. If `inputV` rejects, the returned vow rejects
       * with the same reason.
       *
       * @template {readonly unknown[]} T
       * @template {number} I
       * @param {EVow<T>} inputV
       * @param {I} index
       * @returns {Vow<T[I]>}
       */
      pickVowIndex(inputV, index) {
        return watch(inputV, this.facets.pickDataWatcher, index);
      },
      /**
       * Return a vow that fulfills with `newValue` after `inputV` fulfills. If
       * `inputV` rejects, the returned vow rejects with the same reason.
       *
       * @template [T=undefined]
       * @param {Vow<unknown>} inputV
       * @param {T} [newValue]
       * @returns {Vow<T>}
       */
      overrideVow(inputV, newValue) {
        return watch(inputV, this.facets.overrideVowWatcher, newValue);
      },
      /**
       * Return a vow typed as `Vow<void>` that fulfills with `undefined` after
       * `inputV` fulfills. If `inputV` rejects, the returned vow rejects with
       * the same reason.
       *
       * @param {Vow<unknown>} inputV
       * @returns {Vow<void>}
       */
      voidVow(inputV) {
        return watch(inputV, this.facets.overrideVowWatcher);
      },
    },
    /** These are shapes of the function provided by `helper`. */
    helperShapes: {
      pickVowIndex: M.call(Vow$(M.array()), M.number()).returns(EVow$(M.any())),
      pickVowProp: M.call(
        Vow$(M.record()),
        M.or(M.string(), M.number()),
      ).returns(EVow$(M.any())),
      voidVow: M.call(EVow$(M.any())).returns(EVow$(M.undefined())),
      overrideVow: M.call(EVow$(M.any()))
        .optional(M.any())
        .returns(EVow$(M.any())),
    },
    /**
     * These are the watcher facets used by the functions provided by `helper`.
     */
    watchers: {
      pickDataWatcher: {
        /**
         * Return `value[key]`.
         *
         * @template {{}} V
         * @template {keyof V} K
         * @param {V} value
         * @param {K} key
         * @returns {V[K]}
         */
        onFulfilled(value, key) {
          return harden(value[key]);
        },
      },
      overrideVowWatcher: {
        /**
         * Always return `newValue`.
         *
         * @template V
         * @param {unknown} _value
         * @param {V} newValue
         * @returns {V}
         */
        onFulfilled(_value, newValue) {
          return newValue;
        },
      },
    },
    /**
     * These are the shapes of watcher facets used by the functions provided by
     * `helper`.
     */
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
    /**
     * Given a tuple of facet names and a tuple of method names, return a record
     * mapping each facet name to a facet tombstone whose methods always throw.
     *
     * This is useful for retiring watchers while preserving their facets so
     * that older exoClassKits can be upgraded without errors caused by missing
     * facet definitions.
     *
     * @template {readonly string[]} F
     * @template {readonly string[]} M
     * @param {F} facets
     * @param {M} methods
     * @returns {{ [S in F[number]]: { [T in M[number]]: () => never } }}
     */
    makeTombstonedFacets: (facets, methods) =>
      /** @type {{ [S in F[number]]: { [T in M[number]]: () => never } }} */ (
        Object.fromEntries(
          facets.map(facet => [
            facet,
            /** @type {{ [T in M[number]]: () => never }} */ (
              Object.fromEntries(
                methods.map(meth => [
                  meth,
                  () => {
                    throw Error(
                      `${facet} is retired.  Retry your request to switch to a supported code path.`,
                    );
                  },
                ]),
              )
            ),
          ]),
        )
      ),
    /**
     * Given a tuple of facet names and a tuple of method names, return a record
     * mapping each name to a lax interface guard for a facet tombstone.
     *
     * @template {readonly string[]} F
     * @template {readonly string[]} M
     * @param {F} facets
     * @param {M} methods
     * @returns {{
     *   [S in F[number]]: InterfaceGuard<{ [T in M[number]]: MethodGuard }>;
     * }}
     */
    makeTombstonedFacetShapes: (facets, methods) =>
      /**
       * @type {{
       *   [S in F[number]]: InterfaceGuard<{
       *     [T in M[number]]: MethodGuard;
       *   }>;
       * }}
       */
      (
        Object.fromEntries(
          facets.map(name => [
            name,
            M.interface(
              name,
              /** @type {{ [T in M[number]]: MethodGuard }} */ (
                Object.fromEntries(
                  methods.map(method => [
                    method,
                    M.call().rest(M.any()).returns(),
                  ]),
                )
              ),
            ),
          ]),
        )
      ),
    /**
     * Given a tuple of watcher names, return a record mapping each watcher name
     * to a watcher facet tombstone whose methods always throw.
     *
     * This is useful for retiring watchers while preserving their facets so
     * that older exoClassKits can be upgraded without errors caused by missing
     * facet definitions.
     *
     * @template {readonly string[]} W
     * @param {W} watchers
     */
    makeTombstonedWatchers: watchers =>
      vowExoHelpers.makeTombstonedFacets(
        watchers,
        /** @type {const} */ (['onFulfilled']),
      ),
    /**
     * Given a tuple of watcher names, return a record mapping each name to a
     * lax interface guard for a watcher facet tombstone.
     *
     * @template {readonly string[]} W
     * @param {W} watchers
     */
    makeTombstonedWatcherShapes: watchers =>
      vowExoHelpers.makeTombstonedFacetShapes(
        watchers,
        /** @type {const} */ (['onFulfilled']),
      ),
  };

  return vowExoHelpers;
};
