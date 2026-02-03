import type {
  TransactionReceipt,
  WebSocketProvider,
  Filter,
  Log,
} from 'ethers';
import { Interface, AbiCoder, getAddress } from 'ethers';
import type { CaipChainId } from '@agoric/orchestration';
import { depositFactoryCreateAndDepositInputs } from '@aglocal/portfolio-contract/src/utils/evm-orch-factory.ts';
import { decodeAbiParameters } from 'viem';
import { getConfirmationsRequired } from '../support.ts';

/** Scope tag for failed-transaction lookback searches. */
export const FAILED_TX_SCOPE = 'failedTx';

//#region Axelar execute calldata extraction
// AxelarExecutable entrypoint (standard)
// See https://docs.axelar.dev/dev/general-message-passing/executable
// Note: Using _ABI_TEXT suffix for human-readable string format
const AXELAR_EXECUTE_ABI_TEXT = [
  'function execute(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload) external',
];
const axelarExecuteIface = new Interface(AXELAR_EXECUTE_ABI_TEXT);

/**
 * Extract data from GMP Wallet.execute() calldata.
 * Payload structure: CallMessage { string id; ContractCalls[] calls; }
 *
 * @param data - Transaction input data (calldata)
 * @param abiCoder - AbiCoder instance for decoding payload
 * @returns Object with txId and sourceAddress, or null if parsing fails
 */
export const extractGmpExecuteData = (
  data: string,
  abiCoder: AbiCoder = new AbiCoder(),
): { txId: string; sourceAddress: string } | null => {
  try {
    const parsed = axelarExecuteIface.parseTransaction({ data });
    if (!parsed) return null;

    const [_commandId, _sourceChain, sourceAddress, payload] = parsed.args;
    if (!sourceAddress || !payload) return null;

    // Decode CallMessage payload: tuple(string id, tuple(address target, bytes data)[] calls)
    const [decoded] = abiCoder.decode(
      ['tuple(string id, tuple(address target, bytes data)[] calls)'],
      payload,
    );

    const txId = decoded?.id;
    if (typeof txId !== 'string') return null;

    return { txId, sourceAddress };
  } catch {
    return null;
  }
};

/**
 * Extract data from Factory.execute() calldata.
 * Payload structure: address (expected wallet address)
 *
 * @param data - Transaction input data (calldata)
 * @param abiCoder - AbiCoder instance for decoding payload
 * @returns Object with expectedWalletAddress and sourceAddress, or null if parsing fails
 */
export const extractFactoryExecuteData = (
  data: string,
  abiCoder: AbiCoder = new AbiCoder(),
): { expectedWalletAddress: string; sourceAddress: string } | null => {
  try {
    const parsed = axelarExecuteIface.parseTransaction({ data });
    if (!parsed) return null;

    const [_commandId, _sourceChain, sourceAddress, payload] = parsed.args;
    if (!sourceAddress || !payload) return null;

    // Decode address payload
    const [expectedWalletAddress] = abiCoder.decode(['address'], payload);
    if (!expectedWalletAddress) return null;

    return {
      expectedWalletAddress: getAddress(expectedWalletAddress),
      sourceAddress,
    };
  } catch {
    return null;
  }
};

/**
 * Extract data from DepositFactory.execute() calldata.
 * Payload structure: CreateAndDepositPayload struct
 *
 * Uses shared ABI definition from portfolio-contract to ensure consistency.
 *
 * @param data - Transaction input data (calldata)
 * @returns Object with expectedWalletAddress and sourceAddress, or null if parsing fails
 */
export const extractDepositFactoryExecuteData = (
  data: string,
): { expectedWalletAddress: string; sourceAddress: string } | null => {
  try {
    const parsed = axelarExecuteIface.parseTransaction({ data });
    if (!parsed) return null;

    const [_commandId, _sourceChain, sourceAddress, payload] = parsed.args;
    if (!sourceAddress || !payload) return null;

    // Decode CreateAndDepositPayload using shared ABI definition
    const [decoded] = decodeAbiParameters(
      depositFactoryCreateAndDepositInputs,
      payload,
    );
    if (!decoded?.expectedWalletAddress) return null;

    return {
      expectedWalletAddress: getAddress(decoded.expectedWalletAddress),
      sourceAddress,
    };
  } catch {
    return null;
  }
};
//#endregion

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
 * @param setTimeout - setTimeout function (injected to avoid ambient authority)
 * @returns Transaction receipt or null if not available after retries
 */
export const fetchReceiptWithRetry = async (
  provider: WebSocketProvider,
  txHash: string,
  log: (...args: unknown[]) => void,
  retryOptions: RetryOptions = DEFAULT_RETRY_OPTIONS,
  setTimeout: typeof globalThis.setTimeout = globalThis.setTimeout,
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
export const handleTxRevert = async (
  receipt: TransactionReceipt,
  txHash: string,
  identifier: string,
  chainId: `${string}:${string}`,
  provider: WebSocketProvider,
  log: (...args: unknown[]) => void,
): Promise<{ settled: true; txHash: string; success: boolean } | null> => {
  await null;
  // TODO(https://github.com/Agoric/agoric-private/issues/783): also wait for confirmations on success cases — a reorg can flip
  // success → failure just as it can flip failure → success.
  if (receipt.status !== 0) return null;

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
};

/**
 * Handle event-level failure with finality protection.
 *
 * This is for cases where the transaction succeeded (status 1) but the
 * business logic failed (e.g., OperationResult event with success=false).
 * We wait for confirmations and re-verify the event to ensure the failure
 * is permanent before reporting it.
 *
 * @param eventLog - The event log containing the failure
 * @param filter - Filter to re-fetch the event after confirmations
 * @param parseEvent - Function to parse the event and return its success status
 * @param identifier - A string identifier for logging
 * @param chainId - Chain ID to determine confirmation requirements
 * @param provider - WebSocket provider for waiting for confirmations
 * @param log - Logging function
 * @returns Object with settled flag, success status, and transaction hash, or null if reorged
 */
export const handleOperationFailure = async <T extends { success: boolean }>(
  eventLog: Log,
  filter: Filter,
  parseEvent: (log: Log) => T,
  identifier: string,
  chainId: CaipChainId,
  provider: WebSocketProvider,
  log: (...args: unknown[]) => void,
): Promise<{ settled: true; txHash: string; success: boolean } | null> => {
  await null;
  const txHash = eventLog.transactionHash;
  const eventBlock = eventLog.blockNumber;

  const confirmations = getConfirmationsRequired(chainId);
  const currentBlock = await provider.getBlockNumber();
  const confirmedBlocks = currentBlock - eventBlock;

  if (confirmedBlocks < confirmations) {
    log(
      `⏳ FAILURE detected, waiting for ${confirmations} confirmations (have ${confirmedBlocks}): ${identifier} txHash=${txHash}`,
    );

    const confirmedReceipt = await provider.waitForTransaction(
      txHash,
      confirmations,
    );

    if (!confirmedReceipt) {
      log(
        `Transaction ${txHash} was not confirmed after waiting (possibly reorged out)`,
      );
      return null;
    }
  }

  // Re-fetch the logs to verify the failure is still present
  const confirmedLogs = await provider.getLogs({
    ...filter,
    fromBlock: eventBlock,
    toBlock: eventBlock,
  });

  const confirmedEvent = confirmedLogs.find(l => l.transactionHash === txHash);

  if (!confirmedEvent) {
    log(
      `Event not found after ${confirmations} confirmations (possibly reorged): ${identifier}`,
    );
    return null;
  }

  const confirmedParsed = parseEvent(confirmedEvent);

  if (confirmedParsed.success) {
    log(
      `✅ SUCCESS (after reorg, ${confirmations} confirmations): ${identifier} txHash=${txHash}`,
    );
    return { settled: true, txHash, success: true };
  }

  log(
    `❌ FAILURE (${confirmations} confirmations): ${identifier} txHash=${txHash}`,
  );
  return { settled: true, txHash, success: false };
};
