import type { Filter, WebSocketProvider, Log } from 'ethers';
import { id, zeroPadValue, getAddress, AbiCoder } from 'ethers';
import type { WebSocket } from 'ws';
import type { CaipChainId } from '@agoric/orchestration';
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import { tryJsonParse } from '@agoric/internal';
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
import {
  fetchReceiptWithRetry,
  handleReceiptStatus,
  DEFAULT_RETRY_OPTIONS,
  type AlchemySubscriptionMessage,
  type RetryOptions,
} from './watcher-utils.ts';

// New version (3 parameters) - without sourceAddress
export const SMART_WALLET_CREATED_SIGNATURE = id(
  'SmartWalletCreated(address,string,string)',
);
// Old version (4 parameters) - with sourceAddress, for backward compatibility
export const SMART_WALLET_CREATED_SIGNATURE_V1 = id(
  'SmartWalletCreated(address,string,string,string)',
);
const abiCoder = new AbiCoder();

const extractAddress = topic => {
  return getAddress(`0x${topic.slice(-40)}`);
};

export const parseSmartWalletCreatedLog = (log: any) => {
  if (!log.topics || !log.data) {
    throw new Error('Malformed SmartWalletCreated log');
  }

  const wallet = extractAddress(log.topics[1]);
  const eventSignature = log.topics[0];

  if (eventSignature === SMART_WALLET_CREATED_SIGNATURE_V1) {
    const [owner, sourceChain, sourceAddress] = abiCoder.decode(
      ['string', 'string', 'string'],
      log.data,
    );
    return {
      wallet,
      owner,
      sourceChain,
      sourceAddress,
    };
  } else {
    const [owner, sourceChain] = abiCoder.decode(
      ['string', 'string'],
      log.data,
    );
    return {
      wallet,
      owner,
      sourceChain,
    };
  }
};

type SmartWalletWatchBase = {
  factoryAddr: `0x${string}`;
  provider: WebSocketProvider;
  expectedAddr: `0x${string}`;
  chainId: CaipChainId;
  log?: (...args: unknown[]) => void;
  retryOptions?: RetryOptions;
};

type SmartWalletWatch = SmartWalletWatchBase & {
  kvStore: KVStore;
  txId: `tx${number}`;
};

export const watchSmartWalletTx = ({
  factoryAddr,
  provider,
  expectedAddr,
  chainId,
  timeoutMs = TX_TIMEOUT_MS,
  log = () => {},
  setTimeout = globalThis.setTimeout,
  signal,
  retryOptions = DEFAULT_RETRY_OPTIONS,
}: SmartWalletWatchBase &
  WatcherTimeoutOptions &
  Partial<SmartWalletWatch>): Promise<WatcherResult> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return resolve({ settled: false });

    log(
      `Watching for wallet creation at factory ${factoryAddr} for expectedAddr ${expectedAddr}`,
    );

    let done = false;
    let timeoutId: NodeJS.Timeout | undefined;
    let subId: string | null = null;
    const cleanups: (() => void)[] = [];

    const ws = provider.websocket as WebSocket;

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
     * Used for fatal errors where we cannot continue watching.
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
      log(
        `WebSocket error during wallet watch for expectedAddr=${expectedAddr}: ${errorMsg}`,
      );
      fail(new Error(`WebSocket connection error: ${errorMsg}`));
    };

    const onWsClose = (code?: number, reason?: any) => {
      if (!done) {
        log(
          `WebSocket closed during wallet watch for expectedAddr=${expectedAddr} (code=${code}, reason=${reason})`,
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
            `⚠️  REORG: expectedAddr=${expectedAddr} txHash=${tx.hash} was removed from chain - ignoring`,
          );
          return;
        }

        const txHash = tx.hash;
        if (!txHash) return;

        // Fetch receipt to check for SmartWalletCreated event
        const receipt = await fetchReceiptWithRetry(
          provider,
          txHash,
          log,
          retryOptions,
        );
        if (!receipt) {
          log(`Transaction ${txHash} not confirmed after waiting`);
          return;
        }

        // Look for SmartWalletCreated event in logs with matching expectedAddr
        const matchingLog = receipt.logs.find(l => {
          // Check for either v1 or v2 signature
          if (
            l.topics?.[0] !== SMART_WALLET_CREATED_SIGNATURE_V1 &&
            l.topics?.[0] !== SMART_WALLET_CREATED_SIGNATURE
          ) {
            return false;
          }

          // Check if wallet address matches
          try {
            const eventData = parseSmartWalletCreatedLog(l);
            return eventData.wallet.toLowerCase() === expectedAddr;
          } catch {
            return false;
          }
        });

        if (!matchingLog) {
          // This transaction to the factory doesn't create our expected wallet
          return;
        }

        log(
          `✓ Found SmartWalletCreated event for expectedAddr=${expectedAddr} in txHash=${txHash}`,
        );

        /**
         * Transaction status check: We found the SmartWalletCreated event in the logs.
         * Now check if the transaction succeeded or reverted.
         */
        const result = await handleReceiptStatus(
          receipt,
          txHash,
          `expectedAddr=${expectedAddr}`,
          chainId,
          provider,
          log,
        );
        if (result) {
          return finish(result);
        }
      } catch (e) {
        log(
          `Error processing WebSocket message for expectedAddr=${expectedAddr}:`,
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
          addresses: [{ to: factoryAddr }],
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
          `✗ No wallet creation found for expectedAddr ${expectedAddr} within ${
            timeoutMs / 60000
          } minutes`,
        );
      }
    }, timeoutMs);
  });
};

export const lookBackSmartWalletTx = async ({
  factoryAddr,
  provider,
  expectedAddr,
  publishTimeMs,
  chainId,
  log = () => {},
  signal,
  kvStore,
  txId,
}: SmartWalletWatch & {
  publishTimeMs: number;
  chainId: CaipChainId;
  signal?: AbortSignal;
}): Promise<WatcherResult> => {
  await null;
  try {
    const fromBlock = await getBlockNumberBeforeRealTime(
      provider,
      publishTimeMs,
    );
    const toBlock = await provider.getBlockNumber();

    const savedFromBlock = getTxBlockLowerBound(kvStore, txId) || fromBlock;

    log(
      `Searching blocks ${savedFromBlock} → ${toBlock} for SmartWalletCreated events emitted by ${factoryAddr}`,
    );

    const toTopic = zeroPadValue(expectedAddr.toLowerCase(), 32);

    const baseFilterV1: Filter = {
      address: factoryAddr,
      topics: [SMART_WALLET_CREATED_SIGNATURE_V1, toTopic],
    };
    const baseFilterV2: Filter = {
      address: factoryAddr,
      topics: [SMART_WALLET_CREATED_SIGNATURE, toTopic],
    };

    const checkMatch = (ev: any) => {
      try {
        const t = parseSmartWalletCreatedLog(ev);
        const normalizedWallet = t.wallet.toLowerCase();
        log(`Check: addresss=${normalizedWallet}`);
        return normalizedWallet === expectedAddr;
      } catch (e) {
        log(`Parse error:`, e);
        return false;
      }
    };

    const matchingEvent = await Promise.race([
      scanEvmLogsInChunks(
        {
          provider,
          baseFilter: baseFilterV1,
          fromBlock: savedFromBlock,
          toBlock,
          chainId,
          log,
          signal,
          onRejectedChunk: (_, to) => {
            setTxBlockLowerBound(kvStore, txId, to);
          },
        },
        checkMatch,
      ),
      scanEvmLogsInChunks(
        {
          provider,
          baseFilter: baseFilterV2,
          fromBlock: savedFromBlock,
          toBlock,
          chainId,
          log,
          signal,
          onRejectedChunk: (_, to) => {
            setTxBlockLowerBound(kvStore, txId, to);
          },
        },
        checkMatch,
      ),
    ]);

    if (!matchingEvent) {
      log(`No matching SmartWalletCreated event found`);
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
