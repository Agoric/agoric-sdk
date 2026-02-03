import type { Filter, WebSocketProvider, Log } from 'ethers';
import { id, AbiCoder } from 'ethers';
import type { CaipChainId } from '@agoric/orchestration';
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import {
  getBlockNumberBeforeRealTime,
  scanEvmLogsInChunks,
  type WatcherTimeoutOptions,
} from '../support.ts';
import { TX_TIMEOUT_MS } from '../pending-tx-manager.ts';
import {
  deleteTxBlockLowerBound,
  getTxBlockLowerBound,
  setTxBlockLowerBound,
} from '../kv-store.ts';
import type { WatcherResult } from '../pending-tx-manager.ts';
import { handleOperationFailure } from './watcher-utils.ts';

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
  expectedId: string;
  chainId: CaipChainId;
  log?: (...args: unknown[]) => void;
  kvStore: KVStore;
  txId: `tx${number}`;
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
): { idHash: string; success: boolean; reason: string } => {
  if (!log.topics || log.topics.length < 2 || !log.data) {
    throw new Error('Malformed OperationResult log');
  }

  const idHash = log.topics[1];
  const [success, reason] = abiCoder.decode(['bool', 'bytes'], log.data);

  // XXX: decode the reason bytes into a human-readable error message
  return {
    idHash,
    success,
    reason: reason.length > 0 ? reason : '',
  };
};

/**
 * Watch for OperationResult events in real-time (live mode).
 *
 * Subscribes to the PortfolioRouter contract and waits for an OperationResult
 * event with the expected instruction ID.
 */
export const watchOperationResult = ({
  routerAddress,
  provider,
  expectedId,
  chainId,
  timeoutMs = TX_TIMEOUT_MS,
  log = () => {},
  setTimeout = globalThis.setTimeout,
  signal,
}: OperationResultWatch & WatcherTimeoutOptions): Promise<WatcherResult> => {
  return new Promise(resolve => {
    if (signal?.aborted) {
      resolve({ settled: false });
      return;
    }

    // For indexed strings, Solidity stores keccak256(string) in the topic
    const expectedIdHash = id(expectedId);
    const filter: Filter = {
      address: routerAddress,
      topics: [OPERATION_RESULT_SIGNATURE, expectedIdHash],
    };

    log(
      `Watching for OperationResult on router ${routerAddress} with id: ${expectedId}`,
    );

    let resultFound = false;
    let timeoutId: NodeJS.Timeout;
    let listeners: Array<{ event: any; listener: any }> = [];

    const finish = (result: WatcherResult) => {
      resolve(result);
      if (timeoutId) clearTimeout(timeoutId);
      for (const { event, listener } of listeners) {
        void provider.off(event, listener);
      }
      listeners = [];
    };

    signal?.addEventListener('abort', () => finish({ settled: false }));

    const listenForOperationResult = async (eventLog: Log) => {
      await null;
      try {
        const { idHash, success, reason } = parseOperationResultLog(eventLog);

        if (idHash !== expectedIdHash) {
          log(`ID hash mismatch. Expected: ${expectedIdHash}, Got: ${idHash}`);
          return;
        }

        const txHash = eventLog.transactionHash;
        log(
          `✓ ID matches! expectedId=${expectedId} idHash=${idHash} success=${success} reason=${reason} tx=${txHash}`,
        );

        if (success) {
          // Success case: return immediately without waiting for confirmations
          // Rationale: Even if a reorg occurs, the transaction will likely succeed again
          log(`✅ SUCCESS: expectedId=${expectedId} txHash=${txHash}`);
          resultFound = true;
          finish({ settled: true, txHash, success: true });
          return;
        }

        // Failure case: wait for confirmations before declaring failure
        const result = await handleOperationFailure(
          eventLog,
          filter,
          parseOperationResultLog,
          `expectedId=${expectedId}`,
          chainId,
          provider,
          log,
        );

        if (result) {
          resultFound = true;
          finish(result);
        }
      } catch (error: any) {
        log(`Error:`, error);
      }
    };

    void provider.on(filter, listenForOperationResult);
    listeners.push({ event: filter, listener: listenForOperationResult });

    timeoutId = setTimeout(() => {
      if (!resultFound) {
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
  expectedId,
  publishTimeMs,
  chainId,
  log = () => {},
  signal,
  kvStore,
  txId,
}: OperationResultWatch & {
  publishTimeMs: number;
  signal?: AbortSignal;
}): Promise<WatcherResult> => {
  await null;
  try {
    const fromBlock = await getBlockNumberBeforeRealTime(
      provider,
      publishTimeMs,
    );
    const toBlock = await provider.getBlockNumber();

    const savedFromBlock =
      (await getTxBlockLowerBound(kvStore, txId)) || fromBlock;

    // For indexed strings, Solidity stores keccak256(string) in the topic
    const expectedIdHash = id(expectedId);

    log(
      `Searching blocks ${savedFromBlock} → ${toBlock} for OperationResult with id ${expectedId} (hash: ${expectedIdHash})`,
    );

    const baseFilter: Filter = {
      address: routerAddress,
      topics: [OPERATION_RESULT_SIGNATURE, expectedIdHash],
    };

    const abiCoder = new AbiCoder();

    const matchingEvent = await scanEvmLogsInChunks(
      {
        provider,
        baseFilter,
        fromBlock: savedFromBlock,
        toBlock,
        chainId,
        log,
        signal,
        onRejectedChunk: async (_, to) => {
          await setTxBlockLowerBound(kvStore, txId, to);
        },
      },
      ev => {
        try {
          const parsed = parseOperationResultLog(ev, abiCoder);
          log(`Check: idHash=${parsed.idHash} success=${parsed.success}`);
          // The filter already ensures idHash matches, but we verify anyway
          return parsed.idHash === expectedIdHash;
        } catch (e) {
          log(`Parse error:`, e);
          return false;
        }
      },
    );

    if (!matchingEvent) {
      log(`No matching OperationResult found`);
      return { settled: false };
    }

    const parsed = parseOperationResultLog(matchingEvent, abiCoder);
    const txHash = matchingEvent.transactionHash;

    if (parsed.success) {
      // Success case: return immediately
      log(`✅ SUCCESS: expectedId=${expectedId} txHash=${txHash}`);
      deleteTxBlockLowerBound(kvStore, txId);
      return { settled: true, txHash, success: true };
    }

    // Failure case: wait for confirmations before declaring failure
    const result = await handleOperationFailure(
      matchingEvent,
      baseFilter,
      logEntry => parseOperationResultLog(logEntry, abiCoder),
      `expectedId=${expectedId}`,
      chainId,
      provider,
      log,
    );
    deleteTxBlockLowerBound(kvStore, txId);

    return result ?? { settled: false };
  } catch (error) {
    log(`Error:`, error);
    return { settled: false };
  }
};
