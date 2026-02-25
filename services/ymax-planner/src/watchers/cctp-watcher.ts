import type { Filter, WebSocketProvider, Log } from 'ethers';
import { id, zeroPadValue, getAddress, ethers } from 'ethers';
import type { CaipChainId } from '@agoric/orchestration';
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import { PendingTxCode, TX_TIMEOUT_MS } from '../pending-tx-manager.ts';
import {
  getBlockNumberBeforeRealTime,
  scanEvmLogsInChunks,
  type WatcherTimeoutOptions,
} from '../evm-scanner.ts';
import {
  deleteTxBlockLowerBound,
  getTxBlockLowerBound,
  setTxBlockLowerBound,
} from '../kv-store.ts';
import type { WatcherResult } from '../pending-tx-manager.ts';

/**
 * The Keccak256 hash (event signature) of the standard ERC-20 `Transfer` event.
 *
 * In Ethereum and other EVM-based chains, events are uniquely identified by the
 * hash of their declaration. When a smart contract emits a `Transfer` event, the
 * first topic in the log will be this hashed signature.
 *
 * `id()` is a helper that computes keccak256 over the given string. Calling
 * `id('Transfer(address,address,uint256)')` returns the 32-byte hash of the event
 * signature, which can be used to filter logs for `Transfer` events.
 *
 * `TRANSFER_SIGNATURE` is used to detect Transfer events in transaction receipts when parsing logs.
 *
 * Docs:
 * - Solidity Events
 *    - https://docs.soliditylang.org/en/latest/contracts.html#events
 *    - https://docs.soliditylang.org/en/latest/abi-spec.html#events
 * - ERC-20 Transfer event: https://eips.ethereum.org/EIPS/eip-20#transfer
 * - JsonRpcProvider API: https://docs.ethers.org/v5/concepts/events/#events--logs-and-filtering
 */
const TRANSFER_SIGNATURE = id('Transfer(address,address,uint256)');

type CctpWatch = {
  usdcAddress: `0x${string}`;
  provider: WebSocketProvider;
  toAddress: `0x${string}`;
  expectedAmount: bigint;
  log?: (...args: unknown[]) => void;
  kvStore: KVStore;
  txId: `tx${number}`;
};

const parseTransferLog = log => {
  if (!log.topics || log.topics.length < 3 || !log.data) {
    throw new Error('Malformed ERC-20 Transfer log');
  }
  return {
    from: extractAddress(log.topics[1]),
    to: extractAddress(log.topics[2]),
    amount: parseAmount(log.data),
  };
};

const extractAddress = topic => {
  // Topics are 32 bytes (64 hex digits) in which the last 20 bytes (40 hex digits)
  // represent an Ethereum address.
  return getAddress(`0x${topic.slice(-40)}`);
};

const parseAmount = data => {
  // ERC-20 value is stored as a 32-byte hex number.
  return BigInt(data);
};

export const watchCctpTransfer = ({
  usdcAddress,
  provider,
  toAddress,
  expectedAmount,
  timeoutMs = TX_TIMEOUT_MS,
  log = () => {},
  setTimeout = globalThis.setTimeout,
  signal,
}: CctpWatch & WatcherTimeoutOptions): Promise<WatcherResult> => {
  return new Promise(resolve => {
    if (signal?.aborted) {
      resolve({ settled: false });
      return;
    }

    const TO_TOPIC = zeroPadValue(toAddress.toLowerCase(), 32);
    const filter = {
      topics: [TRANSFER_SIGNATURE, null, TO_TOPIC],
    };

    log(
      `Watching for ERC-20 transfers to: ${toAddress} with amount: ${expectedAmount}`,
    );

    let transferFound = false;
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

    const listenForTransfer = async (eventLog: Log) => {
      let transferData;
      try {
        transferData = parseTransferLog(eventLog);
      } catch (error: any) {
        log(`Log parsing error:`, error.message);
        return;
      }

      const { from, to, amount } = transferData;
      const tokenAddr = eventLog.address; // USDC address

      log(
        `Transfer detected: token=${tokenAddr} from=${from} to=${to} amount=${amount} tx=${eventLog.transactionHash}`,
      );

      if (amount === expectedAmount && usdcAddress === tokenAddr) {
        log(
          `✓ Amount matches! Expected: ${expectedAmount}, Received: ${amount}`,
        );
        transferFound = true;
        finish({
          settled: true,
          txHash: eventLog.transactionHash,
          success: true,
        });
        return;
      }
      // Warn and continue watching.
      log(`Amount mismatch. Expected: ${expectedAmount}, Received: ${amount}`);
    };

    void provider.on(filter, listenForTransfer);
    listeners.push({ event: filter, listener: listenForTransfer });

    timeoutId = setTimeout(() => {
      if (!transferFound) {
        log(
          `[${PendingTxCode.CCTP_TX_NOT_FOUND}] ✗ No matching transfer found within ${timeoutMs / 60000} minutes`,
        );
      }
    }, timeoutMs);
  });
};

export const lookBackCctp = async ({
  usdcAddress,
  provider,
  toAddress,
  expectedAmount,
  publishTimeMs,
  chainId,
  setTimeout,
  log = () => {},
  signal,
  kvStore,
  txId,
}: CctpWatch & {
  publishTimeMs: number;
  chainId: CaipChainId;
  setTimeout: typeof globalThis.setTimeout;
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
    log(
      `Searching blocks ${savedFromBlock} → ${toBlock} for Transfer to ${toAddress} with amount ${expectedAmount}`,
    );

    const toTopic = ethers.zeroPadValue(toAddress.toLowerCase(), 32);
    const baseFilter: Filter = {
      address: usdcAddress,
      topics: [TRANSFER_SIGNATURE, null, toTopic],
    };

    // XXX: Consider async iteration pattern for more flexible log scanning
    // See: https://github.com/Agoric/agoric-sdk/pull/11915#discussion_r2353872425
    const matchingEvent = await scanEvmLogsInChunks({
      provider,
      baseFilter,
      fromBlock: savedFromBlock,
      toBlock,
      chainId,
      setTimeout,
      log,
      signal,
      onRejectedChunk: async (_, to) => {
        await setTxBlockLowerBound(kvStore, txId, to);
      },
      predicate: ev => {
        try {
          const t = parseTransferLog(ev);
          log(`Check: amount=${t.amount}`);
          return t.amount === expectedAmount;
        } catch (e) {
          log(`Parse error:`, e);
          return false;
        }
      },
    });

    if (!matchingEvent) {
      log(`[${PendingTxCode.CCTP_TX_NOT_FOUND}] No matching transfer found`);
      return { settled: false };
    }

    deleteTxBlockLowerBound(kvStore, txId);
    return {
      settled: true,
      txHash: matchingEvent.transactionHash,
      success: true,
    };
  } catch (error) {
    log(`Error:`, error);
    return { settled: false };
  }
};
