/**
 * @file Utilities for working with ResultMeta<T>.
 */

import { isVow } from '@agoric/vow/src/vow-utils.js';

/**
 * @import {EVow, VowTools, VowKit, Fulfilled} from '@agoric/vow';
 * @import {Zone} from '@agoric/base-zone';
 */

/**
 * @typedef {{ [key: string]: any; nextMeta?: EVow<Metadata> }} Metadata
 */

/**
 * @template T
 * @typedef {object} ResultMeta
 * @property {EVow<T>} result final value of this operation
 * @property {Metadata} meta snapshot of metadata for this instance
 */

/**
 * @template T
 * @typedef {EVow<T | ResultMeta<T>>} MaybeResultMeta
 */

/**
 * @template T
 * @callback MetaReducer Called on each layer of the ResultMeta. This function
 *   should perform any side-effects it can when it receives a new single
 *   Metadata, since there is no guarantee that the final ResultMeta value chain
 *   will be prompt (it may take a long time with cross-chain communication) or
 *   ever fulfill (it may result in a rejection).
 * @param {Metadata | undefined | null} meta `meta == null` is a sentinel for
 *   the final reducer call.
 * @param {T} accum previous reduction value
 * @returns {EVow<T | null>} Returning `null` exits the reduction
 */

/**
 * @param {unknown} obj
 * @returns {obj is ResultMeta<any>}
 */
export const isResultMeta = obj =>
  obj != null && typeof obj === 'object' && 'result' in obj && 'meta' in obj;
harden(isResultMeta);

/**
 * Utilities for working with ResultMeta within an async flow.
 */
export const resultMetaAsyncFlowUtils = {
  /**
   * Converts a specimen to a Promise. Since the use of Vows is only needed
   * outside of async-flows, just reject if we encounter one.
   *
   * @template T
   * @param {EVow<T>} specimen
   * @returns {Promise<Fulfilled<T>>}
   */
  promiseFromVow: async specimen => {
    const maybeVow = await specimen;
    !isVow(maybeVow) ||
      assert.Fail`Unexpected Vow ${maybeVow}; only use ResultMeta utilities within async flows (withOrchestration)`;

    return /** @type {Fulfilled<T>} */ (maybeVow);
  },

  /**
   * @template {ResultMeta<unknown> | unknown} [T=unknown]
   * @param {T} specimen
   * @returns {T extends ResultMeta<infer U> ? ResultMeta<U> : ResultMeta<T>}
   */
  coerceResultMeta: specimen => {
    if (isResultMeta(specimen)) {
      // @ts-expect-error how to cast this correctly?
      return specimen;
    }
    const result = /** @type {EVow<T>} */ (specimen);
    /** @type {Metadata} */
    const meta = harden({});

    // @ts-expect-error how to cast this correctly?
    return harden({
      result,
      meta,
    });
  },

  /**
   * @template T Extracts `meta` from a chained ResultMeta, calling `reducer` on
   *   each.
   * @param {EVow<Metadata>} metaP
   * @param {MetaReducer<T>} reducer
   * @param {T} initialAccum accumulator to pass to the reducer on the first
   *   call
   * @returns {Promise<T>} the accumulated result
   */
  reduceMeta: async (metaP, reducer, initialAccum) => {
    const { promiseFromVow } = resultMetaAsyncFlowUtils;

    /** @type {Metadata | null} */
    let nextMeta = await promiseFromVow(metaP);
    let accum = harden(initialAccum);

    while (true) {
      const reduction = await promiseFromVow(reducer(nextMeta, accum));
      harden(reduction);

      if (reduction == null) {
        nextMeta = null;
      } else {
        accum = /** @type {T} */ (reduction);
      }
      if (nextMeta == null) {
        return accum;
      }

      nextMeta = (await promiseFromVow(nextMeta?.nextMeta)) ?? null;
    }
  },

  /**
   * Returns a promise for the ResultMeta<T> final result.
   *
   * @template T
   * @param {EVow<ResultMeta<T>>} resultP
   * @returns {Promise<T>}
   */
  getFinalResult: async resultP => {
    const { promiseFromVow } = resultMetaAsyncFlowUtils;
    const { result } = await promiseFromVow(resultP);
    return /** @type {Promise<T>} */ (promiseFromVow(result));
  },
};

harden(resultMetaAsyncFlowUtils);

/**
 * A helper for ResultMeta operations via VowTools.
 *
 * @param {Zone} zone
 * @param {object} powers
 * @param {Pick<VowTools, 'makeVowKit'>} powers.vowTools
 */
export const prepareMetaUpdater = (zone, { vowTools: { makeVowKit } }) => {
  const makeMetaUpdaterKit = zone.exoClassKit(
    'MetaUpdaterKit',
    undefined,
    /**
     * @param {Metadata} [initialMeta]
     */
    (initialMeta = {}) => {
      const { vow: nextMeta, resolver: nextMetaResolver } = makeVowKit();

      /** @type {Metadata} */
      const currentMeta = harden({
        ...initialMeta,
        nextMeta,
      });
      return {
        finished: false,
        currentMeta,
        nextMetaResolver,
      };
    },
    {
      helper: {},
      public: {
        get() {
          return this.state.currentMeta;
        },
        /**
         * @param {Metadata} thisMeta
         */
        update(thisMeta) {
          const { currentMeta, nextMetaResolver, finished } = this.state;
          if (finished) {
            return currentMeta;
          }

          const { vow: nextMeta, resolver: nextNextMetaResolver } =
            makeVowKit();

          const meta = harden({ ...thisMeta, nextMeta });
          this.state.currentMeta = meta;
          nextMetaResolver.resolve(meta);
          this.state.nextMetaResolver = nextNextMetaResolver;
          return meta;
        },
        finish() {
          const { currentMeta, nextMetaResolver, finished } = this.state;
          if (finished) {
            return currentMeta;
          }

          this.state.finished = true;
          nextMetaResolver.resolve(null);
          const { nextMeta: _, ...meta } = currentMeta;
          this.state.currentMeta = harden(meta);
          return harden(meta);
        },
      },
    },
  );

  /** @param {Metadata} [initialMeta] */
  const makeMetaUpdater = initialMeta => makeMetaUpdaterKit(initialMeta).public;
  return harden(makeMetaUpdater);
};
harden(prepareMetaUpdater);

/**
 * @typedef {ReturnType<typeof prepareMetaUpdater>} MakeMetaUpdater
 */

/**
 * @typedef {ReturnType<MakeMetaUpdater>} MetaUpdater
 */
