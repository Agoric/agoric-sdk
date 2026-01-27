import type { WebSocketProvider } from 'ethers';

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
