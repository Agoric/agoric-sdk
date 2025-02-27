import type { NatValue } from '@agoric/ertp';
import {
  PendingTxStatus,
  TerminalTxStatus,
  TxStatus,
} from '@agoric/fast-usdc/src/constants.js';
import {
  CctpTxEvidenceShape,
  EvmHashShape,
  PendingTxShape,
} from '@agoric/fast-usdc/src/type-guards.js';
import type {
  CctpTxEvidence,
  EvmHash,
  LogFn,
  NobleAddress,
  PendingTx,
  TransactionRecord,
} from '@agoric/fast-usdc/src/types.js';
import type { RepayAmountKWR } from '@agoric/fast-usdc/src/utils/fees.js';
import { makeTracer } from '@agoric/internal';
import type {
  Marshaller,
  StorageNode,
} from '@agoric/internal/src/lib-chainStorage.js';
import type { MapStore, SetStore } from '@agoric/store';
import { appendToStoredArray } from '@agoric/store/src/stores/store-utils.js';
import { AmountKeywordRecordShape } from '@agoric/zoe/src/typeGuards.js';
import type { Zone } from '@agoric/zone';
import { Fail, makeError, q } from '@endo/errors';
import { E, type ERef } from '@endo/far';
import { M } from '@endo/patterns';

/** The string template is for developer visibility but not meant to ever be parsed. */
type PendingTxKey = `pendingTx:${bigint}:${NobleAddress}`;

interface StatusManagerPowers {
  log?: LogFn;
  marshaller: ERef<Marshaller>;
}

/**
 * Create the key for the pendingTxs MapStore.
 *
 * The key is a composite but not meant to be parsable.
 * @param nfa
 * @param amount
 */
const makePendingTxKey = (nfa: NobleAddress, amount: bigint): PendingTxKey =>
  // amount can't contain colon
  `pendingTx:${amount}:${nfa}`;

/**
 * Get the key for the pendingTxs MapStore.
 * @param evidence
 */
const pendingTxKeyOf = (evidence: CctpTxEvidence): PendingTxKey => {
  const { amount, forwardingAddress } = evidence.tx;
  return makePendingTxKey(forwardingAddress, amount);
};

export const stateShape = harden({
  pendingSettleTxs: M.remotable(),
  seenTxs: M.remotable(),
  storedCompletedTxs: M.remotable(),
});

/**
 * The `StatusManager` keeps track of Pending and Seen Transactions
 * via {@link PendingTxStatus} states, aiding in coordination between the `Advancer`
 * and `Settler`.
 *
 * XXX consider separate facets for `Advancing` and `Settling` capabilities.
 * @param zone
 * @param txnsNode
 * @param root0
 * @param root0.marshaller
 * @param root0.log
 */
export const prepareStatusManager = (
  zone: Zone,
  txnsNode: ERef<StorageNode>,
  { marshaller, log = makeTracer('StatusManager', true) }: StatusManagerPowers,
) => {
  /**
   * Keyed by a tuple of the Noble Forwarding Account and amount.
   */
  const pendingSettleTxs: MapStore<PendingTxKey, PendingTx[]> = zone.mapStore(
    'PendingSettleTxs',
    {
      keyShape: M.string(),
      valueShape: M.arrayOf(PendingTxShape),
    },
  );

  /**
   * Transactions seen *ever* by the contract.
   *
   * Note that like all durable stores, this MapStore is kept in IAVL. It stores
   * the `blockTimestamp` so that later we can prune old transactions.
   *
   * Note that `blockTimestamp` can drift between chains. Fortunately all CCTP
   * chains use the same Unix epoch and won't drift more than minutes apart,
   * which is more than enough precision for pruning old transaction.
   */
  const seenTxs: MapStore<EvmHash, NatValue> = zone.mapStore('SeenTxs', {
    keyShape: M.string(),
    valueShape: M.nat(),
  });

  /**
   * Transactions that have completed, but are still in vstorage.
   */
  const storedCompletedTxs: SetStore<EvmHash> = zone.setStore(
    'StoredCompletedTxs',
    {
      keyShape: M.string(),
    },
  );

  const publishTxnRecord = (txId: EvmHash, record: TransactionRecord): void => {
    const txNode = E(txnsNode).makeChildNode(txId, {
      sequence: true, // avoid overwriting other output in the block
    });

    // XXX awkward for publish* to update a store, but it's temporary
    if (record.status && TerminalTxStatus[record.status]) {
      // UNTIL https://github.com/Agoric/agoric-sdk/issues/7405
      // Queue it for deletion later because if we deleted it now the earlier
      // writes in this block would be wiped. For now we keep track of what to
      // delete when we know it'll be another block.
      storedCompletedTxs.add(txId);
    }

    // Don't await, just writing to vstorage.
    void E.when(E(marshaller).toCapData(record), capData =>
      E(txNode).setValue(JSON.stringify(capData)),
    );
  };

  const publishEvidence = (hash: EvmHash, evidence: CctpTxEvidence): void => {
    // Don't await, just writing to vstorage.
    publishTxnRecord(hash, harden({ evidence, status: TxStatus.Observed }));
  };

  /**
   * Ensures that `txHash+chainId` has not been processed
   * and adds entry to `seenTxs` set.
   *
   * Also records the CctpTxEvidence and status in `pendingTxs`.
   * @param evidence
   * @param status
   * @param risksIdentified
   */
  const initPendingTx = (
    evidence: CctpTxEvidence,
    status: PendingTxStatus,
    risksIdentified?: string[],
  ): void => {
    const { txHash } = evidence;
    if (seenTxs.has(txHash)) {
      throw makeError(`Transaction already seen: ${q(txHash)}`);
    }
    seenTxs.init(txHash, evidence.blockTimestamp);

    appendToStoredArray(
      pendingSettleTxs,
      pendingTxKeyOf(evidence),
      harden({ ...evidence, status }),
    );
    publishEvidence(txHash, evidence);
    if (status === PendingTxStatus.AdvanceSkipped) {
      publishTxnRecord(txHash, harden({ status, risksIdentified }));
    } else if (status !== PendingTxStatus.Observed) {
      // publishEvidence publishes Observed
      publishTxnRecord(txHash, harden({ status }));
    }
  };

  /**
   * Update the pending transaction status.
   * @param root0
   * @param root0.nfa
   * @param root0.amount
   * @param status
   */
  function setPendingTxStatus(
    { nfa, amount }: { nfa: NobleAddress; amount: bigint },
    status: PendingTxStatus,
  ): void {
    const key = makePendingTxKey(nfa, amount);
    pendingSettleTxs.has(key) || Fail`no advancing tx with ${{ nfa, amount }}`;
    const pending = pendingSettleTxs.get(key);
    const ix = pending.findIndex(tx => tx.status === PendingTxStatus.Advancing);
    ix >= 0 || Fail`no advancing tx with ${{ nfa, amount }}`;
    const [prefix, tx, suffix] = [
      pending.slice(0, ix),
      pending[ix],
      pending.slice(ix + 1),
    ];
    const txpost = { ...tx, status };
    pendingSettleTxs.set(key, harden([...prefix, txpost, ...suffix]));
    publishTxnRecord(tx.txHash, harden({ status }));
  }

  return zone.exo(
    'Fast USDC Status Manager',
    M.interface('StatusManagerI', {
      // TODO: naming scheme for transition events
      advance: M.call(CctpTxEvidenceShape).returns(),
      advanceOutcome: M.call(M.string(), M.nat(), M.boolean()).returns(),
      skipAdvance: M.call(CctpTxEvidenceShape, M.arrayOf(M.string())).returns(),
      advanceOutcomeForMintedEarly: M.call(EvmHashShape, M.boolean()).returns(),
      advanceOutcomeForUnknownMint: M.call(CctpTxEvidenceShape).returns(),
      observe: M.call(CctpTxEvidenceShape).returns(),
      hasBeenObserved: M.call(CctpTxEvidenceShape).returns(M.boolean()),
      deleteCompletedTxs: M.call().returns(M.undefined()),
      dequeueStatus: M.call(M.string(), M.bigint()).returns(
        M.or(
          {
            txHash: EvmHashShape,
            status: M.or(...Object.values(PendingTxStatus)),
          },
          M.undefined(),
        ),
      ),
      disbursed: M.call(EvmHashShape, AmountKeywordRecordShape).returns(
        M.undefined(),
      ),
      forwarded: M.call(EvmHashShape, M.boolean()).returns(),
      lookupPending: M.call(M.string(), M.bigint()).returns(
        M.arrayOf(PendingTxShape),
      ),
    }),
    {
      /**
       * Add a new transaction with ADVANCING status
       *
       * NB: this acts like observe() but subsequently records an ADVANCING
       * state
       * @param evidence
       */
      advance(evidence: CctpTxEvidence): void {
        initPendingTx(evidence, PendingTxStatus.Advancing);
      },

      /**
       * Add a new transaction with ADVANCE_SKIPPED status
       *
       * NB: this acts like observe() but subsequently records an
       * ADVANCE_SKIPPED state along with risks identified
       * @param evidence
       * @param risksIdentified
       */
      skipAdvance(evidence: CctpTxEvidence, risksIdentified: string[]): void {
        initPendingTx(
          evidence,
          PendingTxStatus.AdvanceSkipped,
          risksIdentified,
        );
      },

      /**
       * Record result of an ADVANCING transaction
       *
       * @param nfa
       * @param amount
       * @param success
       * @throws {Error} if nothing to advance
       */
      advanceOutcome(
        nfa: NobleAddress,
        amount: bigint,
        success: boolean,
      ): void {
        setPendingTxStatus(
          { nfa, amount },
          success ? PendingTxStatus.Advanced : PendingTxStatus.AdvanceFailed,
        );
      },

      /**
       * If minted while advancing, publish a status update for the advance
       * to vstorage.
       *
       * Does not add or amend `pendingSettleTxs` as this has
       * already settled.
       * @param txHash
       * @param success
       */
      advanceOutcomeForMintedEarly(txHash: EvmHash, success: boolean): void {
        publishTxnRecord(
          txHash,
          harden({
            status: success
              ? PendingTxStatus.Advanced
              : PendingTxStatus.AdvanceFailed,
          }),
        );
      },

      /**
       * If minted before observed and the evidence is eventually
       * reported, publish the evidence without adding to `pendingSettleTxs`
       * @param evidence
       */
      advanceOutcomeForUnknownMint(evidence: CctpTxEvidence): void {
        const { txHash } = evidence;
        // unexpected path, since `hasBeenObserved` will be called before this
        if (seenTxs.has(txHash)) {
          throw makeError(`Transaction already seen: ${q(txHash)}`);
        }
        seenTxs.init(txHash, evidence.blockTimestamp);
        publishEvidence(txHash, evidence);
      },

      /**
       * Add a new transaction with OBSERVED status.
       *
       * This message isn't currently being sent.
       *
       * @param {CctpTxEvidence} evidence
       */
      observe(evidence: CctpTxEvidence): void {
        initPendingTx(evidence, PendingTxStatus.Observed);
      },

      /**
       * Note: ADVANCING state implies tx has been OBSERVED
       * @param evidence
       */
      hasBeenObserved(evidence: CctpTxEvidence): boolean {
        return seenTxs.has(evidence.txHash);
      },

      // UNTIL https://github.com/Agoric/agoric-sdk/issues/7405
      deleteCompletedTxs(): void {
        for (const txHash of storedCompletedTxs.values()) {
          // As of now, setValue('') on a non-sequence node will delete it
          const txNode = E(txnsNode).makeChildNode(txHash, {
            sequence: false,
          });
          void E(txNode)
            .setValue('')
            .then(() => storedCompletedTxs.delete(txHash));
        }
      },

      /**
       * Remove and return the oldest pending settlement transaction that matches the given
       * forwarding account and amount. Since multiple pending transactions may exist with
       * identical (account, amount) pairs, we process them in FIFO order.
       *
       * @param {bigint} nfa
       * @param {NobleAddress} amount
       * @returns {undefined} if no pending transactions exist for this address and amount combination.
       */
      dequeueStatus(
        nfa: NobleAddress,
        amount: bigint,
      ): { txHash: EvmHash; status: PendingTxStatus } | undefined {
        const key = makePendingTxKey(nfa, amount);
        if (!pendingSettleTxs.has(key)) return undefined;
        const pending = pendingSettleTxs.get(key);

        if (pending.length === 0) {
          return undefined;
        }
        // extract first item
        const [{ status, txHash }, ...remaining] = pending;

        if (remaining.length) {
          pendingSettleTxs.set(key, harden(remaining));
        } else {
          pendingSettleTxs.delete(key);
        }

        return harden({ status, txHash });
      },

      /**
       * Mark a transaction as `DISBURSED`
       * @param txHash
       * @param split
       */
      disbursed(txHash: EvmHash, split: RepayAmountKWR): void {
        publishTxnRecord(txHash, harden({ split, status: TxStatus.Disbursed }));
      },

      /**
       * Mark a transaction as `FORWARDED` or `FORWARD_FAILED`
       * @param txHash
       * @param success
       */
      forwarded(txHash: EvmHash, success: boolean): void {
        publishTxnRecord(
          txHash,
          harden({
            status: success ? TxStatus.Forwarded : TxStatus.ForwardFailed,
          }),
        );
      },

      /**
       * Lookup all pending entries for a given address and amount
       *
       * XXX only used in tests. should we remove?
       * @param nfa
       * @param amount
       */
      lookupPending(nfa: NobleAddress, amount: bigint): PendingTx[] {
        const key = makePendingTxKey(nfa, amount);
        if (!pendingSettleTxs.has(key)) {
          return harden([]);
        }
        return pendingSettleTxs.get(key);
      },
    },
    { stateShape },
  );
};
harden(prepareStatusManager);

export type StatusManager = ReturnType<typeof prepareStatusManager>;
