import { M } from '@endo/patterns';
import { Fail, makeError, q } from '@endo/errors';

import { appendToStoredArray } from '@agoric/store/src/stores/store-utils.js';
import {
  CctpTxEvidenceShape,
  EvmHashShape,
  PendingTxShape,
} from '../type-guards.js';
import { PendingTxStatus } from '../constants.js';

/**
 * @import {MapStore, SetStore} from '@agoric/store';
 * @import {Zone} from '@agoric/zone';
 * @import {CctpTxEvidence, NobleAddress, SeenTxKey, PendingTxKey, PendingTx, EvmHash} from '../types.js';
 */

/**
 * Create the key for the pendingTxs MapStore.
 *
 * The key is a composite of `txHash` and `chainId` and not meant to be
 * parsable.
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
 * The key is a composite of `NobleAddress` and transaction `amount` and not
 * meant to be parsable.
 *
 * @param {CctpTxEvidence} evidence
 * @returns {SeenTxKey}
 */
const seenTxKeyOf = evidence => {
  const { txHash, chainId } = evidence;
  return `seenTx:${JSON.stringify([txHash, chainId])}`;
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
      advancing: M.call(CctpTxEvidenceShape).returns(M.undefined()),
      advanceOutcome: M.call(M.string(), M.nat(), M.boolean()).returns(),
      observe: M.call(CctpTxEvidenceShape).returns(M.undefined()),
      hasPendingSettlement: M.call(M.string(), M.bigint()).returns(M.boolean()),
      dequeueStatus: M.call(M.string(), M.bigint()).returns({
        txHash: EvmHashShape,
        status: M.string(), // TODO: named shape?
      }),
      disbursed: M.call(EvmHashShape, M.string(), M.nat()).returns(
        M.undefined(),
      ),
      forwarded: M.call(M.opt(EvmHashShape), M.string(), M.nat()).returns(
        M.undefined(),
      ),
      lookupPending: M.call(M.string(), M.bigint()).returns(
        M.arrayOf(PendingTxShape),
      ),
    }),
    {
      /**
       * Add a new transaction with ADVANCED status
       * @param {CctpTxEvidence} evidence
       */
      advancing(evidence) {
        recordPendingTx(evidence, PendingTxStatus.Advancing);
      },

      /**
       * @param {NobleAddress} sender
       * @param {import('@agoric/ertp').NatValue} amount
       * @param {boolean} success
       */
      advanceOutcome(sender, amount, success) {
        const key = makePendingTxKey(sender, amount);
        const pending = pendingTxs.get(key);
        const ix = pending.findIndex(
          tx => tx.status === PendingTxStatus.Advancing,
        );
        ix >= 0 || Fail`no advancing tx with ${{ sender, amount }}`;
        const [pre, tx, post] = [
          pending.slice(0, ix),
          pending[ix],
          pending.slice(ix + 1),
        ];
        const status = success
          ? PendingTxStatus.Advanced
          : PendingTxStatus.AdvanceFailed;
        const txpost = { ...tx, status };
        pendingTxs.set(key, harden([...pre, txpost, ...post]));
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
        const pending = pendingTxs.get(key);
        return !!pending.length;
      },

      /**
       * Remove and return an `ADVANCED` or `OBSERVED` tx waiting to be `SETTLED`.
       *
       * @param {NobleAddress} address
       * @param {bigint} amount
       */
      dequeueStatus(address, amount) {
        const key = makePendingTxKey(address, amount);
        const pending = pendingTxs.get(key);

        if (!pending.length) {
          return undefined;
        }

        const [tx0, ...rest] = pending;
        pendingTxs.set(key, harden(rest));
        const { status, txHash } = tx0;
        // TODO: store txHash -> evidence for txs pending settlement?
        return harden({ status, txHash });
      },

      /**
       * Mark a transaction as `DISBURSED`
       *
       * @param {EvmHash} txHash
       * @param {NobleAddress} address
       * @param {bigint} amount
       */
      disbursed(txHash, address, amount) {
        // TODO: store txHash -> evidence for txs pending settlement?
        console.log('TODO: vstorage update', { txHash, address, amount });
      },

      /**
       * Mark a transaction as `FORWARDED`
       *
       * @param {EvmHash | undefined} txHash - undefined in case mint before observed
       * @param {NobleAddress} address
       * @param {bigint} amount
       */
      forwarded(txHash, address, amount) {
        // TODO: store txHash -> evidence for txs pending settlement?
        console.log('TODO: vstorage update', { txHash, address, amount });
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
