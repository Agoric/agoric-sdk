import { M } from '@endo/patterns';
import { Fail, makeError, q } from '@endo/errors';
import { appendToStoredArray } from '@agoric/store/src/stores/store-utils.js';
import { E } from '@endo/eventual-send';
import { makeTracer } from '@agoric/internal';
import {
  CctpTxEvidenceShape,
  EvmHashShape,
  PendingTxShape,
} from '../type-guards.js';
import { PendingTxStatus, TxStatus } from '../constants.js';

/**
 * @import {MapStore, SetStore} from '@agoric/store';
 * @import {Zone} from '@agoric/zone';
 * @import {CctpTxEvidence, NobleAddress, SeenTxKey, PendingTxKey, PendingTx, EvmHash, LogFn} from '../types.js';
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
 * @typedef {{
 *  log?: LogFn;
 * }} StatusManagerPowers
 */

/**
 * The `StatusManager` keeps track of Pending and Seen Transactions
 * via {@link PendingTxStatus} states, aiding in coordination between the `Advancer`
 * and `Settler`.
 *
 * XXX consider separate facets for `Advancing` and `Settling` capabilities.
 *
 * @param {Zone} zone
 * @param {() => Promise<StorageNode>} makeStatusNode
 * @param {StatusManagerPowers} caps
 */
export const prepareStatusManager = (
  zone,
  makeStatusNode,
  {
    log = makeTracer('Advancer', true),
  } = /** @type {StatusManagerPowers} */ ({}),
) => {
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
   * @param {CctpTxEvidence['txHash']} hash
   * @param {TxStatus} status
   */
  const recordStatus = (hash, status) => {
    const statusNodeP = makeStatusNode();
    const txnNodeP = E(statusNodeP).makeChildNode(hash);
    // Don't await, just writing to vstorage.
    void E(txnNodeP).setValue(status);
  };

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
    recordStatus(evidence.txHash, status);
  };

  return zone.exo(
    'Fast USDC Status Manager',
    M.interface('StatusManagerI', {
      // TODO: naming scheme for transition events
      advance: M.call(CctpTxEvidenceShape).returns(M.undefined()),
      advanceOutcome: M.call(M.string(), M.nat(), M.boolean()).returns(),
      observe: M.call(CctpTxEvidenceShape).returns(M.undefined()),
      hasBeenObserved: M.call(CctpTxEvidenceShape).returns(M.boolean()),
      dequeueStatus: M.call(M.string(), M.bigint()).returns(
        M.or(
          {
            txHash: EvmHashShape,
            status: M.or(
              PendingTxStatus.Advanced,
              PendingTxStatus.AdvanceFailed,
              PendingTxStatus.Observed,
            ),
          },
          M.undefined(),
        ),
      ),
      disbursed: M.call(EvmHashShape).returns(M.undefined()),
      forwarded: M.call(M.opt(EvmHashShape), M.string(), M.nat()).returns(
        M.undefined(),
      ),
      lookupPending: M.call(M.string(), M.bigint()).returns(
        M.arrayOf(PendingTxShape),
      ),
    }),
    {
      /**
       * Add a new transaction with ADVANCING status
       * @param {CctpTxEvidence} evidence
       */
      advance(evidence) {
        recordPendingTx(evidence, PendingTxStatus.Advancing);
      },

      /**
       * Record result of ADVANCING
       *
       * @param {NobleAddress} sender
       * @param {import('@agoric/ertp').NatValue} amount
       * @param {boolean} success - Advanced vs. AdvanceFailed
       * @throws {Error} if nothing to advance
       */
      advanceOutcome(sender, amount, success) {
        const key = makePendingTxKey(sender, amount);
        pendingTxs.has(key) || Fail`no advancing tx with ${{ sender, amount }}`;
        const pending = pendingTxs.get(key);
        const ix = pending.findIndex(
          tx => tx.status === PendingTxStatus.Advancing,
        );
        ix >= 0 || Fail`no advancing tx with ${{ sender, amount }}`;
        const [prefix, tx, suffix] = [
          pending.slice(0, ix),
          pending[ix],
          pending.slice(ix + 1),
        ];
        const status = success
          ? PendingTxStatus.Advanced
          : PendingTxStatus.AdvanceFailed;
        const txpost = { ...tx, status };
        pendingTxs.set(key, harden([...prefix, txpost, ...suffix]));
        recordStatus(tx.txHash, status);
      },

      /**
       * Add a new transaction with OBSERVED status
       * @param {CctpTxEvidence} evidence
       */
      observe(evidence) {
        recordPendingTx(evidence, PendingTxStatus.Observed);
      },

      /**
       * Note: ADVANCING state implies tx has been OBSERVED
       *
       * @param {CctpTxEvidence} evidence
       */
      hasBeenObserved(evidence) {
        const seenKey = seenTxKeyOf(evidence);
        return seenTxs.has(seenKey);
      },

      /**
       * Remove and return an `ADVANCED` or `OBSERVED` tx waiting to be `SETTLED`.
       *
       * @param {NobleAddress} address
       * @param {bigint} amount
       * @returns {Pick<PendingTx, 'status' | 'txHash'> | undefined} undefined if nothing
       *   with this address and amount has been marked pending.
       */
      dequeueStatus(address, amount) {
        const key = makePendingTxKey(address, amount);
        if (!pendingTxs.has(key)) return undefined;
        const pending = pendingTxs.get(key);

        const dequeueIdx = pending.findIndex(
          x => x.status !== PendingTxStatus.Advancing,
        );
        if (dequeueIdx < 0) return undefined;

        if (pending.length > 1) {
          const pendingCopy = [...pending];
          pendingCopy.splice(dequeueIdx, 1);
          pendingTxs.set(key, harden(pendingCopy));
        } else {
          pendingTxs.delete(key);
        }

        const { status, txHash } = pending[dequeueIdx];
        // TODO: store txHash -> evidence for txs pending settlement?
        // If necessary for vstorage writes in `forwarded` and `settled`
        return harden({ status, txHash });
      },

      /**
       * Mark a transaction as `DISBURSED`
       *
       * @param {EvmHash} txHash
       */
      disbursed(txHash) {
        recordStatus(txHash, TxStatus.Disbursed);
      },

      /**
       * Mark a transaction as `FORWARDED`
       *
       * @param {EvmHash | undefined} txHash - undefined in case mint before observed
       * @param {NobleAddress} address
       * @param {bigint} amount
       */
      forwarded(txHash, address, amount) {
        if (txHash) {
          recordStatus(txHash, TxStatus.Forwarded);
        } else {
          // TODO store (early) `Minted` transactions to check against incoming evidence
          log(
            `⚠️ Forwarded minted amount ${amount} from account ${address} before it was observed.`,
          );
        }
      },

      /**
       * Lookup all pending entries for a given address and amount
       *
       * XXX only used in tests. should we remove?
       *
       * @param {NobleAddress} address
       * @param {bigint} amount
       * @returns {PendingTx[]}
       */
      lookupPending(address, amount) {
        const key = makePendingTxKey(address, amount);
        if (!pendingTxs.has(key)) {
          return harden([]);
        }
        return pendingTxs.get(key);
      },
    },
  );
};
harden(prepareStatusManager);

/** @typedef {ReturnType<typeof prepareStatusManager>} StatusManager */
