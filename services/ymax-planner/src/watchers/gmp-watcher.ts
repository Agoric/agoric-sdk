import { ethers } from 'ethers';
import type { Filter, WebSocketProvider, Log } from 'ethers';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types.js';
import type { CaipChainId } from '@agoric/orchestration';
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import {
  getBlockNumberBeforeRealTime,
  scanEvmLogsInChunks,
} from '../support.ts';
import type { MakeAbortController, WatcherTimeoutOptions } from '../support.ts';
import { TX_TIMEOUT_MS } from '../pending-tx-manager.ts';
import {
  deleteTxBlockLowerBound,
  getTxBlockLowerBound,
  setTxBlockLowerBound,
} from '../kv-store.ts';

// TODO: Remove once all contracts are upgraded to emit MulticallStatus
const MULTICALL_EXECUTED_SIGNATURE = ethers.id(
  'MulticallExecuted(string,(bool,bytes)[])',
);
const MULTICALL_STATUS_SIGNATURE = ethers.id(
  'MulticallStatus(string,bool,uint256)',
);

type WatchGmp = {
  provider: WebSocketProvider;
  contractAddress: `0x${string}`;
  txId: TxId;
  log: (...args: unknown[]) => void;
  kvStore: KVStore;
  makeAbortController: MakeAbortController;
};

export const watchGmp = ({
  provider,
  contractAddress,
  txId,
  timeoutMs = TX_TIMEOUT_MS,
  log = () => {},
  setTimeout = globalThis.setTimeout,
  signal,
}: WatchGmp & WatcherTimeoutOptions): Promise<boolean> => {
  return new Promise(resolve => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }

    const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));
    const statusFilter = {
      address: contractAddress,
      topics: [MULTICALL_STATUS_SIGNATURE, expectedIdTopic],
    };
    const executedFilter = {
      address: contractAddress,
      topics: [MULTICALL_EXECUTED_SIGNATURE, expectedIdTopic],
    };

    log(
      `Watching for MulticallStatus and MulticallExecuted events for txId: ${txId} at contract: ${contractAddress}`,
    );

    let executionFound = false;
    let timeoutId: NodeJS.Timeout;
    let listeners: Array<{ event: any; listener: any }> = [];

    const finish = (result: boolean) => {
      resolve(result);
      if (timeoutId) clearTimeout(timeoutId);
      for (const { event, listener } of listeners) {
        void provider.off(event, listener);
      }
      listeners = [];
    };

    signal?.addEventListener('abort', () => finish(false));

    const listenForStatus = (eventLog: Log) => {
      log(
        `MulticallStatus detected: txId=${txId} contract=${contractAddress} tx=${eventLog.transactionHash}`,
      );

      // Check if this log matches our expected txId
      if (eventLog.topics[1] === expectedIdTopic) {
        log(`✓ MulticallStatus matches txId: ${txId}`);
        executionFound = true;
        finish(true);
      } else {
        log(`MulticallStatus txId mismatch for ${txId}`);
      }
    };

    const listenForExecution = (eventLog: Log) => {
      log(
        `MulticallExecuted detected: txId=${txId} contract=${contractAddress} tx=${eventLog.transactionHash}`,
      );

      // Check if this log matches our expected txId
      if (eventLog.topics[1] === expectedIdTopic) {
        log(`✓ MulticallExecuted matches txId: ${txId}`);
        executionFound = true;
        finish(true);
      } else {
        log(`MulticallExecuted txId mismatch for ${txId}`);
      }
    };

    void provider.on(statusFilter, listenForStatus);
    void provider.on(executedFilter, listenForExecution);
    listeners.push({ event: statusFilter, listener: listenForStatus });
    listeners.push({ event: executedFilter, listener: listenForExecution });

    timeoutId = setTimeout(() => {
      if (!executionFound) {
        log(
          `✗ No MulticallStatus or MulticallExecuted found for txId ${txId} within ${timeoutMs / 60000} minutes`,
        );
      }
    }, timeoutMs);
  });
};

// We search separately for MulticallExecuted vs. MulticallStatus events
// indicating resolution of any given transaction.
// XXX It should be possible to combine them per
// https://docs.ethers.org/v6/api/providers/#TopicFilter , but we only search
// for the former to maintain backwards compatibility and so have not pursued
// such an approach.
export const EVENTS = {
  MULTICALL_EXECUTED: 'executed',
  MULTICALL_STATUS: 'status',
};

export const lookBackGmp = async ({
  provider,
  contractAddress,
  txId,
  publishTimeMs,
  chainId,
  log = () => {},
  signal,
  kvStore,
  makeAbortController,
}: WatchGmp & {
  publishTimeMs: number;
  chainId: CaipChainId;
  signal?: AbortSignal;
}): Promise<boolean> => {
  await null;
  try {
    const fromBlock = await getBlockNumberBeforeRealTime(
      provider,
      publishTimeMs,
    );
    const toBlock = await provider.getBlockNumber();

    // We don't know whether resolution will take the form of "executed" or
    // "status", so we look for both and track progress separately.
    const statusEventLowerBound =
      getTxBlockLowerBound(kvStore, txId, EVENTS.MULTICALL_STATUS) || fromBlock;
    const executedEventLowerBound =
      getTxBlockLowerBound(kvStore, txId, EVENTS.MULTICALL_EXECUTED) ||
      fromBlock;

    log(
      `Searching blocks ${statusEventLowerBound}/${executedEventLowerBound} → ${toBlock} for MulticallStatus or MulticallExecuted with txId ${txId} at ${contractAddress}`,
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

    const executedFilter: Filter = {
      address: contractAddress,
      topics: [MULTICALL_EXECUTED_SIGNATURE, expectedIdTopic],
    };

    const updateStatusEventLowerBound = (_from: number, to: number) =>
      setTxBlockLowerBound(kvStore, txId, to, EVENTS.MULTICALL_STATUS);

    const updateExecutedEventLowerBound = (_from: number, to: number) =>
      setTxBlockLowerBound(kvStore, txId, to, EVENTS.MULTICALL_EXECUTED);

    // Options shared by both scans (including an abort signal that is triggered
    // by a match from either).
    // see `prepareAbortController` in services/ymax-planner/src/main.ts
    const { abort: abortScans, signal: sharedSignal } = makeAbortController(
      undefined,
      signal ? [signal] : [],
    );
    const baseScanOpts = {
      provider,
      toBlock,
      chainId,
      log,
      signal: sharedSignal,
    };

    const matchingEvent = await Promise.race([
      scanEvmLogsInChunks(
        {
          ...baseScanOpts,
          baseFilter: statusFilter,
          fromBlock: statusEventLowerBound,
          onRejectedChunk: updateStatusEventLowerBound,
        },
        isMatch,
      ),
      scanEvmLogsInChunks(
        {
          ...baseScanOpts,
          baseFilter: executedFilter,
          fromBlock: executedEventLowerBound,
          onRejectedChunk: updateExecutedEventLowerBound,
        },
        isMatch,
      ),
    ]);

    abortScans();

    if (matchingEvent) {
      log(`Found matching event`);
      deleteTxBlockLowerBound(kvStore, txId, EVENTS.MULTICALL_EXECUTED);
      deleteTxBlockLowerBound(kvStore, txId, EVENTS.MULTICALL_STATUS);
      return true;
    }

    log(`No matching MulticallStatus or MulticallExecuted found`);
    return false;
  } catch (error) {
    log(`Error:`, error);
    return false;
  }
};
