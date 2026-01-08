import { ethers } from 'ethers';
import type { Filter, WebSocketProvider } from 'ethers';
import type { WebSocket } from 'ws';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types.js';
import type { CaipChainId } from '@agoric/orchestration';
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import {
  getBlockNumberBeforeRealTime,
  scanEvmLogsInChunks,
} from '../support.ts';
import type { MakeAbortController, WatcherTimeoutOptions } from '../support.ts';
import { TX_TIMEOUT_MS, type WatcherResult } from '../pending-tx-manager.ts';
import {
  deleteTxBlockLowerBound,
  getTxBlockLowerBound,
  setTxBlockLowerBound,
} from '../kv-store.ts';

// Alchemy alchemy_minedTransactions subscription message types
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

/**
 * Error signatures for revert reason checking
 *
 * ContractCallFailed(string,uint256) is emitted by the Wallet contract when a user's
 * contract call fails during execution. This represents a legitimate failure where:
 * - The Axelar bridge successfully delivered the message
 * - The Wallet contract successfully authenticated the call
 * - But the user's actual contract call failed (e.g., insufficient funds, failed assertion, etc.)
 */
const CONTRACT_CALL_FAILED_ERROR = `0x${ethers
  .id('ContractCallFailed(string,uint256)')
  .slice(2, 10)}`;

// AxelarExecutable entrypoint (standard)
const WALLET_EXECUTE_ABI = [
  'function execute(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload) external',
];
const walletExecuteIface = new ethers.Interface(WALLET_EXECUTE_ABI);
const abiCoder = ethers.AbiCoder.defaultAbiCoder();

/**
 * Decode Wallet.execute(...) calldata and extract CallMessage.id from the payload.
 */
const extractTxIdFromCallData = (data: string): string | null => {
  try {
    const parsed = walletExecuteIface.parseTransaction({ data });
    if (!parsed) return null;

    const payload: string = parsed.args?.[3];
    if (!payload) return null;

    // CallMessage { string id; ContractCalls[] calls; }
    const decoded = abiCoder.decode(
      ['tuple(string id, tuple(address target, bytes data)[] calls)'],
      payload,
    );

    const id = decoded?.[0]?.id;
    return typeof id === 'string' ? id : null;
  } catch {
    return null;
  }
};

export const watchGmp = ({
  provider,
  contractAddress,
  txId,
  timeoutMs = TX_TIMEOUT_MS,
  log = () => {},
  setTimeout = globalThis.setTimeout,
  signal,
}: WatchGmp & WatcherTimeoutOptions): Promise<WatcherResult> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return resolve({ found: false });

    log(
      `Watching transaction status for txId: ${txId} at contract: ${contractAddress}`,
    );

    let done = false;
    let timeoutId: NodeJS.Timeout | undefined;
    let subId: string | null = null;

    const ws = provider.websocket as WebSocket;

    // Precompute expected topic for txId
    const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));

    const onWsError = (e: any) => {
      const errorMsg = e?.message || String(e);
      log(`WebSocket error during GMP watch for txId=${txId}: ${errorMsg}`);
      fail(new Error(`WebSocket connection error: ${errorMsg}`));
    };

    const onWsClose = (code?: number, reason?: any) => {
      if (!done) {
        const closeMsg = reason ? reason.toString() : 'Connection closed';
        log(
          `WebSocket closed during GMP watch for txId=${txId} (code=${code}, reason=${closeMsg})`,
        );
        fail(
          new Error(
            `WebSocket closed unexpectedly: ${closeMsg} (code=${code})`,
          ),
        );
      }
    };

    // Named so we can remove it
    const onAbort = () => finish({ found: false });

    const cleanupListeners = () => {
      ws.off('message', messageHandler);
      ws.off('error', onWsError);
      ws.off('close', onWsClose);
      signal?.removeEventListener('abort', onAbort);
    };

    const finish = (res: WatcherResult) => {
      if (done) return;
      done = true;

      if (timeoutId) clearTimeout(timeoutId);

      if (subId) {
        provider
          .send('eth_unsubscribe', [subId])
          .catch(e => log('Failed to unsubscribe:', e));
      }

      cleanupListeners();
      resolve(res);
    };

    /**
     * Cleanup and reject with error.
     * Used for fatal errors where we cannot continue watching (e.g., WebSocket failure,
     * subscription failure). This indicates the WATCHING failed, not that the transaction
     * failed.
     */
    const fail = (e: unknown) => {
      if (done) return;
      done = true;

      if (timeoutId) clearTimeout(timeoutId);

      if (subId) {
        provider
          .send('eth_unsubscribe', [subId])
          .catch(err =>
            log('Failed to unsubscribe during error cleanup:', err),
          );
      }

      cleanupListeners();
      reject(e);
    };

    const messageHandler = async (data: any) => {
      await null;
      if (done) return;

      try {
        let msg: AlchemySubscriptionMessage;
        try {
          msg = JSON.parse(data.toString()) as AlchemySubscriptionMessage;
        } catch {
          return;
        }

        if (msg.method !== 'eth_subscription') return;

        const tx = msg.params?.result?.transaction;
        if (!tx) return;

        const txHash = tx.hash;
        const txData = tx.input;
        if (!txHash || !txData) return;

        const extractedId = extractTxIdFromCallData(txData);
        if (extractedId !== txId) return;

        const receipt = await provider.getTransactionReceipt(txHash);
        if (!receipt) return;

        const matchingLog = receipt.logs.find(
          l =>
            l.topics?.[0] === MULTICALL_STATUS_SIGNATURE &&
            l.topics?.[1] === expectedIdTopic,
        );

        if (receipt.status === 1 && matchingLog) {
          log(
            `✅ SUCCESS: txId=${txId} txHash=${txHash} block=${receipt.blockNumber}`,
          );
          return finish({ found: true, txHash });
        }

        if (receipt.status === 0) {
          /**
           * Transaction reverted - need to determine if this is a legitimate failure
           * or a spurious execution attempt that should be ignored.
           *
           * BACKGROUND:
           * The Wallet contract uses Axelar's AxelarExecutable pattern where anyone
           * (typically Axelar relayers) can call execute() to deliver cross-chain messages.
           * However, the contract enforces ownership checks to ensure only authorized
           * callers can execute certain operations.
           *
           * REVERT SCENARIOS:
           *
           * 1. ContractCallFailed(string,uint256):
           *    - The message was successfully authenticated by Axelar
           *    - The Wallet contract accepted the call
           *    - But the user's actual contract call failed (business logic failure)
           *    - ACTION: Mark transaction as FAILED and report to user
           *
           * 2. Ownership/Authorization errors (e.g., "Ownable: caller is not the owner"):
           *    - Someone attempted to execute before the proper relayer
           *    - Or a spurious call from an unauthorized party
           *    - The legitimate execution may still succeed later
           *    - ACTION: Ignore this revert and continue watching
           *
           * REASONING:
           * We only fail the transaction if we have definitive proof that the user's
           * operation failed (ContractCallFailed). All other reverts are treated as
           * spurious execution attempts that don't represent the final transaction state.
           */
          try {
            // Replay the transaction to get the revert reason
            await provider.call({
              to: tx.to,
              from: tx.from,
              data: txData,
            });
          } catch (error: any) {
            const revertData = error?.data || error?.error?.data;

            // Check if revert reason starts with ContractCallFailed selector
            if (
              revertData &&
              revertData.startsWith(CONTRACT_CALL_FAILED_ERROR)
            ) {
              // This is a legitimate failure from the user's contract call
              log(
                `❌ REVERTED: txId=${txId} txHash=${txHash} block=${receipt.blockNumber} (ContractCallFailed - user operation failed)`,
              );
              return finish({ found: true, txHash });
            } else {
              // Different revert reason - likely spurious execution attempt
              // Log for observability but continue watching for the legitimate execution
              log(
                `⚠️  IGNORED REVERT: txId=${txId} txHash=${txHash} block=${
                  receipt.blockNumber
                } reason=${revertData?.slice(0, 10) || 'unknown'} - likely spurious execution, continuing to watch`,
              );
            }
          }
        }
      } catch (e) {
        log(
          `Error processing WebSocket message for txId=${txId}:`,
          e instanceof Error ? e.message : String(e),
        );
      }
    };

    const subscribe = async () => {
      await provider.getNetwork();

      subId = await provider.send('eth_subscribe', [
        'alchemy_minedTransactions',
        {
          addresses: [{ to: contractAddress }],
          includeRemoved: false,
          hashesOnly: false,
        },
      ]);

      ws.on('message', messageHandler);
    };

    // Attach listeners (all removable)
    ws.on('error', onWsError);
    ws.on('close', onWsClose);
    signal?.addEventListener('abort', onAbort);

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

export const EVENTS = {
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
}): Promise<WatcherResult> => {
  await null;
  try {
    const fromBlock = await getBlockNumberBeforeRealTime(
      provider,
      publishTimeMs,
    );
    const toBlock = await provider.getBlockNumber();

    const statusEventLowerBound =
      getTxBlockLowerBound(kvStore, txId, EVENTS.MULTICALL_STATUS) || fromBlock;

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
      setTxBlockLowerBound(kvStore, txId, to, EVENTS.MULTICALL_STATUS);

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
      deleteTxBlockLowerBound(kvStore, txId, EVENTS.MULTICALL_STATUS);
      return { found: true, txHash: matchingEvent.transactionHash };
    }

    log(`No matching MulticallStatus or MulticallExecuted found`);
    return { found: false };
  } catch (error) {
    log(`Error:`, error);
    return { found: false };
  }
};
