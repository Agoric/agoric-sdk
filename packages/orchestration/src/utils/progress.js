/**
 * @file Utilities for working with ResultMeta<T>.
 */

import { isVow } from '@agoric/vow/src/vow-utils.js';

/**
 * @import {EVow, VowTools, Fulfilled} from '@agoric/vow';
 * @import {Zone} from '@agoric/base-zone';
 */

/**
 * @typedef {Record<string, any>} ProgressReport
 */

/**
 * @template T
 * @typedef {object} ReporterPublication
 * @property {T} value
 * @property {EVow<ReporterPublication<T>>} tail
 */

/**
 * @template T,[A=unknown]
 * @callback PublicationReducer Called on the value of each linked T. This
 *   function should perform any side-effects it can when it receives a new
 *   value, since there is no guarantee that the ProgressRecord tail will be
 *   prompt (it may take a long time with cross-chain communication) or ever
 *   fulfill (it may result in a rejection).
 * @param {T | undefined | null} value `value == null` is a sentinel for the
 *   final reducer call.
 * @param {A} accum previous reduction value
 * @returns {EVow<A | null>} Returning `null` exits the reduction
 */

/**
 * Utilities for working with ResultMeta within an async flow.
 */
export const progressReporterAsyncFlowUtils = {
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
   * Extracts values from a chained ReporterPublication, calling `reducer` on
   * each.
   *
   * @template T,[A=unknown]
   * @param {EVow<ReporterPublication<T>>} progressP
   * @param {PublicationReducer<T, A>} reducer
   * @param {A} initialAccum accumulator to pass to the reducer on the first
   *   call
   * @returns {Promise<A>} the accumulated result
   */
  reduceProgressReports: async (progressP, reducer, initialAccum) => {
    const { promiseFromVow } = progressReporterAsyncFlowUtils;

    /** @type {ReporterPublication<T> | null} */
    let nextReport = await promiseFromVow(progressP);
    let accum = harden(initialAccum);

    while (true) {
      const reduction = await promiseFromVow(
        reducer(nextReport?.value ?? null, accum),
      );
      harden(reduction);

      if (reduction == null) {
        nextReport = null;
      } else {
        accum = /** @type {A} */ (reduction);
      }
      if (nextReport == null) {
        return accum;
      }

      nextReport = (await promiseFromVow(nextReport?.tail)) ?? null;
    }
  },
};

harden(progressReporterAsyncFlowUtils);

/**
 * A helper for ProgressPublication operations via VowTools.
 *
 * @param {Zone} zone
 * @param {object} powers
 * @param {Pick<VowTools, 'makeVowKit'>} powers.vowTools
 */
export const prepareProgressReporter = (zone, { vowTools: { makeVowKit } }) => {
  const makeProgressReporterKit = zone.exoClassKit(
    'ProgressReporterKit',
    undefined,
    /**
     * @param {ProgressReport} [initialReport]
     */
    (initialReport = {}) => {
      const { vow: nextReport, resolver: tailResolver } = makeVowKit();

      /** @type {ReporterPublication<ProgressReport>} */
      const currentPublication = harden({
        value: initialReport,
        tail: nextReport,
      });
      return {
        done: false,
        currentPublication,
        tailResolver,
      };
    },
    {
      helper: {},
      public: {
        get() {
          const { currentPublication } = this.state;
          return currentPublication.value;
        },
        subscribe() {
          return this.state.currentPublication;
        },
        /**
         * @param {ProgressReport} progressReport
         */
        update(progressReport) {
          const { currentPublication, tailResolver, done } = this.state;
          if (done) {
            return currentPublication.value;
          }

          const { vow: nextTail, resolver: nextTailResolver } = makeVowKit();

          const tail = harden({ value: progressReport, tail: nextTail });
          this.state.currentPublication = tail;
          tailResolver.resolve(tail);
          this.state.tailResolver = nextTailResolver;
          return progressReport;
        },
        finish() {
          const { currentPublication, tailResolver, done } = this.state;
          if (!done) {
            tailResolver.resolve(null);
            this.state.done = true;
          }

          return currentPublication.value;
        },
      },
    },
  );

  /** @param {ProgressReport} [initialReport] */
  const makeProgressReporter = initialReport =>
    makeProgressReporterKit(initialReport).public;
  return harden(makeProgressReporter);
};
harden(prepareProgressReporter);

/**
 * @typedef {ReturnType<typeof prepareProgressReporter>} MakeProgressReporter
 */

/**
 * @typedef {ReturnType<MakeProgressReporter>} ProgressReporter
 */
