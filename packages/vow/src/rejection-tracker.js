// @ts-check
import { Fail, X } from '@endo/errors';
import { makePromiseKit } from '@endo/promise-kit';
import { M } from '@endo/patterns';

const sink = () => {};
harden(sink);

/**
 * @import {PromiseKit} from '@endo/promise-kit';
 * @import {Zone} from '@agoric/base-zone';
 * @import {VowV0} from './types.js';
 */

/**
 * @param {Promise<void>} [rejected]
 * @param {PromiseKit<void>} [upgradedPK]
 */
const makeUnhandledRejection = (rejected, upgradedPK) => {
  return () => {
    // Handle the rejected promise to silence it.
    rejected?.catch(sink);
    // Resolve the upgraded promise to prevent it from being rejected by a
    // future upgrade.
    upgradedPK?.resolve();
  };
};

const VowCapShape = M.remotable('VowCap');
const VowRejectionTrackerKitI = {
  public: M.interface('VowRejectionTracker', {
    handle: M.call(VowCapShape).returns(),
    reject: M.call(VowCapShape, M.raw(), M.promise()).returns(),
  }),
  upgradeRejectionWatcher: M.interface('UpgradeRejectionWatcher', {
    onRejected: M.call(M.raw(), M.raw()).returns(),
  }),
};

/** @param {Zone} zone */
export const prepareVowRejectionTracker = zone => {
  /** @type {WeakMap<VowV0, () => void>} */
  const vowToCancelUnhandledRejection = new WeakMap();

  const makeVowRejectionTrackerKit = zone.exoClassKit(
    'VowRejectionTrackerKit',
    VowRejectionTrackerKitI,
    () => ({}),
    {
      public: {
        handle(vowV0) {
          const cancel = vowToCancelUnhandledRejection.get(vowV0);
          if (!cancel) {
            throw Fail`vow ${vowV0} already handled`;
          }
          cancel();
        },
        /**
         *
         * @param {VowV0} vowV0
         * @param {any} reason
         * @param {Promise<void>} rejected
         */
        reject(vowV0, reason, rejected = Promise.reject(reason)) {
          const { upgradeRejectionWatcher } = this.facets;
          !vowToCancelUnhandledRejection.has(vowV0) ||
            Fail`vow ${vowV0} already rejected`;

          // Register a never-resolved native promise with liveslots, so it
          // can reject on upgrade.
          const upgradedPK = makePromiseKit();
          zone.watchPromise(
            upgradedPK.promise,
            upgradeRejectionWatcher,
            reason,
          );

          // Save the cancel function.
          const cancel = makeUnhandledRejection(rejected, upgradedPK);
          vowToCancelUnhandledRejection.set(vowV0, cancel);
        },
      },
      upgradeRejectionWatcher: {
        onRejected(upgradeReason, baseReason) {
          if (baseReason instanceof Error) {
            assert.note(baseReason, X`upgraded: ${upgradeReason}`);
          }
          throw baseReason;
        },
      },
    },
  );

  const makeVowRejectionTracker = () => makeVowRejectionTrackerKit().public;
  return makeVowRejectionTracker;
};

/** @typedef {ReturnType<ReturnType<typeof prepareVowRejectionTracker>>} VowRejectionTracker */
