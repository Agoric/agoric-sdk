// eslint-disable-next-line -- Types in this file match external Axelar API schema
import { ethers, type JsonRpcProvider, type Log } from 'ethers';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types';

const MULTICALL_EXECUTED = ethers.id(
  'MulticallExecuted(string,(bool,bytes)[])',
);

type WatchGmpOptions = {
  provider: JsonRpcProvider;
  contractAddress: `0x${string}`;
  txId: TxId;
  timeoutMs?: number;
  log: (...args: unknown[]) => void;
  setTimeout?: typeof globalThis.setTimeout;
};

export const watchGmp = ({
  provider,
  contractAddress,
  txId,
  timeoutMs = 300000, // 5 min
  log = () => {},
  setTimeout = globalThis.setTimeout,
}: WatchGmpOptions): Promise<boolean> => {
  return new Promise(resolve => {
    const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));
    const filter = {
      address: contractAddress,
      topics: [MULTICALL_EXECUTED, expectedIdTopic],
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
