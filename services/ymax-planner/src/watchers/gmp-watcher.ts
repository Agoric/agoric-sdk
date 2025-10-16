import { ethers, type Filter, type WebSocketProvider, type Log } from 'ethers';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types';
import type { CaipChainId } from '@agoric/orchestration';
import { buildTimeWindow, scanEvmLogsInChunks } from '../support.ts';
import { TX_TIMEOUT_MS } from '../pending-tx-manager.ts';

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
};

export const watchGmp = ({
  provider,
  contractAddress,
  txId,
  timeoutMs = TX_TIMEOUT_MS,
  log = () => {},
  setTimeout = globalThis.setTimeout,
  signal,
}: WatchGmp & {
  timeoutMs?: number;
  setTimeout?: typeof globalThis.setTimeout;
  signal?: AbortSignal;
}): Promise<boolean> => {
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
        finish(false);
      }
    }, timeoutMs);
  });
};

export const lookBackGmp = async ({
  provider,
  contractAddress,
  txId,
  publishTimeMs,
  chainId,
  log = () => {},
  signal,
}: WatchGmp & {
  publishTimeMs: number;
  chainId: CaipChainId;
  signal?: AbortSignal;
}): Promise<boolean> => {
  await null;
  try {
    const { fromBlock, toBlock } = await buildTimeWindow(
      provider,
      publishTimeMs,
    );

    log(
      `Searching blocks ${fromBlock} → ${toBlock} for MulticallStatus or MulticallExecuted with txId ${txId} at ${contractAddress}`,
    );
    const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));

    const statusFilter: Filter = {
      address: contractAddress,
      topics: [MULTICALL_STATUS_SIGNATURE, expectedIdTopic],
    };

    const executedFilter: Filter = {
      address: contractAddress,
      topics: [MULTICALL_EXECUTED_SIGNATURE, expectedIdTopic],
    };

    const statusController = new AbortController();
    const executedController = new AbortController();

    if (signal) {
      signal.addEventListener('abort', () => {
        statusController.abort();
        executedController.abort();
      });
    }

    const matchingEvent = await Promise.race([
      scanEvmLogsInChunks(
        {
          provider,
          baseFilter: statusFilter,
          fromBlock,
          toBlock,
          chainId,
          log,
          signal: statusController.signal,
        },
        ev => ev.topics[1] === expectedIdTopic,
      ).then(result => {
        executedController.abort();
        return result;
      }),
      scanEvmLogsInChunks(
        {
          provider,
          baseFilter: executedFilter,
          fromBlock,
          toBlock,
          chainId,
          log,
          signal: executedController.signal,
        },
        ev => ev.topics[1] === expectedIdTopic,
      ).then(result => {
        statusController.abort();
        return result;
      }),
    ]);

    if (matchingEvent) {
      log(`Found matching event`);
      return true;
    }

    log(`No matching MulticallStatus or MulticallExecuted found`);
    return false;
  } catch (error) {
    log(`Error:`, error);
    return false;
  }
};
