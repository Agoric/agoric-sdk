import { WebSocketProvider, Log, toQuantity, isError } from 'ethers';
import type { Filter, TransactionResponse } from 'ethers';
import type { CaipChainId } from '@agoric/orchestration';
import { makeWorkPool } from '@agoric/internal/src/work-pool.js';
import { makePromiseKit } from '@endo/promise-kit';
import { JSONRPCClient, createJSONRPCRequest } from 'json-rpc-2.0';
import type { JSONRPCResponse } from 'json-rpc-2.0';
import { getBlockTimeMs, type HexAddress } from './support.ts';

export type WatcherTimeoutOptions = {
  timeoutMs?: number;
  setTimeout?: typeof globalThis.setTimeout;
  signal?: AbortSignal;
};

/**
 * Chains where Alchemy supports the `trace_filter` RPC method for
 * server-side filtering of transaction traces. On these chains we prefer
 * trace_filter over eth_getBlockReceipts because it filters by toAddress
 * server-side and includes calldata, avoiding extra RPC round-trips.
 *
 * Cost comparison (10-block scan, CU = Compute Units):
 * - eth_getBlockReceipts: 200 CU + 20 CU/match (for eth_getTransactionByHash)
 * - trace_filter:          40 CU (calldata included, no extra calls needed)
 *
 * Not supported: Arbitrum (arbtrace_filter is pre-Nitro only, < block
 * 22,207,815), Avalanche.
 *
 * @see https://www.alchemy.com/docs/reference/compute-unit-costs
 * @see https://www.alchemy.com/docs/reference/what-is-trace_filter
 */
const traceFilterSupportedChains: ReadonlySet<CaipChainId> = new Set([
  // ========= Mainnet =========
  'eip155:1', // Ethereum
  'eip155:8453', // Base
  'eip155:10', // Optimism

  // ========= Testnet =========
  'eip155:11155111', // Ethereum Sepolia
  'eip155:84532', // Base Sepolia
  'eip155:11155420', // Optimism Sepolia
]);

// XXX This can move to ./utils.ts.
type BinarySearch = {
  (
    start: number,
    end: number,
    isAcceptable: (idx: number) => Promise<boolean> | boolean,
  ): Promise<number>;
  (
    start: bigint,
    end: bigint,
    isAcceptable: (idx: bigint) => Promise<boolean> | boolean,
  ): Promise<bigint>;
};

/**
 * Generic binary search helper for finding the greatest value that satisfies a predicate.
 * Assumes a transition from acceptance to rejection somewhere in [start, end].
 *
 * @param start - Starting value (inclusive)
 * @param end - Ending value (inclusive)
 * @param isAcceptable - Function that returns true for accepted values
 * @returns The greatest accepted value in the range
 */
export const binarySearch = (async <Index extends number | bigint>(
  start: Index,
  end: Index,
  isAcceptable: (idx: Index) => Promise<boolean> | boolean,
): Promise<Index> => {
  const unit = (typeof start === 'bigint' ? 1n : 1) as Index;
  let left: Index = start;
  let right: Index = end;
  let greatestFound: Index = left;
  await null;
  while (left <= right) {
    // Calculate the number or bigint midpoint of `left` and `right` by halving
    // their sum with a single-bit right shift (skipped if the sum is already
    // zero).
    const sum = ((left as any) + (right as any)) as Index;
    // eslint-disable-next-line no-bitwise
    const mid = (sum && sum >> unit) as Index;
    if (await isAcceptable(mid)) {
      greatestFound = mid;
      left = mid + (unit as any);
    } else {
      right = (mid - unit) as any;
    }
  }
  return greatestFound;
}) as BinarySearch;

/**
 * Returns the highest block number whose real time (i.e., published timestamp
 * as adjusted by clock skew of up to fudgeFactorMs) is known to be less than or
 * equal to targetMs.
 */
export const getBlockNumberBeforeRealTime = async (
  provider: WebSocketProvider,
  targetMs: number,
  {
    fudgeFactorMs = 5 * 60 * 1000, // 5 minutes to account for cross-chain clock differences
    meanBlockDurationMs,
  }: {
    fudgeFactorMs?: number;
    meanBlockDurationMs?: number;
  } = {},
) => {
  const posixSeconds = Math.floor((targetMs - fudgeFactorMs) / 1000);

  // Try to find a good starting point.
  let startNumber = 0;
  const latestNumber = await provider.getBlockNumber();
  const latestBlock = await provider.getBlock(latestNumber);
  const deltaSec = latestBlock!.timestamp - posixSeconds;
  if (deltaSec <= 0) return latestNumber;
  if (deltaSec > 0 && meanBlockDurationMs) {
    const deltaBlocks = Math.ceil(deltaSec / (meanBlockDurationMs / 1000));
    const pastNumber = latestNumber - deltaBlocks * 2;
    if (startNumber < pastNumber) {
      const pastBlock = await provider.getBlock(pastNumber);
      if (pastBlock?.timestamp && pastBlock.timestamp <= posixSeconds) {
        startNumber = pastNumber;
      }
    }
  }

  const blockNumber = await binarySearch(startNumber, latestNumber, async n => {
    const block = await provider.getBlock(n);
    return block?.timestamp ? block.timestamp <= posixSeconds : false;
  });
  return blockNumber;
};

/**
 * Detect Alchemy 429 "compute units per second" rate-limit errors
 * surfaced by ethers as `UNKNOWN_ERROR` with a `"code": 429` payload.
 *
 * @see https://docs.alchemy.com/reference/throughput
 */
const isRateLimitError = (err: unknown): boolean =>
  isError(err, 'UNKNOWN_ERROR') &&
  (err as { error?: { code?: number } }).error?.code === 429;

const RATE_LIMIT_BACKOFF_MS = 1_000;
const MAX_RATE_LIMIT_RETRIES = 3;

type LogPredicate = (log: Log) => boolean | Promise<boolean>;

type FailedTxPredicate = (
  tx: TransactionResponse,
  receipt: TxReceipt,
) => boolean | Promise<boolean>;

type ScanOptsBase = {
  provider: WebSocketProvider;
  fromBlock: number;
  toBlock: number;
  chainId: CaipChainId;
  setTimeout: typeof globalThis.setTimeout;
  chunkSize?: number;
  log?: (...args: unknown[]) => void;
  signal?: AbortSignal;
  onRejectedChunk?: (
    startBlock: number,
    endBlock: number,
  ) => Promise<void> | void;
};

type LogScanOpts = ScanOptsBase & {
  baseFilter: Omit<Filter, 'fromBlock' | 'toBlock'> & Partial<Filter>;
  predicate: LogPredicate;
};

// https://www.alchemy.com/docs/chains/ethereum/ethereum-api-endpoints/eth-get-block-receipts
type TxReceipt = {
  transactionHash: `0x${string}`;
  status: '0x0' | '0x1' | null;
  to: HexAddress | null;
};

type FailedTxScanOpts = ScanOptsBase & {
  toAddress: string;
  verifyFailedTx: FailedTxPredicate;
  rpcClient: JSONRPCClient;
};

// https://www.alchemy.com/docs/reference/what-are-evm-traces#the-solution-evm-traces
// https://reth.rs/jsonrpc/trace/
type CallTraceResultBase = {
  type: string;
  action: unknown;
  blockNumber: number;
  transactionHash: `0x${string}`;
  error?: string;
  subtraces: number;
  traceAddress: number[];
};

// https://www.alchemy.com/docs/reference/what-are-evm-traces#call
type CallTraceAction = {
  from: HexAddress;
  to: HexAddress;
  input: `0x${string}`;
  value: `0x${string}`;
  gas: `0x${string}`;
  callType: 'call' | 'delegatecall' | 'callcode' | 'staticcall';
};

type CallTraceResult = CallTraceResultBase & {
  type: 'call';
  action: CallTraceAction;
};

/**
 * Create a {@link JSONRPCClient} backed by HTTP POST via the given `fetch`.
 *
 * Use this instead of passing raw `fetch` + `rpcUrl` to downstream functions
 * so that callees only receive the constrained JSON-RPC interface.
 */
export const makeJsonRpcClient = (
  fetch: typeof globalThis.fetch,
  rpcUrl: string,
): JSONRPCClient => {
  const client: JSONRPCClient = new JSONRPCClient(async payload => {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    client.receive(await res.json());
  });
  return client;
};

/**
 * Fetches block receipts in batch using eth_getBlockReceipts RPC method.
 * This function cannot use an ethers provider because ethers does not support
 * batching of this method.
 *
 * @param start - Start block number (inclusive)
 * @param end - End block number (inclusive)
 * @param client - JSON-RPC batch client
 * @returns Array of TxReceipt objects for the requested blocks
 */
const getTxReceiptsBatch = async (
  start: number,
  end: number,
  client: JSONRPCClient,
  log?: (...args: unknown[]) => void,
): Promise<TxReceipt[]> => {
  const requests = Array.from({ length: end - start + 1 }, (_, i) =>
    createJSONRPCRequest(i + 1, 'eth_getBlockReceipts', [
      toQuantity(start + i),
    ]),
  );
  const responses: JSONRPCResponse[] = await client.requestAdvanced(requests);

  const errors = responses.filter(r => r.error);
  if (errors.length > 0) {
    log?.(
      `[FailedTxScan] eth_getBlockReceipts returned ${errors.length}/${responses.length} errors for blocks ${start}–${end}:`,
      errors[0],
    );
  }

  return responses.flatMap(r => (r.result ?? []) as TxReceipt[]);
};

/**
 * Efficiently fetches traces for EVM transactions regardless of their
 * success/failure status.
 * Uses the `trace_filter` RPC method, which employs server-side filtering and
 * includes calldata in the response, avoiding extra round-trips.
 * https://www.alchemy.com/docs/reference/what-is-trace_filter
 */
const getTraces = async (
  fromBlock: string,
  toBlock: string,
  toAddress: string,
  provider: WebSocketProvider,
): Promise<CallTraceResult[]> => {
  const result: CallTraceResult[] | null = await provider.send('trace_filter', [
    { fromBlock, toBlock, toAddress: [toAddress] },
  ]);
  return result ?? [];
};

type ScanInChunksOpts<T> = {
  provider: WebSocketProvider;
  fromBlock: number;
  toBlock: number;
  chainId: CaipChainId;
  setTimeout: typeof globalThis.setTimeout;
  chunkSize: number;
  scanChunk: (start: number, end: number) => Promise<T | undefined>;
  label: string;
  log?: (...args: unknown[]) => void;
  signal?: AbortSignal;
  onRejectedChunk?: (
    startBlock: number,
    endBlock: number,
  ) => Promise<void> | void;
};

/**
 * Generic chunked block scanner: scans [fromBlock, toBlock] in chunkSize
 * windows, delegating per-chunk work to the caller-supplied `scanChunk`
 * callback. Handles chain-wait, rate-limit retry, and abort signals.
 */
const scanEvmBlocksInChunks = async <T>(
  opts: ScanInChunksOpts<T>,
): Promise<T | undefined> => {
  const {
    provider,
    fromBlock,
    toBlock,
    chainId,
    setTimeout,
    chunkSize,
    scanChunk,
    label,
    log = () => {},
    signal,
  } = opts;

  const blockTimeMs = getBlockTimeMs(chainId);
  await null;
  let rateLimitRetries = 0;
  for (let currentBlock = -Infinity, start = fromBlock; start <= toBlock; ) {
    if (signal?.aborted) {
      log(`[${label}] Aborted`);
      return undefined;
    }
    const end = Math.min(start + chunkSize - 1, toBlock);

    try {
      // Wait for the chain to catch up if end block doesn't exist yet
      if (end > currentBlock) currentBlock = await provider.getBlockNumber();
      if (end > currentBlock) {
        const blocksToWait = Math.max(50, chunkSize);
        const waitTimeMs = blocksToWait * blockTimeMs;
        const blocksBehind = end - currentBlock;
        log(
          `[${label}] Chain ${blocksBehind} blocks behind (need ${end}, at ${currentBlock}). Waiting ${waitTimeMs}ms (${blocksToWait} blocks @ ${blockTimeMs}ms/block)`,
        );
        await new Promise(resolve => setTimeout(resolve, waitTimeMs));
        continue; // Retry this chunk after waiting
      }

      log(`[${label}] Searching chunk ${start} → ${end}`);
      const result = await scanChunk(start, end);
      if (result) return result;
      await opts.onRejectedChunk?.(start, end);
      rateLimitRetries = 0;
    } catch (err) {
      if (isRateLimitError(err) && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
        rateLimitRetries += 1;
        const backoffMs = RATE_LIMIT_BACKOFF_MS * rateLimitRetries;
        log(
          `[${label}] Rate limited on chunk ${start}–${end}, retry ${rateLimitRetries}/${MAX_RATE_LIMIT_RETRIES} after ${backoffMs}ms`,
        );
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        continue; // Retry same chunk
      }
      log(`[${label}] Error in chunk ${start}–${end}:`, err);
      rateLimitRetries = 0;
    }

    start += chunkSize;
  }
  return undefined;
};

/**
 * Chunked log scanner: scans [fromBlock, toBlock] in windows of size chunkSize,
 * runs `predicate` on each log, and returns the first matching log or undefined.
 */
export const scanEvmLogsInChunks = async (
  opts: LogScanOpts,
): Promise<Log | undefined> => {
  const {
    provider,
    baseFilter,
    chunkSize = 10,
    log = () => {},
    predicate,
    ...rest
  } = opts;

  return scanEvmBlocksInChunks<Log>({
    ...rest,
    provider,
    chunkSize,
    log,
    label: 'LogScan',
    scanChunk: async (start, end) => {
      const chunkFilter: Filter = {
        ...baseFilter,
        fromBlock: start,
        toBlock: end,
      };
      const logs = await provider.getLogs(chunkFilter);
      for (const evt of logs) {
        if (await predicate(evt)) {
          log(`[LogScan] Match in tx=${evt.transactionHash}`);
          return evt;
        }
      }
    },
  });
};

/**
 * Scan a block range for reverted transactions to `toAddress` using
 * eth_getBlockReceipts, returning the first one accepted by `verifyFailedTx`.
 *
 * Used where Alchemy does not support trace_filter (as of 2026-02, Arbitrum and
 * Avalanche).
 * Downloads ALL receipts for each block, filters client-side by toAddress
 * and status, then makes a separate getTransaction call to retrieve
 * calldata for verification.
 *
 * Cost per 10-block chunk: 200 CU + 20 CU/match.
 */
const scanChunkTxReceiptsForFailedTx = async (
  start: number,
  end: number,
  opts: FailedTxScanOpts,
): Promise<TransactionResponse | undefined> => {
  const { provider, toAddress, verifyFailedTx, rpcClient } = opts;

  const receipts = await getTxReceiptsBatch(start, end, rpcClient, opts.log);

  const { promise, resolve, reject } = makePromiseKit<
    TransactionResponse | undefined
  >();
  let isDone = false;
  const scanner = makeWorkPool(receipts, undefined, async receipt => {
    if (isDone) return;
    const { transactionHash, status, to } = receipt;

    if (!to || to.toLowerCase() !== toAddress.toLowerCase()) return;

    // We only care about failed transactions.
    if (status !== '0x0') return;

    opts.log?.(
      `[FailedTxScan] Candidate failed tx ${transactionHash} (status=${status})`,
    );

    const tx = await provider.getTransaction(transactionHash);
    if (!tx) {
      opts.log?.(
        `[FailedTxScan] tx ${transactionHash} not found (possible reorg), skipping`,
      );
      return;
    }
    if (await verifyFailedTx(tx, receipt)) {
      resolve(tx);
      isDone = true;
    } else {
      opts.log?.(
        `[FailedTxScan] tx ${transactionHash} failed verifyFailedTx check`,
      );
    }
  });
  scanner.done.then(
    () => resolve(undefined),
    err => reject(err),
  );
  return promise;
};

/**
 * Scan a block range for reverted transactions to `toAddress` using
 * trace_filter, returning the first one accepted by `verifyFailedTx`.
 *
 * Used where Alchemy supports trace_filter (as of 2026-02, Ethereum, Base, and
 * Optimism).
 * Filters by toAddress server-side and includes calldata (action.input)
 * in the response, so no separate getTransaction call is needed.
 *
 * Cost per call: 40 CU (covers the entire chunk range).
 */
const scanChunkTracesForFailedTx = async (
  start: number,
  end: number,
  opts: FailedTxScanOpts,
): Promise<TransactionResponse | undefined> => {
  const { provider, toAddress, verifyFailedTx } = opts;

  const traces = await getTraces(
    toQuantity(start),
    toQuantity(end),
    toAddress,
    provider,
  );

  const failedTopLevel = traces.filter(
    t => t.traceAddress.length === 0 && t.error,
  );
  opts.log?.(
    `[FailedTxScan] blocks ${start}–${end}: ${traces.length} traces, ${failedTopLevel.length} failed top-level to ${toAddress}`,
  );

  for (const trace of failedTopLevel) {
    // Construct objects compatible with the verifyFailedTx callback.
    // Callers only access .hash, .to, and .data on the tx object.
    const syntheticTx = {
      hash: trace.transactionHash,
      to: trace.action.to,
      data: trace.action.input,
    } as TransactionResponse;

    const syntheticReceipt: TxReceipt = {
      transactionHash: trace.transactionHash,
      status: '0x0',
      to: trace.action.to,
    };

    opts.log?.(
      `[FailedTxScan] Candidate failed tx ${trace.transactionHash} (error=${trace.error})`,
    );

    if (await verifyFailedTx(syntheticTx, syntheticReceipt)) {
      return syntheticTx;
    } else {
      opts.log?.(
        `[FailedTxScan] tx ${trace.transactionHash} failed verifyFailedTx check`,
      );
    }
  }
  return undefined;
};

const TRACE_FILTER_CHUNK_SIZE = 100;
const BLOCK_RECEIPTS_CHUNK_SIZE = 10;

/**
 * Chunked scanner for failed transactions.
 *
 * Scans [fromBlock, toBlock] in chunk windows looking for reverted
 * transactions sent to `toAddress`, then validates each candidate with
 * the caller-supplied `verifyFailedTx` predicate.
 *
 * Two strategies are used depending on chain support:
 *
 * | Strategy             | Chains (as of 2026-02)        | CU (10 blocks) |
 * |----------------------|-------------------------------|----------------|
 * | trace_filter         | Ethereum, Base, Optimism      | 40             |
 * | eth_getBlockReceipts | Arbitrum, Avalanche           | 200 + 20/match |
 *
 * trace_filter is preferred where available because it filters by toAddress
 * server-side and includes calldata, avoiding per-block receipt downloads
 * and extra getTransaction round-trips. Arbitrum's arbtrace_filter only
 * covers pre-Nitro blocks (< 22,207,815) so is not usable for recent
 * transaction scanning. Avalanche has no trace_filter support.
 *
 * @see https://www.alchemy.com/docs/reference/compute-unit-costs
 * @see https://www.alchemy.com/docs/reference/what-is-trace_filter
 */
export const scanFailedTxsInChunks = async (
  opts: FailedTxScanOpts,
): Promise<TransactionResponse | undefined> => {
  await null;

  const {
    chainId,
    chunkSize: requestedChunkSize,
    log = () => {},
    ...rest
  } = opts;

  const useTraceFilter = traceFilterSupportedChains.has(chainId);
  const chunkSize =
    requestedChunkSize ??
    (useTraceFilter ? TRACE_FILTER_CHUNK_SIZE : BLOCK_RECEIPTS_CHUNK_SIZE);
  const innerScanChunk = useTraceFilter
    ? scanChunkTracesForFailedTx
    : scanChunkTxReceiptsForFailedTx;

  log(
    `[FailedTxScan] Scanning ${rest.fromBlock} → ${rest.toBlock} using ${useTraceFilter ? 'trace_filter' : 'eth_getTxReceipts'} (chunk=${chunkSize})`,
  );

  return scanEvmBlocksInChunks<TransactionResponse>({
    ...rest,
    chainId,
    chunkSize,
    log,
    label: 'FailedTxScan',
    scanChunk: async (start, end) => {
      const result = await innerScanChunk(start, end, opts);
      if (result) {
        log(`[FailedTxScan] Match in tx=${result.hash}`);
      }
      return result;
    },
  });
};

export const waitForBlock = async (
  provider: WebSocketProvider,
  targetBlock: number,
) => {
  return new Promise(resolve => {
    const listener = blockNumber => {
      if (blockNumber >= targetBlock) {
        void provider.off('block', listener);
        resolve(blockNumber);
      }
    };
    void provider.on('block', listener);
  });
};
