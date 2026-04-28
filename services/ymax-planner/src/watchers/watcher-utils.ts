import type { TransactionReceipt, Filter, Log } from 'ethers';
import { Interface, AbiCoder, getAddress, keccak256 } from 'ethers';
import type { CaipChainId } from '@agoric/orchestration';
import { depositFactoryCreateAndDepositInputs } from '@aglocal/portfolio-contract/src/utils/evm-orch-factory.ts';
import { decodeAbiParameters } from 'viem';
import type { EvmRpc } from '../evm-scanner.ts';
import { waitForConfirmations } from '../evm-scanner.ts';
import {
  getBlockTimeMs,
  getConfirmationsRequired,
  getRevertConfirmationsRequired,
} from '../support.ts';

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

/**
 * Parses the `execute(bytes32, string, string, bytes)` calldata, extracts
 * the raw `payload` bytes (arg index 3), and returns `keccak256(payload)`.
 *
 * @param data - Transaction input data (the full `execute()` calldata)
 * @returns keccak256(payload) hex string, or null if parsing fails
 */
export const extractPayloadHash = (data: string): string | null => {
  const parsed = axelarExecuteIface.parseTransaction({ data });
  if (!parsed) return null;

  const [_commandId, _sourceChain, _sourceAddress, payload] = parsed.args;
  return keccak256(payload);
};

/**
 * Parses the `execute(bytes32, string, string, bytes)` calldata, extracts the
 * inner `payload`, strips its 4-byte function selector, and abi-decodes the
 * first argument as a string — which is the padded txId.
 *
 * The router payload is always function-encoded where the first argument is
 * a string (the padded txId) and the second is an address.
 *
 * @param data - Transaction input data (the full `execute()` calldata)
 * @returns The padded txId string, or null if parsing fails
 */
export const extractPaddedTxId = (
  data: string,
  abiCoder: AbiCoder = new AbiCoder(),
): string | null => {
  try {
    const parsed = axelarExecuteIface.parseTransaction({ data });
    if (!parsed) return null;

    const [_commandId, _sourceChain, sourceAddress, payload] = parsed.args;
    // Strip the 4-byte selector (0x + 8 hex chars) to get the ABI-encoded args
    const encodedArgs = `0x${payload.slice(10)}`;
    const [paddedTxId] = abiCoder.decode(['string'], encodedArgs);

    // Sanity check: the padded txId should match the source address length
    if (paddedTxId.length !== sourceAddress.length) {
      return null;
    }

    return paddedTxId;
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
 * @param provider - The EVM RPC provider
 * @param txHash - Transaction hash
 * @param log - Logging function
 * @param retryOptions - Retry configuration (limit and backoffLimit)
 * @param setTimeout - setTimeout function (injected to avoid ambient authority)
 * @returns Transaction receipt or null if not available after retries
 */
export const fetchReceiptWithRetry = async (
  provider: EvmRpc,
  txHash: string,
  log: (...args: unknown[]) => void,
  retryOptions: RetryOptions = DEFAULT_RETRY_OPTIONS,
  setTimeout: typeof globalThis.setTimeout,
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
 * Wait for sufficient block confirmations on a transaction.
 *
 * Implements the finality protection pattern: wait for enough confirmations
 * to ensure the result is permanent before reporting it. This prevents
 * premature failure reports that could be reversed by a blockchain reorg.
 *
 * @returns Confirmed receipt, or null if reorged out
 */
const waitForFinalConfirmations = async (
  txHash: string,
  confirmations: number,
  chainId: CaipChainId,
  provider: EvmRpc,
  log: (...args: unknown[]) => void,
  setTimeout: typeof globalThis.setTimeout,
  signal?: AbortSignal,
): Promise<TransactionReceipt | null> => {
  const receipt = await waitForConfirmations({
    provider,
    txHash,
    minConfirmations: confirmations,
    meanBlockTimeMs: getBlockTimeMs(chainId),
    setTimeout,
    signal,
    log,
  });
  if (!receipt) {
    log(
      `Transaction ${txHash} not confirmed after waiting for ${confirmations} confirmations (possibly reorged out)`,
    );
  }
  return receipt;
};

export type HandleTxRevertOpts = {
  receipt: TransactionReceipt;
  txHash: string;
  /** An optional string identifier for logging (e.g., "expectedAddr=0x123"). */
  identifier?: string;
  chainId: `${string}:${string}`;
  signal?: AbortSignal;
  powers: {
    provider: EvmRpc;
    log: (...args: unknown[]) => void;
    setTimeout: typeof globalThis.setTimeout;
  };
};

/**
 * Handle receipt status for a transaction that has been validated as matching
 * the watcher's criteria. Returns the result to report to the caller.
 *
 * This implements the finality protection pattern:
 * - Success (status 1): Return immediately without confirmations
 * - Failure (status 0): Wait for confirmations to ensure failure is permanent
 */
export const handleTxRevert = async ({
  receipt,
  txHash,
  identifier,
  chainId,
  signal,
  powers: { provider, log, setTimeout },
}: HandleTxRevertOpts): Promise<{
  settled: true;
  txHash: string;
  success: boolean;
} | null> => {
  await null;
  // TODO(https://github.com/Agoric/agoric-private/issues/783): also wait for confirmations on success cases — a reorg can flip
  // success → failure just as it can flip failure → success.
  if (receipt.status === 1) return null;

  const confirmations = getRevertConfirmationsRequired(chainId);
  const confirmedReceipt = await waitForFinalConfirmations(
    txHash,
    confirmations,
    chainId,
    provider,
    log,
    setTimeout,
    signal,
  );
  if (!confirmedReceipt) return null;

  // Re-check status after confirmations in case of reorg
  const success = confirmedReceipt.status === 1;
  const msgPrefix = success
    ? `✅ SUCCESS (after reorg, ${confirmations} confirmations)`
    : `❌ REVERTED (transaction failed, ${confirmations} confirmations)`;
  const paddedIdentifier = identifier ? ` ${identifier}` : '';
  log(
    `${msgPrefix}:${paddedIdentifier} txHash=${txHash} block=${confirmedReceipt.blockNumber}`,
  );
  return { settled: true, txHash, success };
};

export type HandleOperationFailureOpts<T extends { success: boolean }> = {
  eventLog: Log;
  /** Filter to re-fetch the event after confirmations. */
  logFilter: Filter;
  parseEvent: (log: Log) => T;
  chainId: CaipChainId;
  signal?: AbortSignal;
  powers: {
    provider: EvmRpc;
    log: (...args: unknown[]) => void;
    setTimeout: typeof globalThis.setTimeout;
  };
};

/**
 * Handle event-level failure with finality protection.
 *
 * This is for cases where the transaction succeeded (status 1) but the
 * business logic failed (e.g., OperationResult event with success=false).
 * We wait for confirmations and re-verify the event to ensure the failure
 * is permanent before reporting it.
 */
export const handleOperationFailure = async <T extends { success: boolean }>({
  eventLog,
  logFilter,
  parseEvent,
  chainId,
  signal,
  powers: { provider, log, setTimeout },
}: HandleOperationFailureOpts<T>): Promise<{
  settled: true;
  txHash: string;
  success: boolean;
} | null> => {
  const txHash = eventLog.transactionHash;

  const confirmations = getConfirmationsRequired(chainId);
  const confirmedReceipt = await waitForFinalConfirmations(
    txHash,
    confirmations,
    chainId,
    provider,
    log,
    setTimeout,
    signal,
  );
  if (!confirmedReceipt) return null;

  const finalBlock = confirmedReceipt.blockNumber;

  // Fetch logs to verify the failure is still present
  const logsInBlock = await provider.getLogs({
    ...logFilter,
    fromBlock: finalBlock,
    toBlock: finalBlock,
  });

  const confirmedLog = logsInBlock.find(l => l.transactionHash === txHash);

  if (!confirmedLog) {
    log(
      `Event not found after ${confirmations} confirmations (possibly reorged or tx reverted): txHash=${txHash}`,
    );
    return null;
  }

  const confirmedParsed = parseEvent(confirmedLog);

  if (confirmedParsed.success) {
    log(
      `✅ SUCCESS (after reorg, ${confirmations} confirmations): txHash=${txHash}`,
    );
    return { settled: true, txHash, success: true };
  }

  log(`❌ FAILURE (${confirmations} confirmations): txHash=${txHash}`);
  return { settled: true, txHash, success: false };
};
