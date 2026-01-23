import { ethers } from 'ethers';
import type { Filter, WebSocketProvider } from 'ethers';
import type { WebSocket } from 'ws';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types.js';
import type { CaipChainId } from '@agoric/orchestration';
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import { tryJsonParse } from '@agoric/internal';
import {
  getBlockNumberBeforeRealTime,
  getConfirmationsRequired,
  scanEvmLogsInChunks,
} from '../support.ts';
import type { MakeAbortController, WatcherTimeoutOptions } from '../support.ts';
import { TX_TIMEOUT_MS, type WatcherResult } from '../pending-tx-manager.ts';
import {
  deleteTxBlockLowerBound,
  getTxBlockLowerBound,
  setTxBlockLowerBound,
} from '../kv-store.ts';

//#region Alchemy alchemy_minedTransactions subscription types
// See https://docs.alchemy.com/reference/alchemy-minedtransactions
type AlchemyMinedTransaction = {
  blockHash: string;
  blockNumber: string;
  hash: string;
  from: string;
  gas: string;
  gasPrice: string;
  input: string;
  nonce: string;
  to: string | null;
  transactionIndex: string;
  type: string;
  value: string;
  // ECDSA signature fields
  r?: string;
  s?: string;
  v?: string;
  // EIP-1559 fields
  maxPriorityFeePerGas?: string;
  maxFeePerGas?: string;
};

type AlchemySubscriptionMessage = {
  jsonrpc: '2.0';
  method: 'eth_subscription';
  params: {
    result: {
      removed: boolean;
      transaction: AlchemyMinedTransaction;
    };
    subscription: string;
  };
};
//#endregion

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
};

// AxelarExecutable entrypoint (standard)
// See https://docs.axelar.dev/dev/general-message-passing/executable
// Note: Using _ABI_TEXT suffix for human-readable string format
const WALLET_EXECUTE_CONTRACT_ABI_TEXT = [
  'function execute(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload) external',
];
const walletExecuteIface = new ethers.Interface(
  WALLET_EXECUTE_CONTRACT_ABI_TEXT,
);
const abiCoder = ethers.AbiCoder.defaultAbiCoder();

/**
 * Decode Wallet.execute(...) calldata and extract CallMessage.id from the payload
 * and sourceAddress from the execute() parameters.
 *
 * @returns Object with txId and sourceAddress, or null if parsing fails
 */
const extractExecuteData = (
  data: string,
): { txId: string; sourceAddress: string } | null => {
  try {
    const parsed = walletExecuteIface.parseTransaction({ data });
    if (!parsed) return null;

    // execute(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload)
    const [_commandId, _sourceChain, sourceAddress, payload] = parsed.args;
    if (!sourceAddress || !payload) return null;

    // CallMessage { string id; ContractCalls[] calls; }
    const [decoded] = abiCoder.decode(
      ['tuple(string id, tuple(address target, bytes data)[] calls)'],
      payload,
    );

    const txId = decoded?.id;
    if (typeof txId !== 'string') return null;

    return { txId, sourceAddress };
  } catch {
    return null;
  }
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

        const executeData = extractExecuteData(txData);
        if (!executeData || executeData.txId !== txId) return;

        if (executeData.sourceAddress !== expectedSourceAddress) {
          log(
            `⚠️  IGNORED: txId=${txId} txHash=${txHash} - sourceAddress mismatch (expected ${expectedSourceAddress}, got ${executeData.sourceAddress})`,
          );
          return;
        }

        // Wait for confirmations to ensure finality and prevent reorg issues
        const confirmations = getConfirmationsRequired(chainId);
        const receipt = await provider.waitForTransaction(
          txHash,
          confirmations,
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
          log(
            `✅ SUCCESS (${confirmations} confirmations): txId=${txId} txHash=${txHash} block=${receipt.blockNumber}`,
          );
          return finish({ settled: true, txHash, success: true });
        }

        if (receipt.status === 0) {
          /**
           * Transaction reverted - since we've already validated that the sourceAddress
           * matches our expected LCA address, this is a legitimate execution attempt
           * from our own wallet that failed. We treat this as a transaction failure.
           *
           * Note: Spurious executions from unauthorized parties are already filtered
           * out by the sourceAddress check above, so any revert we see here represents
           * a genuine failure of the user's operation.
           */
          log(
            `❌ REVERTED (${confirmations} confirmations): txId=${txId} txHash=${txHash} block=${receipt.blockNumber} - transaction failed`,
          );
          return finish({ settled: true, txHash, success: false });
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
          `✗ No transaction status found for txId ${txId} within ${
            timeoutMs / 60000
          } minutes`,
        );
      }
    }, timeoutMs);
  });
};

export const MULTICALL_STATUS_EVENT = 'status';

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
}): Promise<WatcherResult> => {
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

    const matchingEvent = await scanEvmLogsInChunks(
      {
        ...baseScanOpts,
        baseFilter: statusFilter,
        fromBlock: statusEventLowerBound,
        onRejectedChunk: updateStatusEventLowerBound,
      },
      isMatch,
    );

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

    log(`No matching MulticallStatus or MulticallExecuted found`);
    return { settled: false };
  } catch (error) {
    log(`Error:`, error);
    return { settled: false };
  }
};
