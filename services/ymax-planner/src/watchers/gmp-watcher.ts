import { ethers } from 'ethers';
import type { Filter, WebSocketProvider } from 'ethers';
import type { WebSocket } from 'ws';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types.js';
import type { CaipChainId } from '@agoric/orchestration';
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import { tryJsonParse } from '@agoric/internal';
import { PendingTxCode } from '../pending-tx-manager.ts';
import {
  getBlockNumberBeforeRealTime,
  scanEvmLogsInChunks,
  scanFailedTxsInChunks,
} from '../support.ts';
import type { MakeAbortController, WatcherTimeoutOptions } from '../support.ts';
import { TX_TIMEOUT_MS, type WatcherResult } from '../pending-tx-manager.ts';
import {
  deleteTxBlockLowerBound,
  getTxBlockLowerBound,
  setTxBlockLowerBound,
} from '../kv-store.ts';
import {
  fetchReceiptWithRetry,
  extractGmpExecuteData,
  DEFAULT_RETRY_OPTIONS,
  type AlchemySubscriptionMessage,
  type RetryOptions,
  handleTxRevert,
} from './watcher-utils.ts';

const MULTICALL_STATUS_SIGNATURE = ethers.id(
  'MulticallStatus(string,bool,uint256)',
);

type WatchGmp = {
  provider: WebSocketProvider;
  contractAddress: `0x${string}`;
  txId: TxId;
  expectedSourceAddress: string;
  chainId: CaipChainId;
  log: (...args: unknown[]) => void;
  kvStore: KVStore;
  makeAbortController: MakeAbortController;
  retryOptions?: RetryOptions;
};

export const watchGmp = ({
  provider,
  contractAddress,
  txId,
  expectedSourceAddress,
  chainId,
  timeoutMs = TX_TIMEOUT_MS,
  log = () => {},
  setTimeout = globalThis.setTimeout,
  signal,
  retryOptions = DEFAULT_RETRY_OPTIONS,
}: WatchGmp & WatcherTimeoutOptions): Promise<WatcherResult> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return resolve({ settled: false });

    log(
      `Watching transaction status for txId: ${txId} at contract: ${contractAddress}`,
    );

    let done = false;
    let timeoutId: NodeJS.Timeout | undefined;
    let subId: string | null = null;
    const cleanups: (() => void)[] = [];

    const ws = provider.websocket as WebSocket;

    // Precompute expected topic for txId
    const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));

    const finish = (res: WatcherResult) => {
      if (done) return;
      done = true;

      if (timeoutId) clearTimeout(timeoutId);

      resolve(res);
      if (subId) {
        void provider
          .send('eth_unsubscribe', [subId])
          .catch(e => log('Failed to unsubscribe:', e));
      }
      for (const cleanup of cleanups) cleanup();
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

      if (timeoutId) clearTimeout(timeoutId);

      reject(err);
      if (subId) {
        void provider
          .send('eth_unsubscribe', [subId])
          .catch(error =>
            log('Failed to unsubscribe during error cleanup:', error),
          );
      }
      for (const cleanup of cleanups) cleanup();
    };

    const onWsError = (e: any) => {
      const errorMsg = e?.message || String(e);
      log(`WebSocket error during GMP watch for txId=${txId}: ${errorMsg}`);
      fail(new Error(`WebSocket connection error: ${errorMsg}`));
    };

    const onWsClose = (code?: number, reason?: any) => {
      if (!done) {
        log(
          `WebSocket closed during GMP watch for txId=${txId} (code=${code}, reason=${reason})`,
        );
        fail(
          new Error(`WebSocket closed unexpectedly: ${reason} (code=${code})`),
        );
      }
    };

    ws.on('error', onWsError);
    cleanups.unshift(() => ws.off('error', onWsError));

    ws.on('close', onWsClose);
    cleanups.unshift(() => ws.off('close', onWsClose));

    if (signal) {
      const onAbort = () => finish({ settled: false });
      signal.addEventListener('abort', onAbort);
      cleanups.unshift(() => {
        signal.removeEventListener('abort', onAbort);
      });
    }

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

        // Ignore transactions that have been removed from canonical chain (reorged)
        if (removed === true) {
          log(
            `⚠️  REORG: txId=${txId} txHash=${tx.hash} was removed from chain - ignoring`,
          );
          return;
        }

        const txHash = tx.hash;
        const txData = tx.input;
        if (!txHash || !txData) return;

        const executeData = extractGmpExecuteData(txData);
        if (!executeData || executeData.txId !== txId) return;

        if (executeData.sourceAddress !== expectedSourceAddress) {
          log(
            `⚠️  IGNORED: txId=${txId} txHash=${txHash} - sourceAddress mismatch (expected ${expectedSourceAddress}, got ${executeData.sourceAddress})`,
          );
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
          log(`Transaction ${txHash} not confirmed after waiting`);
          return;
        }

        const matchingLog = receipt.logs.find(
          l =>
            l.topics?.[0] === MULTICALL_STATUS_SIGNATURE &&
            l.topics?.[1] === expectedIdTopic,
        );

        if (receipt.status === 1 && matchingLog) {
          // Success case: return immediately without waiting for any confirmations (0 blocks)
          // Rationale: Even if a reorg occurs, the transaction will likely succeed again
          // Waiting for confirmations in success cases would hurt performance unnecessarily
          log(
            `✅ SUCCESS: txId=${txId} txHash=${txHash} block=${receipt.blockNumber}`,
          );
          return finish({ settled: true, txHash, success: true });
        }

        /**
         * Transaction reverted check: Since we've already validated that the sourceAddress
         * matches our expected LCA address, this is a legitimate execution attempt
         * from our own wallet. Spurious executions from unauthorized parties are already
         * filtered out by the sourceAddress check above.
         */
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
      // Verify liveness.
      await provider.getNetwork();

      // Attach message handler before subscribing to avoid race condition
      ws.on('message', messageHandler);
      cleanups.unshift(() => ws.off('message', messageHandler));

      subId = await provider.send('eth_subscribe', [
        'alchemy_minedTransactions',
        {
          addresses: [{ to: contractAddress }],
          includeRemoved: true, // Receive reorg notifications
          hashesOnly: false,
        },
      ]);
    };

    if (ws.readyState === 1) {
      subscribe().catch(fail);
    } else {
      ws.once('open', () => subscribe().catch(fail));
    }

    // Intentional: does not resolve/reject; only logs on timeout
    timeoutId = setTimeout(() => {
      if (!done) {
        log(
          `[${PendingTxCode.GMP_TX_NOT_FOUND}] ✗ No transaction status found for txId ${txId} within ${
            timeoutMs / 60000
          } minutes`,
        );
      }
    }, timeoutMs);
  });
};

export const MULTICALL_STATUS_EVENT = 'status';

type WatchGmpLookback = {
  publishTimeMs: number;
  chainId: CaipChainId;
  signal?: AbortSignal;
  fetch: typeof fetch;
  rpcUrl: string;
};

export const lookBackGmp = async ({
  provider,
  rpcUrl,
  contractAddress,
  txId,
  publishTimeMs,
  chainId,
  log = () => {},
  signal,
  kvStore,
  makeAbortController,
  fetch,
}: WatchGmp & WatchGmpLookback): Promise<WatcherResult> => {
  await null;
  try {
    const fromBlock = await getBlockNumberBeforeRealTime(
      provider,
      publishTimeMs,
    );
    const toBlock = await provider.getBlockNumber();

    const statusEventLowerBound =
      getTxBlockLowerBound(kvStore, txId, MULTICALL_STATUS_EVENT) || fromBlock;

    log(
      `Searching blocks ${statusEventLowerBound} → ${toBlock} for MulticallStatus or MulticallExecuted with txId ${txId} at ${contractAddress}`,
    );
    const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));
    const isMatch = ev => ev.topics[1] === expectedIdTopic;

    // XXX It should be possible to combine both filters into one disjunction:
    // https://docs.ethers.org/v6/api/providers/#TopicFilter
    // > array is effectively an OR-ed set, where any one of those values must
    // > match
    const statusFilter: Filter = {
      address: contractAddress,
      topics: [MULTICALL_STATUS_SIGNATURE, expectedIdTopic],
    };

    const updateStatusEventLowerBound = (_from: number, to: number) =>
      setTxBlockLowerBound(kvStore, txId, to, MULTICALL_STATUS_EVENT);

    // Both scans share an abort signal so that whichever finishes first
    // causes the other to stop on its next iteration.
    // see `prepareAbortController` in services/ymax-planner/src/main.ts
    const { abort: abortScans, signal: sharedSignal } = makeAbortController(
      undefined,
      signal ? [signal] : [],
    );
    const sharedOpts = {
      provider,
      toBlock,
      chainId,
      log,
      signal: sharedSignal,
    };

    const [matchingEvent, failedTx] = await Promise.all([
      scanEvmLogsInChunks(
        {
          ...sharedOpts,
          baseFilter: statusFilter,
          fromBlock: statusEventLowerBound,
          onRejectedChunk: updateStatusEventLowerBound,
        },
        isMatch,
      ).then(result => {
        if (result) abortScans();
        return result;
      }),
      scanFailedTxsInChunks({
        ...sharedOpts,
        fromBlock: statusEventLowerBound,
        toAddress: contractAddress,
        verifyFailedTx: tx => {
          const data = extractGmpExecuteData(tx.data);
          if (data?.txId === txId) return true;
          return false;
        },
        rpcUrl,
        fetch,
      }).then(result => {
        if (result) abortScans();
        return result;
      }),
    ]);

    abortScans();

    if (matchingEvent) {
      log(`Found matching event`);
      deleteTxBlockLowerBound(kvStore, txId, MULTICALL_STATUS_EVENT);
      return {
        settled: true,
        txHash: matchingEvent.transactionHash,
        success: true,
      };
    }

    if (failedTx) {
      log(`Found matching failed transaction`);
      deleteTxBlockLowerBound(kvStore, txId, MULTICALL_STATUS_EVENT);
      return {
        settled: true,
        txHash: failedTx.hash,
        success: false,
      };
    }

    log(
      `[${PendingTxCode.GMP_TX_NOT_FOUND}] No matching MulticallStatus or MulticallExecuted found`,
    );
    return { settled: false };
  } catch (error) {
    log(`Error:`, error);
    return { settled: false };
  }
};
