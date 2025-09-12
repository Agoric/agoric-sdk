// eslint-disable-next-line -- Types in this file match external Axelar API schema
import { ethers, type Filter, type JsonRpcProvider, type Log } from 'ethers';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types';
import { buildTimeWindow, scanEvmLogsInChunks } from '../support.ts';

const MULTICALL_EXECUTED_SIGNATURE = ethers.id(
  'MulticallExecuted(string,(bool,bytes)[])',
);

type WatchGmp = {
  provider: JsonRpcProvider;
  contractAddress: `0x${string}`;
  txId: TxId;
  log: (...args: unknown[]) => void;
};

export const watchGmp = ({
  provider,
  contractAddress,
  txId,
  timeoutMs = 300000, // 5 min
  log = () => {},
  setTimeout = globalThis.setTimeout,
}: WatchGmp & {
  timeoutMs?: number;
  setTimeout?: typeof globalThis.setTimeout;
}): Promise<boolean> => {
  return new Promise(resolve => {
    const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));
    const filter = {
      address: contractAddress,
      topics: [MULTICALL_EXECUTED_SIGNATURE, expectedIdTopic],
    };

    log(
      `Watching for MulticallExecuted events for txId: ${txId} at contract: ${contractAddress}`,
    );

    let executionFound = false;
    let timeoutId: NodeJS.Timeout;
    let listeners: Array<{ event: any; listener: any }> = [];

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      listeners.forEach(({ event, listener }) => {
        provider.off(event, listener);
      });
      listeners = [];
    };

    const listenForExecution = (eventLog: Log) => {
      log(
        `MulticallExecuted detected: txId=${txId} contract=${contractAddress} tx=${eventLog.transactionHash}`,
      );

      // Check if this log matches our expected txId
      if (eventLog.topics[1] === expectedIdTopic) {
        log(`✓ MulticallExecuted matches txId: ${txId}`);
        executionFound = true;
        cleanup();
        resolve(true);
      } else {
        log(`MulticallExecuted txId mismatch for ${txId}`);
      }
    };

    provider.on(filter, listenForExecution);
    listeners.push({ event: filter, listener: listenForExecution });

    timeoutId = setTimeout(() => {
      if (!executionFound) {
        log(
          `✗ No MulticallExecuted found for txId ${txId} within ${timeoutMs / 60000} minutes`,
        );
        cleanup();
        resolve(false);
      }
    }, timeoutMs);
  });
};

export const lookBackGmp = async ({
  provider,
  contractAddress,
  txId,
  publishTimeMs,
  log = () => {},
}: WatchGmp & { publishTimeMs: number }): Promise<boolean> => {
  try {
    const { fromBlock, toBlock } = await buildTimeWindow(
      provider,
      publishTimeMs,
    );

    log(`Searching blocks ${fromBlock} → ${toBlock}`);
    log(`Looking for MulticallExecuted for txId ${txId} at ${contractAddress}`);

    const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));

    const baseFilter: Filter = {
      address: contractAddress,
      topics: [MULTICALL_EXECUTED_SIGNATURE, expectedIdTopic],
    };

    const matched = await scanEvmLogsInChunks(
      { provider, baseFilter, fromBlock, toBlock, log },
      ev => ev.topics[1] === expectedIdTopic,
    );

    if (!matched) log(`No matching MulticallExecuted found`);
    return matched;
  } catch (error) {
    log(`Error:`, error);
    return false;
  }
};
