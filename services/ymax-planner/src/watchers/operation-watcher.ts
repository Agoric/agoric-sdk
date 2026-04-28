import type { Filter, Log } from 'ethers';
import { id, AbiCoder } from 'ethers';
import type { WebSocket } from 'ws';
import type { CaipChainId } from '@agoric/orchestration';
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import { tryJsonParse } from '@agoric/internal';
import {
  getBlockNumberBeforeRealTime,
  scanEvmLogsInChunks,
  scanFailedTxsInChunks,
  type EvmRpc,
  type WatcherTimeoutOptions,
} from '../evm-scanner.ts';
import type { MakeAbortController } from '../support.ts';
import { PendingTxCode, TX_TIMEOUT_MS } from '../pending-tx-manager.ts';
import {
  deleteTxBlockLowerBound,
  getTxBlockLowerBound,
  setTxBlockLowerBound,
} from '../kv-store.ts';
import type { WatcherResult } from '../pending-tx-manager.ts';
import {
  extractPayloadHash,
  extractPaddedTxId,
  fetchReceiptWithRetry,
  handleTxRevert,
  handleOperationFailure,
  FAILED_TX_SCOPE,
  DEFAULT_RETRY_OPTIONS,
  type AlchemySubscriptionMessage,
  type RetryOptions,
} from './watcher-utils.ts';

/**
 * The Keccak256 hash (event signature) of the PortfolioRouter `OperationResult` event.
 *
 * Event signature:
 *   OperationResult(string indexed id, string indexed sourceAddressIndex,
 *     string sourceAddress, address indexed allegedRemoteAccount,
 *     bytes4 instructionSelector, bool success, bytes reason)
 *
 * This event is emitted by the PortfolioRouter contract after processing each
 * RouterInstruction. It indicates whether the instruction (which may include
 * deposit, account provision, and/or multicall operations) succeeded or failed.
 */
const OPERATION_RESULT_SIGNATURE = id(
  'OperationResult(string,string,string,address,bytes4,bool,bytes)',
);

type OperationResultWatch = {
  routerAddress: `0x${string}`;
  provider: EvmRpc;
  chainId: CaipChainId;
  log?: (...args: unknown[]) => void;
  kvStore: KVStore;
  txId: `tx${number}`;
  payloadHash?: string;
  /** The LCA address used as padding template for the txId. */
  sourceAddress: string;
};

/**
 * Pad a txId with null bytes to match the length of the sourceAddress.
 */
export const padTxId = (txId: string, sourceAddress: string): string => {
  const paddingLength = sourceAddress.length - txId.length;
  assert(paddingLength >= 0, 'sourceAddress must not be shorter than txId');
  return txId + '\0'.repeat(paddingLength);
};

/**
 * Check whether a transaction's calldata matches the expected padded txId
 * or payloadHash. Resilient to contract bugs that may not correctly pad the
 * txId — returns true if either identifier matches, and warns if they disagree.
 */
const matchesTxPayload = (
  txData: string,
  paddedTxId: string,
  payloadHash: string | undefined,
  log: (...args: unknown[]) => void,
  txHash: string,
  txId: string,
): boolean => {
  const extractedTxId = extractPaddedTxId(txData);
  const txIdMatches = extractedTxId === paddedTxId;

  const hashMatches = payloadHash
    ? extractPayloadHash(txData) === payloadHash
    : false;

  if (txIdMatches && payloadHash && !hashMatches) {
    log(`⚠️  payloadHash mismatch for txId=${txId} txHash=${txHash}`);
  }
  if (!txIdMatches && hashMatches) {
    log(
      `⚠️  paddedTxId mismatch for txId=${txId} txHash=${txHash} (matched by payloadHash)`,
    );
  }

  return txIdMatches || hashMatches;
};

/**
 * Parse the OperationResult event log.
 *
 * Event: OperationResult(
 *   string indexed id, string indexed sourceAddressIndex,
 *   string sourceAddress, address indexed allegedRemoteAccount,
 *   bytes4 instructionSelector, bool success, bytes reason
 * )
 * - topics[0]: event signature
 * - topics[1]: keccak256(id)                        — indexed string hash
 * - topics[2]: keccak256(sourceAddressIndex)         — indexed string hash
 * - topics[3]: allegedRemoteAccount                  — indexed address
 * - data: abi.encode(string, bytes4, bool, bytes)
 */
const parseOperationResultLog = (
  log: Log,
  abiCoder: AbiCoder = new AbiCoder(),
): {
  idHash: string;
  txId: string;
  allegedRemoteAccount: string;
  instructionSelector: string;
  success: boolean;
  reason: string;
} => {
  if (!log.topics || log.topics.length < 4 || !log.data) {
    throw new Error('Malformed OperationResult log');
  }

  const idHash = log.topics[1];
  const allegedRemoteAccount = log.topics[3];
  const [txIdPadded, instructionSelector, success, reason] = abiCoder.decode(
    ['string', 'bytes4', 'bool', 'bytes'],
    log.data,
  );

  return {
    idHash,
    txId: txIdPadded.replace(/\0+$/, ''),
    allegedRemoteAccount,
    instructionSelector,
    success,
    reason,
  };
};

/**
 * Watch for OperationResult events in real-time (live mode).
 *
 * Subscribes to the Router contract and waits for an OperationResult
 * event with the expected txId.
 */
export const watchOperationResult = ({
  routerAddress,
  provider,
  chainId,
  txId,
  sourceAddress,
  timeoutMs = TX_TIMEOUT_MS,
  log = () => {},
  setTimeout = globalThis.setTimeout,
  signal,
  payloadHash,
  retryOptions = DEFAULT_RETRY_OPTIONS,
}: OperationResultWatch &
  WatcherTimeoutOptions & {
    retryOptions?: RetryOptions;
  }): Promise<WatcherResult> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return resolve({ settled: false });

    // The txId must be padded to match sourceAddress length
    const paddedTxId = padTxId(txId, sourceAddress);
    const expectedIdHash = id(paddedTxId);

    log(
      `Watching for OperationResult on router ${routerAddress} with id: ${txId}`,
    );

    const ws = provider.websocket as WebSocket;
    let done = false;
    let subId: string | null = null;
    const cleanups: (() => unknown)[] = [];
    const doCleanup = async () => {
      // Invoke all cleanups synchronously but report errors asynchronously.
      for (const cleanup of cleanups) {
        const result = (async () => cleanup())();
        void result.catch(err => log('Error during cleanup:', err));
      }
    };

    const finish = (res: WatcherResult) => {
      if (done) return;
      done = true;

      resolve(res);
      void doCleanup();
    };

    /**
     * Cleanup and reject with error.
     * Used for fatal errors where we cannot continue watching (e.g., WebSocket failure,
     * subscription failure). This indicates the WATCHING failed, not that the transaction
     * failed.
     */
    const fail = (err: unknown) => {
      if (done) return;
      done = true;

      reject(err);
      void doCleanup();
    };

    const onWsError = (e: any) => {
      const errorMsg = e?.message || String(e);
      log(`WebSocket error during OperationResult watch: ${errorMsg}`);
      fail(new Error(`WebSocket connection error: ${errorMsg}`));
    };

    const onWsClose = (code?: number, reason?: any) => {
      if (done) return;
      log(
        `WebSocket closed during OperationResult watch (code=${code}, reason=${reason})`,
      );
      fail(
        new Error(`WebSocket closed unexpectedly: ${reason} (code=${code})`),
      );
    };

    ws.on('error', onWsError);
    cleanups.unshift(() => ws.off('error', onWsError));

    ws.on('close', onWsClose);
    cleanups.unshift(() => ws.off('close', onWsClose));

    if (signal) {
      const onAbort = () => finish({ settled: false });
      signal.addEventListener('abort', onAbort);
      cleanups.unshift(() => signal.removeEventListener('abort', onAbort));
    }

    const messageHandler = async (data: any) => {
      if (done) return;

      await null;
      try {
        const msg = tryJsonParse(
          data.toString(),
          'alchemy_minedTransactions subscription response',
        ) as AlchemySubscriptionMessage;
        if (msg.method !== 'eth_subscription') return;

        const { result } = msg.params ?? {};
        const { transaction: tx, removed } = result ?? {};
        if (!tx) {
          log(`Subscription message missing transaction data`, result);
          return;
        }
        if (removed) {
          log(`⚠️  REORG: txHash=${tx.hash} was removed from chain - ignoring`);
          return;
        }

        const { hash: txHash, input: txData } = tx;
        if (!txHash || !txData) {
          log(`Subscription message missing txHash or input data`);
          return;
        }

        if (
          !matchesTxPayload(txData, paddedTxId, payloadHash, log, txHash, txId)
        ) {
          return;
        }

        const receipt = await fetchReceiptWithRetry(
          provider,
          txHash,
          log,
          retryOptions,
          setTimeout,
        );
        if (!receipt) {
          log(`txHash=${txHash} not confirmed after waiting`);
          return;
        }

        // Check for OperationResult event in receipt
        const matchingLog = receipt.logs.find(
          l =>
            l.topics?.[0] === OPERATION_RESULT_SIGNATURE &&
            l.topics?.[1] === expectedIdHash,
        );
        if (matchingLog) {
          const { success } = parseOperationResultLog(matchingLog);

          if (success) {
            log(`✅ SUCCESS: txHash=${txHash}`);
            return finish({ settled: true, txHash, success: true });
          }

          // Event-level failure: wait for confirmations before declaring failure
          const logFilter: Filter = {
            address: routerAddress,
            topics: [OPERATION_RESULT_SIGNATURE, expectedIdHash],
          };
          const watcherResult = await handleOperationFailure({
            eventLog: matchingLog,
            logFilter,
            parseEvent: parseOperationResultLog,
            chainId,
            signal,
            powers: { provider, log, setTimeout },
          });

          if (watcherResult) finish(watcherResult);
          return;
        }

        // No OperationResult event — check for transaction revert
        const watcherResult = await handleTxRevert({
          receipt,
          txHash,
          chainId,
          signal,
          powers: { provider, log, setTimeout },
        });
        if (watcherResult) {
          return finish(watcherResult);
        }
      } catch (e) {
        const errorMsg = e?.message || String(e);
        log(`Error processing WebSocket message: ${errorMsg}`);
      }
    };

    const subscribe = async () => {
      // Verify liveness.
      await provider.getNetwork();

      // Attach message handler before subscribing to avoid race condition
      ws.on('message', messageHandler);
      cleanups.unshift(() => ws.off('message', messageHandler));

      subId = await provider.send('eth_subscribe', [
        'alchemy_minedTransactions',
        {
          addresses: [{ to: routerAddress }],
          includeRemoved: true,
          hashesOnly: false,
        },
      ]);
      cleanups.unshift(() =>
        provider
          .send('eth_unsubscribe', [subId])
          .catch(e => log(`Failed to unsubscribe:`, e)),
      );
      log(`Subscribed with subId=${subId} for router=${routerAddress}`);
    };

    if (ws.readyState === 1) {
      subscribe().catch(fail);
    } else {
      ws.once('open', () => subscribe().catch(fail));
    }

    // Intentional: does not resolve/reject; only logs on timeout
    const timeoutId = setTimeout(() => {
      if (done) return;
      log(
        `[${PendingTxCode.ROUTED_GMP_TX_NOT_FOUND}] ✗ No matching OperationResult found within ${timeoutMs / 60000} minutes`,
      );
    }, timeoutMs);
    cleanups.unshift(() => clearTimeout(timeoutId));
  });
};

/**
 * Look back through historical blocks for an OperationResult event (lookback mode).
 *
 * Scans historical EVM logs for the OperationResult event with the expected
 * instruction ID, starting from the transaction publish time.
 */
export const lookBackOperationResult = async ({
  routerAddress,
  provider,
  txId,
  sourceAddress,
  publishTimeMs,
  chainId,
  log = () => {},
  signal,
  kvStore,
  setTimeout = globalThis.setTimeout,
  payloadHash,
  makeAbortController,
}: OperationResultWatch & {
  publishTimeMs: number;
  signal?: AbortSignal;
  setTimeout?: typeof globalThis.setTimeout;
  makeAbortController: MakeAbortController;
}): Promise<WatcherResult> => {
  await null;
  try {
    const fromBlock = await getBlockNumberBeforeRealTime(
      provider,
      publishTimeMs,
    );
    const toBlock = await provider.getBlockNumber();

    const savedFromBlock = getTxBlockLowerBound(kvStore, txId) || fromBlock;
    const failedTxLowerBound =
      getTxBlockLowerBound(kvStore, txId, FAILED_TX_SCOPE) || fromBlock;

    // For indexed strings, Solidity stores keccak256(string) in the topic.
    // The txId must be padded to match sourceAddress length (see padTxId).
    const paddedTxId = padTxId(txId, sourceAddress);
    const expectedIdHash = id(paddedTxId);

    log(
      `Searching blocks ${savedFromBlock} → ${toBlock} for OperationResult with id ${txId} (hash: ${expectedIdHash})`,
    );

    const baseFilter: Filter = {
      address: routerAddress,
      topics: [OPERATION_RESULT_SIGNATURE, expectedIdHash],
    };

    const updateFailedTxLowerBound = (_from: number, to: number) =>
      setTxBlockLowerBound(kvStore, txId, to, FAILED_TX_SCOPE);

    // Options shared by both scans. The abort signal propagates external
    // cancellation.
    const { signal: sharedSignal } = makeAbortController(
      undefined,
      signal ? [signal] : [],
    );

    // Phase 1: Scan for OperationResult events (cheap: uses eth_getLogs)
    const matchingEvent = await scanEvmLogsInChunks({
      provider,
      baseFilter,
      fromBlock: savedFromBlock,
      toBlock,
      chainId,
      setTimeout,
      log,
      signal: sharedSignal,
      onRejectedChunk: (_from, to) => setTxBlockLowerBound(kvStore, txId, to),
      predicate: ev => {
        try {
          const parsed = parseOperationResultLog(ev);
          log(`Check: idHash=${parsed.idHash} success=${parsed.success}`);
          return parsed.idHash === expectedIdHash;
        } catch (e) {
          log(`Parse error:`, e);
          return false;
        }
      },
    });

    if (matchingEvent) {
      const parsed = parseOperationResultLog(matchingEvent);
      const txHash = matchingEvent.transactionHash;

      if (parsed.success) {
        log(`✅ SUCCESS: txId=${txId} txHash=${txHash}`);
        deleteTxBlockLowerBound(kvStore, txId);
        deleteTxBlockLowerBound(kvStore, txId, FAILED_TX_SCOPE);
        return { settled: true, txHash, success: true };
      }

      // Failure case: wait for confirmations before declaring failure
      const result = await handleOperationFailure({
        eventLog: matchingEvent,
        logFilter: baseFilter,
        parseEvent: parseOperationResultLog,
        chainId,
        signal: sharedSignal,
        powers: { provider, log, setTimeout },
      });
      deleteTxBlockLowerBound(kvStore, txId);
      deleteTxBlockLowerBound(kvStore, txId, FAILED_TX_SCOPE);

      return result ?? { settled: false };
    }

    // Phase 2: Scan for reverted transactions (uses eth_getBlockReceipts or trace_filter)
    // Only reached when phase 1 found nothing in the block range.
    const failedTx = await scanFailedTxsInChunks({
      provider,
      fromBlock: failedTxLowerBound,
      toBlock,
      chainId,
      setTimeout,
      log,
      signal: sharedSignal,
      toAddress: routerAddress,
      verifyFailedTx: tx =>
        matchesTxPayload(tx.data, paddedTxId, payloadHash, log, tx.hash, txId),
      onRejectedChunk: updateFailedTxLowerBound,
    });

    if (failedTx) {
      log(`Found matching failed transaction`);
      const receipt = await provider.getTransactionReceipt(failedTx.hash);
      if (receipt) {
        const result = await handleTxRevert({
          receipt,
          txHash: failedTx.hash,
          chainId,
          signal: sharedSignal,
          powers: { provider, log, setTimeout },
        });
        if (result) {
          deleteTxBlockLowerBound(kvStore, txId);
          deleteTxBlockLowerBound(kvStore, txId, FAILED_TX_SCOPE);
          return result;
        }
      }
    }

    log(
      `[${PendingTxCode.ROUTED_GMP_TX_NOT_FOUND}] No matching OperationResult found`,
    );
    return { settled: false };
  } catch (error) {
    log(`Error:`, error);
    return { settled: false };
  }
};
