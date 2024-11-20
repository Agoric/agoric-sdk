import { M } from '@endo/patterns';
import { makeError, q } from '@endo/errors';

import { appendToStoredArray } from '@agoric/store/src/stores/store-utils.js';
import { CctpTxEvidenceShape, PendingTxShape } from '../type-guards.js';
import { PendingTxStatus } from '../constants.js';

/**
 * @import {MapStore, SetStore} from '@agoric/store';
 * @import {Zone} from '@agoric/zone';
 * @import {CctpTxEvidence, NobleAddress, SeenTxKey, PendingTxKey, PendingTx} from '../types.js';
 */

/**
 * Create the key for the pendingTxs MapStore.
 *
 * The key is a composite of Noble address `addr` and transaction `amount` and
 * not meant to be parsable.
 *
 * @param {NobleAddress} addr
 * @param {bigint} amount
 * @returns {PendingTxKey}
 */
const makePendingTxKey = (addr, amount) =>
  `pendingTx:${JSON.stringify([addr, String(amount)])}`;

/**
 * Get the key for the pendingTxs MapStore.
 *
 * @param {CctpTxEvidence} evidence
 * @returns {PendingTxKey}
 */
const pendingTxKeyOf = evidence => {
  const { amount, forwardingAddress } = evidence.tx;
  return makePendingTxKey(forwardingAddress, amount);
};

/**
 * Get the key for the seenTxs SetStore.
 *
 * The key is based on `txHash` and not meant to be parsable.
 *
 * @param {CctpTxEvidence} evidence
 * @returns {SeenTxKey}
 */
const seenTxKeyOf = evidence => {
  const { txHash } = evidence;
  return `seenTx:${txHash}`;
};

/**
 * The `StatusManager` keeps track of Pending and Seen Transactions
 * via {@link PendingTxStatus} states, aiding in coordination between the `Advancer`
 * and `Settler`.
 *
 * XXX consider separate facets for `Advancing` and `Settling` capabilities.
 *
 * @param {Zone} zone
 */
export const prepareStatusManager = zone => {
  /** @type {MapStore<PendingTxKey, PendingTx[]>} */
  const pendingTxs = zone.mapStore('PendingTxs', {
    keyShape: M.string(),
    valueShape: M.arrayOf(PendingTxShape),
  });

  /** @type {SetStore<SeenTxKey>} */
  const seenTxs = zone.setStore('SeenTxs', {
    keyShape: M.string(),
  });

  /**
   * Ensures that `txHash+chainId` has not been processed
   * and adds entry to `seenTxs` set.
   *
   * Also records the CctpTxEvidence and status in `pendingTxs`.
   *
   * @param {CctpTxEvidence} evidence
   * @param {PendingTxStatus} status
   */
  const recordPendingTx = (evidence, status) => {
    const seenKey = seenTxKeyOf(evidence);
    if (seenTxs.has(seenKey)) {
      throw makeError(`Transaction already seen: ${q(seenKey)}`);
    }
    seenTxs.add(seenKey);

    appendToStoredArray(
      pendingTxs,
      pendingTxKeyOf(evidence),
      harden({ ...evidence, status }),
    );
  };

  return zone.exo(
    'Fast USDC Status Manager',
    M.interface('StatusManagerI', {
      advance: M.call(CctpTxEvidenceShape).returns(M.undefined()),
      observe: M.call(CctpTxEvidenceShape).returns(M.undefined()),
      hasPendingSettlement: M.call(M.string(), M.bigint()).returns(M.boolean()),
      settle: M.call(M.string(), M.bigint()).returns(M.undefined()),
      lookupPending: M.call(M.string(), M.bigint()).returns(
        M.arrayOf(PendingTxShape),
      ),
    }),
    {
      /**
       * Add a new transaction with ADVANCED status
       * @param {CctpTxEvidence} evidence
       */
      advance(evidence) {
        recordPendingTx(evidence, PendingTxStatus.Advanced);
      },

      /**
       * Add a new transaction with OBSERVED status
       * @param {CctpTxEvidence} evidence
       */
      observe(evidence) {
        recordPendingTx(evidence, PendingTxStatus.Observed);
      },

      /**
       * Find an `ADVANCED` or `OBSERVED` tx waiting to be `SETTLED`
       *
       * @param {NobleAddress} address
       * @param {bigint} amount
       * @returns {boolean}
       */
      hasPendingSettlement(address, amount) {
        const key = makePendingTxKey(address, amount);
        if (!pendingTxs.has(key)) return false;
        const pending = pendingTxs.get(key);
        return !!pending.length;
      },

      /**
       * Mark an `ADVANCED` or `OBSERVED` transaction as `SETTLED` and remove it
       *
       * @param {NobleAddress} address
       * @param {bigint} amount
       */
      settle(address, amount) {
        const key = makePendingTxKey(address, amount);
        const pending = pendingTxs.get(key);

        if (!pending.length) {
          throw makeError(`No unsettled entry for ${q(key)}`);
        }

        const pendingCopy = [...pending];
        pendingCopy.shift();
        // TODO, vstorage update for `TxStatus.Settled`
        pendingTxs.set(key, harden(pendingCopy));
      },

      /**
       * Lookup all pending entries for a given address and amount
       *
       * @param {NobleAddress} address
       * @param {bigint} amount
       * @returns {PendingTx[]}
       */
      lookupPending(address, amount) {
        const key = makePendingTxKey(address, amount);
        if (!pendingTxs.has(key)) {
          throw makeError(`Key ${q(key)} not yet observed`);
        }
        return pendingTxs.get(key);
      },
    },
  );
};
harden(prepareStatusManager);

/** @typedef {ReturnType<typeof prepareStatusManager>} StatusManager */
