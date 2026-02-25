import type { Filter, WebSocketProvider, Log } from 'ethers';
import { id, AbiCoder } from 'ethers';
import type { WebSocket } from 'ws';
import type { CaipChainId } from '@agoric/orchestration';
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import { tryJsonParse } from '@agoric/internal';
import type { JSONRPCClient } from 'json-rpc-2.0';
import {
  getBlockNumberBeforeRealTime,
  scanEvmLogsInChunks,
  scanFailedTxsInChunks,
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
 * Event signature: OperationResult(string indexed id, bool success, bytes reason)
 *
 * This event is emitted by the PortfolioRouter contract after processing each
 * RouterInstruction. It indicates whether the instruction (which may include
 * deposit, account provision, and/or multicall operations) succeeded or failed.
 */
const OPERATION_RESULT_SIGNATURE = id('OperationResult(string,bool,bytes)');

type OperationResultWatch = {
  routerAddress: `0x${string}`;
  provider: WebSocketProvider;
  chainId: CaipChainId;
  log?: (...args: unknown[]) => void;
  kvStore: KVStore;
  txId: `tx${number}`;
  payloadHash: string;
};

/**
 * Parse the OperationResult event log.
 *
 * Event: OperationResult(string indexed id, bool success, bytes reason)
 * - topics[0]: event signature
 * - topics[1]: keccak256(id) (indexed string is stored as hash)
 * - data: abi.encode(bool success, bytes reason)
 */
const parseOperationResultLog = (
  log: Log,
  abiCoder: AbiCoder = new AbiCoder(),
): { idHash: string; success: boolean } => {
  if (!log.topics || log.topics.length < 2 || !log.data) {
    throw new Error('Malformed OperationResult log');
  }

  const idHash = log.topics[1];
  const [success] = abiCoder.decode(['bool', 'bytes'], log.data);

  return {
    idHash,
    success,
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
  return new Promise(resolve => {
    if (signal?.aborted) {
      resolve({ settled: false });
      return;
    }

    // For indexed strings, Solidity stores keccak256(string) in the topic
    const expectedIdHash = id(txId);
    const filter: Filter = {
      address: routerAddress,
      topics: [OPERATION_RESULT_SIGNATURE, expectedIdHash],
    };

    log(
      `Watching for OperationResult on router ${routerAddress} with id: ${txId}`,
    );

    let done = false;
    let timeoutId: NodeJS.Timeout;
    let subId: string | null = null;
    const cleanups: (() => void)[] = [];

    const ws = provider.websocket as WebSocket;

    const finish = (result: WatcherResult) => {
      if (done) return;
      done = true;

      if (timeoutId) clearTimeout(timeoutId);
      resolve(result);

      if (subId) {
        void provider
          .send('eth_unsubscribe', [subId])
          .catch(e => log('Failed to unsubscribe:', e));
      }
      for (const cleanup of cleanups) cleanup();
    };

    if (signal) {
      const onAbort = () => finish({ settled: false });
      signal.addEventListener('abort', onAbort);
      cleanups.unshift(() => signal.removeEventListener('abort', onAbort));
    }

    // Primary path: OperationResult event listener
    const listenForOperationResult = async (eventLog: Log) => {
      await null;
      if (done) return;
      try {
        const { idHash, success } = parseOperationResultLog(eventLog);

        if (idHash !== expectedIdHash) {
          return;
        }

        if (success) {
          const txHash = eventLog.transactionHash;
          log(
            `✅ SUCCESS: expectedId=${txId} idHash=${idHash} txHash=${txHash}`,
          );
          return finish({ settled: true, txHash, success: true });
        }

        // Failure case: wait for confirmations before declaring failure
        const result = await handleOperationFailure(
          eventLog,
          filter,
          parseOperationResultLog,
          `expectedId=${txId}`,
          chainId,
          provider,
          log,
        );

        if (result) {
          return finish(result);
        }
      } catch (error: any) {
        log(`Error:`, error);
      }
    };

    void provider.on(filter, listenForOperationResult);
    cleanups.unshift(() => {
      void provider.off(filter, listenForOperationResult);
    });

    // Secondary path: Alchemy mined-tx subscription for revert detection
    {
      const messageHandler = async (data: any) => {
        await null;
        if (done) return;

        try {
          const msg = tryJsonParse(
            data.toString(),
            'alchemy_minedTransactions subscription response',
          ) as AlchemySubscriptionMessage;

          if (msg.method !== 'eth_subscription') return;

          const tx = msg.params?.result?.transaction;
          const removed = msg.params?.result?.removed;
          if (!tx) return;

          if (removed === true) {
            log(
              `⚠️  REORG: txId=${txId} txHash=${tx.hash} was removed from chain - ignoring`,
            );
            return;
          }

          const txHash = tx.hash;
          const txData = tx.input;
          if (!txHash || !txData) return;

          // Validate the payload hash matches
          if (extractPayloadHash(txData) !== payloadHash) return;

          const receipt = await fetchReceiptWithRetry(
            provider,
            txHash,
            log,
            retryOptions,
            setTimeout,
          );
          if (!receipt) {
            log(`Transaction ${txHash} not confirmed after waiting`);
            return;
          }

          // If receipt has an OperationResult event, let the event listener handle it
          const hasOperationResultEvent = receipt.logs.some(
            l =>
              l.topics?.[0] === OPERATION_RESULT_SIGNATURE &&
              l.topics?.[1] === expectedIdHash,
          );
          if (hasOperationResultEvent) return;

          // Transaction reverted (status=0) without emitting OperationResult
          const result = await handleTxRevert(
            receipt,
            txHash,
            `txId=${txId}`,
            chainId,
            provider,
            log,
          );
          if (result) {
            return finish(result);
          }
        } catch (e) {
          log(
            `Error processing WebSocket message for txId=${txId}:`,
            e instanceof Error ? e.message : String(e),
          );
        }
      };

      const subscribe = async () => {
        await provider.getNetwork();

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
      };

      if (ws.readyState === 1) {
        subscribe().catch(e => {
          log(`Alchemy subscription failed (non-fatal):`, e);
        });
      } else {
        ws.once('open', () =>
          subscribe().catch(e => {
            log(`Alchemy subscription failed (non-fatal):`, e);
          }),
        );
      }
    }

    timeoutId = setTimeout(() => {
      if (!done) {
        log(
          `✗ No matching OperationResult found within ${timeoutMs / 60000} minutes`,
        );
      }
    }, timeoutMs);
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
  publishTimeMs,
  chainId,
  log = () => {},
  signal,
  kvStore,
  setTimeout = globalThis.setTimeout,
  payloadHash,
  rpcClient,
  makeAbortController,
}: OperationResultWatch & {
  publishTimeMs: number;
  signal?: AbortSignal;
  setTimeout?: typeof globalThis.setTimeout;
  rpcClient: JSONRPCClient;
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

    // For indexed strings, Solidity stores keccak256(string) in the topic
    const expectedIdHash = id(txId);

    log(
      `Searching blocks ${savedFromBlock} → ${toBlock} for OperationResult with id ${txId} (hash: ${expectedIdHash})`,
    );

    const baseFilter: Filter = {
      address: routerAddress,
      topics: [OPERATION_RESULT_SIGNATURE, expectedIdHash],
    };

    const abiCoder = new AbiCoder();

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
          const parsed = parseOperationResultLog(ev, abiCoder);
          log(`Check: idHash=${parsed.idHash} success=${parsed.success}`);
          return parsed.idHash === expectedIdHash;
        } catch (e) {
          log(`Parse error:`, e);
          return false;
        }
      },
    });

    if (matchingEvent) {
      const parsed = parseOperationResultLog(matchingEvent, abiCoder);
      const txHash = matchingEvent.transactionHash;

      if (parsed.success) {
        log(`✅ SUCCESS: txId=${txId} txHash=${txHash}`);
        deleteTxBlockLowerBound(kvStore, txId);
        deleteTxBlockLowerBound(kvStore, txId, FAILED_TX_SCOPE);
        return { settled: true, txHash, success: true };
      }

      // Failure case: wait for confirmations before declaring failure
      const result = await handleOperationFailure(
        matchingEvent,
        baseFilter,
        logEntry => parseOperationResultLog(logEntry, abiCoder),
        `txId=${txId}`,
        chainId,
        provider,
        log,
      );
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
      verifyFailedTx: tx => extractPayloadHash(tx.data) === payloadHash,
      onRejectedChunk: updateFailedTxLowerBound,
      rpcClient,
    });

    if (failedTx) {
      log(`Found matching failed transaction`);
      const receipt = await provider.getTransactionReceipt(failedTx.hash);
      if (receipt) {
        const result = await handleTxRevert(
          receipt,
          failedTx.hash,
          `txId=${txId}`,
          chainId,
          provider,
          log,
        );
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
