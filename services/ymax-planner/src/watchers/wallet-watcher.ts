import type { Filter, WebSocketProvider } from 'ethers';
import { id, zeroPadValue, getAddress, AbiCoder } from 'ethers';
import type { WebSocket } from 'ws';
import type { CaipChainId } from '@agoric/orchestration';
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import { tryJsonParse } from '@agoric/internal';
import type { JSONRPCClient } from 'json-rpc-2.0';
import type { MakeAbortController } from '../support.ts';
import {
  getBlockNumberBeforeRealTime,
  scanEvmLogsInChunks,
  scanFailedTxsInChunks,
  type WatcherTimeoutOptions,
} from '../evm-scanner.ts';
import { PendingTxCode, TX_TIMEOUT_MS } from '../pending-tx-manager.ts';
import {
  deleteTxBlockLowerBound,
  getTxBlockLowerBound,
  setTxBlockLowerBound,
} from '../kv-store.ts';
import type { WatcherResult } from '../pending-tx-manager.ts';
import {
  fetchReceiptWithRetry,
  extractFactoryExecuteData,
  extractDepositFactoryExecuteData,
  DEFAULT_RETRY_OPTIONS,
  FAILED_TX_SCOPE,
  type AlchemySubscriptionMessage,
  type RetryOptions,
  handleTxRevert,
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
  subscribeToAddr: `0x${string}`;
  provider: WebSocketProvider;
  expectedAddr: `0x${string}`;
  expectedSourceAddress: string;
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
  subscribeToAddr,
  provider,
  expectedAddr,
  expectedSourceAddress,
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
      `Watching for wallet creation: subscribing to ${subscribeToAddr}, expecting event from ${factoryAddr}, expectedAddr ${expectedAddr}`,
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
        const txData = tx.input;
        const txTo = tx.to;
        if (!txHash || !txData || !txTo) return;

        // Determine which contract is being called and use appropriate parser
        const isFactoryPath = getAddress(txTo) === getAddress(factoryAddr);
        const executeData = isFactoryPath
          ? extractFactoryExecuteData(txData)
          : extractDepositFactoryExecuteData(txData);

        if (!executeData) return;

        const { sourceAddress, expectedWalletAddress } = executeData;

        // Check sourceAddress and expectedWalletAddress match
        if (
          sourceAddress !== expectedSourceAddress ||
          getAddress(expectedWalletAddress) !== getAddress(expectedAddr)
        ) {
          return;
        }

        // Fetch receipt to check for SmartWalletCreated event
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

        if (receipt.status === 1 && matchingLog) {
          // Success case: return immediately without waiting for any confirmations (0 blocks)
          // Rationale: Even if a reorg occurs, the transaction will likely succeed again
          // Waiting for confirmations in success cases would hurt performance unnecessarily
          log(
            `✅ SUCCESS: expectedAddr=${expectedAddr} txHash=${txHash} block=${receipt.blockNumber}`,
          );
          return finish({ settled: true, txHash, success: true });
        }

        const result = await handleTxRevert(
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

      log(`Attempting to subscribe to ${subscribeToAddr}...`);
      subId = await provider.send('eth_subscribe', [
        'alchemy_minedTransactions',
        {
          addresses: [{ to: subscribeToAddr }],
          includeRemoved: true, // Receive reorg notifications
          hashesOnly: false,
        },
      ]);
      log(`✓ Subscribed to ${subscribeToAddr} (subscription ID: ${subId})`);
    };

    if (ws.readyState === 1) {
      subscribe().catch(fail);
    } else {
      ws.once('open', () => subscribe().catch(fail));
    }

    timeoutId = setTimeout(() => {
      if (!done) {
        log(
          `[${PendingTxCode.WALLET_TX_NOT_FOUND}] ✗ No wallet creation found for expectedAddr ${expectedAddr} within ${
            timeoutMs / 60000
          } minutes`,
        );
      }
    }, timeoutMs);
  });
};

type SmartWalletLookback = {
  publishTimeMs: number;
  chainId: CaipChainId;
  setTimeout: typeof globalThis.setTimeout;
  signal?: AbortSignal;
  rpcClient: JSONRPCClient;
  subscribeToAddr: `0x${string}`;
  makeAbortController: MakeAbortController;
};

export const lookBackSmartWalletTx = async ({
  factoryAddr,
  provider,
  expectedAddr,
  expectedSourceAddress,
  publishTimeMs,
  chainId,
  setTimeout,
  log = () => {},
  signal,
  kvStore,
  txId,
  rpcClient,
  subscribeToAddr,
  makeAbortController,
}: SmartWalletWatch & SmartWalletLookback): Promise<WatcherResult> => {
  await null;
  try {
    const fromBlock = await getBlockNumberBeforeRealTime(
      provider,
      publishTimeMs,
    );
    const toBlock = await provider.getBlockNumber();

    const savedFromBlock = getTxBlockLowerBound(kvStore, txId) || fromBlock;
    const savedFailedTxFromBlock =
      getTxBlockLowerBound(kvStore, txId, FAILED_TX_SCOPE) || fromBlock;

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

    // Options shared by all scans. The abort signal propagates external
    // cancellation.
    const { signal: sharedSignal } = makeAbortController(
      undefined,
      signal ? [signal] : [],
    );
    const sharedOpts = {
      provider,
      toBlock,
      chainId,
      setTimeout,
      log,
      signal: sharedSignal,
    };
    const logScanOpts = {
      ...sharedOpts,
      fromBlock: savedFromBlock,
      onRejectedChunk: (_, to) => setTxBlockLowerBound(kvStore, txId, to),
      predicate: checkMatch,
    };

    // Success path first (cheap on all chains: uses eth_getLogs).
    // v1 and v2 event signatures are scanned concurrently.
    const [v1Result, v2Result] = await Promise.all([
      scanEvmLogsInChunks({ ...logScanOpts, baseFilter: baseFilterV1 }),
      scanEvmLogsInChunks({ ...logScanOpts, baseFilter: baseFilterV2 }),
    ]);
    const matchingEvent = v1Result || v2Result;

    if (matchingEvent) {
      log(`Found matching SmartWalletCreated event`);
      deleteTxBlockLowerBound(kvStore, txId);
      deleteTxBlockLowerBound(kvStore, txId, FAILED_TX_SCOPE);
      return {
        settled: true,
        txHash: matchingEvent.transactionHash,
        success: true,
      };
    }

    // Failure path second (expensive on Arb/Ava: uses eth_getBlockReceipts).
    // Only reached when the success scan found nothing in the block range.
    const failedTx = await scanFailedTxsInChunks({
      ...sharedOpts,
      fromBlock: savedFailedTxFromBlock,
      toAddress: subscribeToAddr,
      verifyFailedTx: tx => {
        if (!tx.to) return false;
        const isFactoryPath = getAddress(tx.to) === getAddress(factoryAddr);
        const data = isFactoryPath
          ? extractFactoryExecuteData(tx.data)
          : extractDepositFactoryExecuteData(tx.data);
        return (
          !!data &&
          getAddress(data.expectedWalletAddress) === getAddress(expectedAddr) &&
          data.sourceAddress === expectedSourceAddress
        );
      },
      onRejectedChunk: (_, to) => {
        setTxBlockLowerBound(kvStore, txId, to, FAILED_TX_SCOPE);
      },
      rpcClient,
    });

    if (failedTx) {
      log(`Found matching failed transaction`);
      const receipt = await provider.getTransactionReceipt(failedTx.hash);
      if (receipt) {
        const result = await handleTxRevert(
          receipt,
          failedTx.hash,
          `expectedAddr=${expectedAddr}`,
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
      `[${PendingTxCode.WALLET_TX_NOT_FOUND}] No matching SmartWalletCreated event found`,
    );
    return { settled: false };
  } catch (error) {
    log(`Error:`, error);
    return { settled: false };
  }
};
