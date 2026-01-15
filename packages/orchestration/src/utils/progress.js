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
 * @typedef {object} PublicationInternals
 * @property {T} value
 * @property {EVow<PublicationInternals<T>>} tail
 */

/**
 * @template T
 * @template [A=unknown]
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
export const progressTrackerAsyncFlowUtils = {
  /**
   * Converts a specimen to a Promise. Since the use of Vows is only needed
   * outside of async-flows, we currently reject if we encounter one.
   *
   * @template T
   * @param {T} specimen
   * @returns {Promise<Fulfilled<T>>}
   */
  promiseFromVow: async specimen => {
    const maybeVow = await specimen;
    !isVow(maybeVow) ||
      assert.Fail`Unexpected Vow ${maybeVow}; only use progress utilities within async flows (withOrchestration)`;

    return /** @type {Fulfilled<T>} */ (maybeVow);
  },

  /**
   * Extracts reports from a tracker, calling `reducer` on each.
   *
   * @template [A=unknown]
   * @param {ProgressTracker} tracker
   * @param {PublicationReducer<ProgressReport, A>} reducer
   * @param {A} initialAccum accumulator to pass to the reducer on the first
   *   call. Providing the initial accumulator avoids having to deal with
   *   `undefined` values in the reducer or explicitly specify the desired
   *   type.
   * @returns {Promise<A>} the accumulated result
   */
  reduceProgressReports: async (tracker, reducer, initialAccum) => {
    const { promiseFromVow } = progressTrackerAsyncFlowUtils;

    /** @type {PublicationInternals<ProgressReport> | null} */
    let nextReport = await promiseFromVow(tracker.exposePublicationInternals());
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

harden(progressTrackerAsyncFlowUtils);

/**
 * A helper for ProgressPublication operations via VowTools.
 *
 * @param {Zone} zone
 * @param {object} powers
 * @param {Pick<VowTools, 'makeVowKit'>} powers.vowTools
 */
export const prepareProgressTracker = (zone, { vowTools: { makeVowKit } }) => {
  const makeProgressTrackerKit = zone.exoClassKit(
    'ProgressTrackerKit',
    undefined,
    () => {
      const { vow: nextReport, resolver: tailResolver } = makeVowKit();

      /** @type {PublicationInternals<ProgressReport>} */
      const currentPublication = harden({
        value: {},
        tail: nextReport,
      });
      return {
        currentPublication,
        done: false,
        tailResolver,
      };
    },
    {
      helper: {},
      public: {
        getCurrentProgressReport() {
          const { currentPublication } = this.state;
          return currentPublication.value;
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
        /**
         * CAVEAT: Intended for use only by `progress.js` utilities.
         *
         * @returns {PublicationInternals<ProgressReport>}
         * @internal
         */
        exposePublicationInternals() {
          return this.state.currentPublication;
        },
      },
    },
  );

  const makeProgressTracker = () => makeProgressTrackerKit().public;
  return harden(makeProgressTracker);
};
harden(prepareProgressTracker);

/**
 * @typedef {ReturnType<typeof prepareProgressTracker>} MakeProgressTracker
 */

/**
 * @typedef {ReturnType<MakeProgressTracker>} ProgressTracker
 */
