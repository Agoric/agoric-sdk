import type { TransactionReceipt, WebSocketProvider } from 'ethers';
import { getConfirmationsRequired } from '../support.ts';

//#region Alchemy alchemy_minedTransactions subscription types
// See https://docs.alchemy.com/reference/alchemy-minedtransactions
export type AlchemyMinedTransaction = {
  blockHash: string;
  blockNumber: string;
  hash: string;
  from: string;
  gas: string;
  gasPrice: string;
  input: string;
  nonce: string;
  to: string | null;
  transactionIndex: string;
  type: string;
  value: string;
  // ECDSA signature fields
  r?: string;
  s?: string;
  v?: string;
  // EIP-1559 fields
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
};

export type AlchemySubscriptionMessage = {
  jsonrpc: '2.0';
  method: 'eth_subscription';
  params: {
    result: {
      removed: boolean;
      transaction: AlchemyMinedTransaction;
    };
    subscription: string;
  };
};
//#endregion

export type RetryOptions = {
  /** Maximum number of retry attempts */
  limit: number;
  /** Maximum delay between retries in milliseconds */
  backoffLimit: number;
};

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  limit: 5,
  backoffLimit: 3000,
};

/**
 * Fetch transaction receipt with retry logic for freshly mined transactions.
 * @param provider - The WebSocket provider
 * @param txHash - Transaction hash
 * @param log - Logging function
 * @param retryOptions - Retry configuration (limit and backoffLimit)
 * @returns Transaction receipt or null if not available after retries
 */
export const fetchReceiptWithRetry = async (
  provider: WebSocketProvider,
  txHash: string,
  log: (...args: unknown[]) => void,
  retryOptions: RetryOptions = DEFAULT_RETRY_OPTIONS,
) => {
  const { limit, backoffLimit } = retryOptions;
  let receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) {
    log(`Receipt not yet available for txHash=${txHash}, retrying...`);
    for (let i = 0; i < limit && !receipt; i += 1) {
      const delay = Math.min(100 * 2 ** i, backoffLimit);
      await new Promise(resolve => setTimeout(resolve, delay));
      receipt = await provider.getTransactionReceipt(txHash);
    }

    if (!receipt) {
      log(`Failed to get receipt for txHash=${txHash} after ${limit} retries`);
    }
  }
  return receipt;
};

/**
 * Handle receipt status for a transaction that has been validated as matching
 * the watcher's criteria. Returns the result to report to the caller.
 *
 * This implements the finality protection pattern:
 * - Success (status 1): Return immediately without confirmations
 * - Failure (status 0): Wait for confirmations to ensure failure is permanent
 *
 * @param receipt - The transaction receipt to handle
 * @param txHash - Transaction hash for logging
 * @param identifier - A string identifier for logging (e.g., "txId=tx1" or "expectedAddr=0x123")
 * @param chainId - Chain ID to determine confirmation requirements
 * @param provider - WebSocket provider for waiting for confirmations
 * @param log - Logging function
 * @returns Object with settled flag, success status, and transaction hash
 */
export const handleReceiptStatus = async (
  receipt: TransactionReceipt,
  txHash: string,
  identifier: string,
  chainId: `${string}:${string}`,
  provider: WebSocketProvider,
  log: (...args: unknown[]) => void,
): Promise<{ settled: true; txHash: string; success: boolean } | null> => {
  if (receipt.status === 1) {
    // Success case: return immediately without waiting for any confirmations (0 blocks)
    // Rationale: Even if a reorg occurs, the transaction will likely succeed again
    // Waiting for confirmations in success cases would hurt performance unnecessarily
    log(
      `✅ SUCCESS: ${identifier} txHash=${txHash} block=${receipt.blockNumber}`,
    );
    return { settled: true, txHash, success: true };
  }

  if (receipt.status === 0) {
    /**
     * Transaction reverted - For failure cases, we wait for full finality
     * confirmations to ensure the failure is permanent. A failure that reorgs
     * into a success is very hard for our system to recover from, so we must
     * be certain of the failure.
     */
    const confirmations = getConfirmationsRequired(chainId);
    const confirmedReceipt = await provider.waitForTransaction(
      txHash,
      confirmations,
    );
    if (!confirmedReceipt) {
      log(
        `Transaction ${txHash} was not confirmed after waiting for ${confirmations} confirmations (possibly reorged out)`,
      );
      return null;
    }

    // Re-check status after confirmations in case of reorg
    if (confirmedReceipt.status === 0) {
      log(
        `❌ REVERTED (${confirmations} confirmations): ${identifier} txHash=${txHash} block=${confirmedReceipt.blockNumber} - transaction failed`,
      );
      return { settled: true, txHash, success: false };
    } else {
      // Transaction was reorged and succeeded - treat as success
      log(
        `✅ SUCCESS (after reorg, ${confirmations} confirmations): ${identifier} txHash=${txHash} block=${confirmedReceipt.blockNumber}`,
      );
      return { settled: true, txHash, success: true };
    }
  }

  return null;
};
