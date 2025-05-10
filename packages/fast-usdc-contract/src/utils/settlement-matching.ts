import type { MapStore } from '@agoric/swingset-liveslots';
import type { NobleAddress, PendingTx } from '@agoric/fast-usdc/src/types.ts';
import { appendToSortedStoredArray } from './store.ts';

const findFirstValidCombination = (
  pendingTxs: PendingTx[],
  targetAmount: bigint,
): {
  matchedTxs: PendingTx[];
  sum: bigint;
} => {
  // We'll use a recursive approach with early termination
  // when a valid combination is found

  const result: PendingTx[] = [];

  // Helper function for recursive search
  const findCombination = (
    startIndex: number,
    currentSum: bigint,
    currentPath: PendingTx[],
  ): boolean => {
    // Base case: we found a match
    if (currentSum === targetAmount) {
      // Copy the current path to our result
      result.push(...currentPath);
      return true; // Found a valid combination
    }

    // Base case: we've exceeded the target or reached the end
    if (currentSum > targetAmount || startIndex >= pendingTxs.length) {
      return false;
    }

    // Try including transactions from the current position
    for (let i = startIndex; i < pendingTxs.length; i += 1) {
      const pending = pendingTxs[i];

      // Skip if this would exceed our target (taking advantage of sorted order)
      if (currentSum + pending.tx.amount > targetAmount) {
        continue;
      }

      // Include this transaction and continue searching
      currentPath.push(pending);

      // Recursive call - if we find a solution, we're done
      if (findCombination(i + 1, currentSum + pending.tx.amount, currentPath)) {
        return true;
      }

      // Backtrack if this doesn't lead to a solution
      currentPath.pop();
    }

    return false; // No valid combination found
  };

  // Start the search
  findCombination(0, 0n, []);

  return {
    matchedTxs: result,
    sum: result.reduce((sum, p) => sum + p.tx.amount, 0n),
  };
};

export const makeSettlementMatching = (
  pendingSettleTxs: MapStore<NobleAddress, PendingTx[]>,
) => {
  const addPendingSettleTx = (pendingTx: PendingTx): void => {
    const { forwardingAddress } = pendingTx.tx;
    appendToSortedStoredArray(
      pendingSettleTxs,
      forwardingAddress,
      pendingTx,
      (a, b) => Number(b.tx.amount - a.tx.amount), // sort by tx amount descending
    );
  };

  const matchSettlement = (
    forwardingAddress: NobleAddress,
    settledAmount: bigint,
  ): PendingTx[] => {
    if (!pendingSettleTxs.has(forwardingAddress)) {
      return [];
    }

    const txsForRecipient = pendingSettleTxs.get(forwardingAddress);

    if (txsForRecipient.length === 0) {
      console.warn('should not be reachable; clean up keys.');
      return [];
    }

    // 1. Try exact match first (most common case)
    const exactMatchIndex = txsForRecipient.findIndex(
      p => p.tx.amount === settledAmount,
    );

    if (exactMatchIndex !== -1) {
      // Found exact match
      const matchedTx = txsForRecipient[exactMatchIndex];

      // Remove the matched transaction
      if (txsForRecipient.length === 1) {
        pendingSettleTxs.delete(forwardingAddress);
      } else {
        const updatedTxs = [...txsForRecipient];
        updatedTxs.splice(exactMatchIndex, 1);
        pendingSettleTxs.set(forwardingAddress, updatedTxs);
      }

      return [matchedTx];
    }

    // 2. Find first valid combination using the sorted array
    // This takes advantage of the largest-to-smallest sorting
    const result = findFirstValidCombination(txsForRecipient, settledAmount);

    if (result.matchedTxs.length > 0) {
      // Remove matched transactions
      const remainingTxs = txsForRecipient.filter(
        tx => !result.matchedTxs.includes(tx),
      );
      if (remainingTxs.length === 0) {
        pendingSettleTxs.delete(forwardingAddress);
      } else {
        pendingSettleTxs.set(forwardingAddress, remainingTxs);
      }
      return result.matchedTxs;
    }

    // No match found
    return [];
  };

  return harden({
    matchSettlement,
    addPendingSettleTx,
  });
};
