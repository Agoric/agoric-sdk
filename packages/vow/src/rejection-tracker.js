// @ts-check
import { X } from '@endo/errors';
import { makePromiseKit } from '@endo/promise-kit';
import { M } from '@endo/patterns';

import { sink } from './vow-utils.js';

/**
 * @import {PassableCap} from '@endo/pass-style';
 * @import {PromiseKit} from '@endo/promise-kit';
 * @import {Zone} from '@agoric/base-zone';
 */

/**
 * @param {Promise<void>} [rejected]
 * @param {PromiseKit<void>} [upgradedPK]
 */
const makeUnhandledRejectionCanceller = (rejected, upgradedPK) => {
  return () => {
    // Handle the rejected promise to silence it.
    rejected?.catch(sink);
    // Resolve the upgraded promise to prevent it from being rejected by a
    // future upgrade.
    upgradedPK?.resolve();
  };
};

/** @param {Zone} zone */
export const prepareVowRejectionTracker = zone => {
  /** @type {WeakMap<PassableCap, () => void>} */
  const vowToCancelUnhandledRejection = new WeakMap();

  const upgradeRejectionWatcher = zone.exo(
    'UpgradeRejectionWatcher',
    M.interface('UpgradeRejectionWatcher', {
      onRejected: M.call(M.raw(), M.raw()).returns(),
    }),
    {
      onRejected(upgradeReason, baseReason) {
        const reason = assert.error(
          X`VOW_REJECTION ${baseReason} not handled before upgrade ${upgradeReason}`,
        );
        // console.warn(reason);
        throw reason;
      },
    },
  );

  const vowRejectionTracker = zone.exo(
    'VowRejectionTracker',
    M.interface('VowRejectionTracker', {
      handle: M.call(M.remotable()).returns(),
      reject: M.call(M.remotable(), M.raw()).returns(),
    }),
    {
      /**
       * @param {PassableCap} vowCap
       */
      handle(vowCap) {
        const cancel = vowToCancelUnhandledRejection.get(vowCap);
        if (!cancel) {
          console.warn(
            assert.error(
              X`Now handling a VOW_REJECTION from a prior incarnation for ${vowCap}`,
            ),
          );
          return;
        }
        vowToCancelUnhandledRejection.delete(vowCap);
        cancel();
      },
      /**
       * @param {PassableCap} vowCap
       * @param {any} reason
       */
      reject(vowCap, reason) {
        if (vowToCancelUnhandledRejection.has(vowCap)) {
          return;
        }

        harden(reason);
        const baseReason = zone.isStorable(reason)
          ? reason
          : assert.error(X`Vow rejection reason was not stored: ${reason}`);

        // Register a never-resolved native promise with liveslots, so it
        // can reject on upgrade.
        const upgradedPK = makePromiseKit();
        zone.watchPromise(
          upgradedPK.promise,
          upgradeRejectionWatcher,
          baseReason,
        );

        // Save the cancel function.
        const rejected = Promise.reject(reason);
        const cancel = makeUnhandledRejectionCanceller(rejected, upgradedPK);
        vowToCancelUnhandledRejection.set(vowCap, cancel);
      },
    },
  );

  return vowRejectionTracker;
};

/** @typedef {ReturnType<typeof prepareVowRejectionTracker>} VowRejectionTracker */
