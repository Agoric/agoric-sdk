/**
 * @file Settlement-matching utilities for USDC transactions.
 *
 * This module maintains a `MapStore<NobleAddress, PendingTx[]>` where pending transactions
 * for each Noble address are kept in **ascending order** by `tx.amount`. This sorting
 * invariant enables efficient resolution of new mints through a greedy approach:
 *   1. Exact-amount direct lookup (O(n) time complexity)
 *   2. Greedy algorithm that processes transactions from smallest to largest
 *
 * The greedy strategy is deterministic and auditable: it selects the smallest pending
 * transactions that fit within the minted amount, maximizing the number of advances covered.
 * This handles cases where minted amounts are slightly larger than pending advances due to
 * rounding differences or extra IBC amounts, preventing funds from getting stuck.
 *
 * If the minted amount is less than any single pending tx, an empty array is returned.
 */

import type { MapStore } from '@agoric/swingset-liveslots';
import type { NobleAddress, PendingTx } from '@agoric/fast-usdc/src/types.ts';
import { insertIntoSortedArray } from './store.ts';

/** bigint‑safe ascending comparator (smallest first) */
const comparePendingTxAsc = (a: PendingTx, b: PendingTx): number =>
  Number(a.tx.amount - b.tx.amount);

harden(comparePendingTxAsc);

/**
 * Greedy smallest‑first matcher that allows partial matches.
 * Returns pending txs whose amounts sum to <= target, maximizing count.
 * If no txs fit within target, returns [].
 */
const greedyMatch = (
  pending: readonly PendingTx[],
  target: bigint,
): PendingTx[] => {
  if (target === 0n) return [];
  if (pending.length === 0) return [];

  const matched: PendingTx[] = [];
  let remaining = target;

  // Greedily consume pending txs (already sorted ascending)
  for (const tx of pending) {
    if (tx.tx.amount <= remaining) {
      matched.push(tx);
      remaining -= tx.tx.amount;
    }
  }

  return matched;
};
harden(greedyMatch);

export const makeSettlementMatcher = () => {
  /** add to per‑address queue, preserving ascending sort */
  const addPendingSettleTx = (
    pendingSettleTxs: MapStore<NobleAddress, PendingTx[]>,
    pending: PendingTx,
  ): void => {
    const nfa = pending.tx.forwardingAddress;
    if (!pendingSettleTxs.has(nfa)) {
      pendingSettleTxs.init(nfa, harden([pending]));
      return;
    }

    const list = [...pendingSettleTxs.get(nfa)];
    insertIntoSortedArray(list, pending, comparePendingTxAsc);
    pendingSettleTxs.set(nfa, harden(list));
  };

  /**
   * Attempt to satisfy `amount` for `nfa`. Returns the matched txs (possibly
   * empty). Updates the MapStore so those txs are no longer pending.
   *
   * The greedy algorithm matches pending txs (smallest first) whose amounts
   * sum to <= amount, allowing partial matches when the minted amount is
   * slightly larger than pending advances.
   */
  const matchAndDequeueSettlement = (
    pendingSettleTxs: MapStore<NobleAddress, PendingTx[]>,
    nfa: NobleAddress,
    amount: bigint,
  ): PendingTx[] => {
    if (!pendingSettleTxs.has(nfa)) return [];
    const list = pendingSettleTxs.get(nfa);

    // Use greedy match (smallest first, allows partial)
    const combo = greedyMatch(list, amount);
    if (combo.length) {
      if (combo.length !== list.length) {
        const matchedSet = new Set(combo); // identity compare is safe here
        const remaining = list.filter(tx => !matchedSet.has(tx));
        pendingSettleTxs.set(nfa, harden(remaining));
      } else {
        pendingSettleTxs.delete(nfa);
      }
    }
    return harden(combo);
  };

  return harden({ addPendingSettleTx, matchAndDequeueSettlement });
};

export type SettlementMatcher = ReturnType<typeof makeSettlementMatcher>;
