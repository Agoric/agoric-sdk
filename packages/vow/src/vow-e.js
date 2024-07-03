// @ts-check
/* global globalThis */
import { PromiseWatcherI } from '@agoric/base-zone';
import makeE from './E.js';

/**
 * @import {PromiseWatcher} from '@agoric/base-zone'
 */

const { Fail, bare } = assert;

/**
 * @param {import('@agoric/base-zone').Zone} zone
 * @param {object} powers
 * @param {import('./when.js').When} powers.when
 * @param {import('./watch.js').Watch} powers.watch
 * @param {import('./types.js').IsRetryableReason} powers.isRetryableReason
 */
export const makeVowE = (zone, { when, watch, isRetryableReason }) => {
  /** @type {import('@agoric/base-zone').PromiseWatcher} */
  const retryRejectionPromiseWatcher = zone.exo(
    'rejectRetriesPromiseWatcher',
    PromiseWatcherI,
    {
      onFulfilled(_result) {},
      onRejected(reason, failedOp) {
        if (isRetryableReason(reason)) {
          Fail`Pending ${bare(failedOp)} could not retry; ${reason}`;
        }
      },
    },
  );

  /**
   * @param {unknown} specimenP
   * @param {string} opDescription
   * @param {import('./E.js').EOptions} [opts]
   * @returns {Promise<any>}
   */
  const unwrap = (specimenP, opDescription, opts = {}) => {
    const { watch: optWatch = false } = opts;

    // Watch the specimen in case it is an ephemeral promise.
    /** @type {Promise<any>} */
    let promise;

    if (optWatch) {
      /** @type {import('./types.js').Vow<any>} */
      let vow;
      if (Array.isArray(optWatch)) {
        // Arguments for the watch.
        vow = watch(specimenP, ...optWatch);
      } else if (
        Object(optWatch) === optWatch &&
        typeof optWatch === 'object'
      ) {
        // Just a watcher.
        vow = watch(specimenP, optWatch);
      } else {
        vow = watch(specimenP);
      }

      // Make a prompt ephemeral promise for a (potentially durable) vow.
      promise = HandledPromise.resolve(vow);
    } else {
      // Resolve to an non-prompt ephemeral promise.
      promise = when(specimenP);
    }

    // Watch the ephemeral result promise to ensure that if its settlement is
    // lost due to upgrade of this incarnation, we will at least cause an
    // unhandled rejection in the new incarnation.
    zone.watchPromise(
      harden(promise),
      retryRejectionPromiseWatcher,
      opDescription,
    );

    return promise;
  };

  /**
   * A convenient vow-shortening E, which returns platform result promises.  It
   * can cause problems when used in a durable context, because the resulting
   * promises are ephemeral and likely not promptly resolved.
   *
   * Instead of this `vowE`, when manipulating durable vows, use
   * `vowTools.watch` prepared in a durable zone with the standard,
   * non-unwrapping `import('@endo/far').E`.  This avoids the creation of
   * promise/vow chains containing non-prompt ephemeral promises.
   */
  const vowE = makeE(globalThis.HandledPromise, {
    unwrap,
    additional: {
      when,
      watch,
    },
  });

  return vowE;
};
