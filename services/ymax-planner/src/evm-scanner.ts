import { WebSocketProvider, Log, toQuantity, isError } from 'ethers';
import type { Filter, TransactionReceipt, TransactionResponse } from 'ethers';
import type { Address as EvmAddress } from 'viem';
import type { CaipChainId } from '@agoric/orchestration';
import {
  getBlockTimeMs,
  prepareAbortController,
  type ReconnectingEvmProvider,
} from './support.ts';
import { WatcherTransportError } from './errors.ts';

export const DEFAULT_CONFIRMATION_POLL_INTERVAL_MS = 5_000;

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
 * Per-call timeout. A zombie socket (open but neither responding nor faulting)
 * makes a request/response call hang indefinitely; bounding it turns that
 * silent stall into a fast, retryable {@link WatcherTransportError} and reports
 * the socket as unhealthy so it gets reconnected (see PAK-517).
 */
export const RPC_CALL_TIMEOUT_MS = 20_000;

/**
 * A provider facade whose methods retry on Alchemy 429 rate-limit errors
 * (exponential backoff with jitter) and are bounded by a per-call timeout.
 *
 * It delegates to the {@link ReconnectingEvmProvider}'s *current* provider on every
 * call, so after a reconnect the facade (held by long-lived watchers) keeps
 * working against the fresh socket.
 */
export const makeEvmRpc = (
  reconnectingProvider: ReconnectingEvmProvider,
  setTimeout: typeof globalThis.setTimeout,
  {
    timeoutMs = RPC_CALL_TIMEOUT_MS,
    log = (..._args: unknown[]) => {},
  }: { timeoutMs?: number; log?: (...args: unknown[]) => void } = {},
): Pick<
  WebSocketProvider,
  | 'getBlockNumber'
  | 'getNetwork'
  | 'getTransactionReceipt'
  | 'send'
  | 'on'
  | 'off'
  | 'websocket'
> & {
  getBlock: (n: number) => ReturnType<WebSocketProvider['getBlock']>;
  getLogs: (filter: Filter) => ReturnType<WebSocketProvider['getLogs']>;
} => {
  const withTimeout = <T>(label: string, op: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        log(`RPC ${label} timed out after ${timeoutMs}ms; cycling socket`);
        reconnectingProvider.reportUnhealthy(`${label} timeout`);
        reject(
          new WatcherTransportError(
            `RPC ${label} timed out after ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);
      op().then(
        value => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        err => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        },
      );
    });

  const call = <T>(label: string, op: () => Promise<T>): Promise<T> =>
    withRateLimitRetry(() => withTimeout(label, op), setTimeout);

  const p = () => reconnectingProvider.getProvider();

  return {
    // RPC calls with rate-limit retry and per-call timeout
    getBlock: (n: number) => call('getBlock', () => p().getBlock(n)),
    getBlockNumber: () => call('getBlockNumber', () => p().getBlockNumber()),
    getLogs: (filter: Filter) => call('getLogs', () => p().getLogs(filter)),
    getNetwork: () => call('getNetwork', () => p().getNetwork()),
    getTransactionReceipt: (txHash: string) =>
      call('getTransactionReceipt', () => p().getTransactionReceipt(txHash)),
    send: (...args: Parameters<WebSocketProvider['send']>) =>
      call('send', () => p().send(...args)),
    // Subscription pass-throughs (delegate to the current provider; no retry)
    on: ((...args: Parameters<WebSocketProvider['on']>) =>
      p().on(...args)) as WebSocketProvider['on'],
    off: ((...args: Parameters<WebSocketProvider['off']>) =>
      p().off(...args)) as WebSocketProvider['off'],
    get websocket() {
      return reconnectingProvider.websocket;
    },
  };
};

export type EvmRpc = ReturnType<typeof makeEvmRpc>;

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
  rpc: EvmRpc,
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
  const latestNumber = await rpc.getBlockNumber();
  const latestBlock = await rpc.getBlock(latestNumber);
  const deltaSec = latestBlock!.timestamp - posixSeconds;
  if (deltaSec <= 0) return latestNumber;
  if (deltaSec > 0 && meanBlockDurationMs) {
    const deltaBlocks = Math.ceil(deltaSec / (meanBlockDurationMs / 1000));
    const pastNumber = latestNumber - deltaBlocks * 2;
    if (startNumber < pastNumber) {
      const pastBlock = await rpc.getBlock(pastNumber);
      if (pastBlock?.timestamp && pastBlock.timestamp <= posixSeconds) {
        startNumber = pastNumber;
      }
    }
  }

  const blockNumber = await binarySearch(startNumber, latestNumber, async n => {
    const block = await rpc.getBlock(n);
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

/**
 * Alchemy-recommended retry parameters for 429 rate-limit errors.
 * Uses exponential backoff with jitter:
 *   delay = min(2^attempt * minTimeout + random(0..1000), maxTimeout)
 *
 * @see https://www.alchemy.com/docs/how-to-implement-retries
 */
const RATE_LIMIT_RETRIES = 5;
const RATE_LIMIT_MIN_TIMEOUT_MS = 1_000;
const RATE_LIMIT_MAX_TIMEOUT_MS = 60_000;
const RATE_LIMIT_FACTOR = 2;

/** Compute exponential backoff delay with jitter for a given attempt. */
const rateLimitBackoffMs = (attempt: number): number => {
  const jitter = Math.random() * 1000;
  return Math.min(
    RATE_LIMIT_FACTOR ** attempt * RATE_LIMIT_MIN_TIMEOUT_MS + jitter,
    RATE_LIMIT_MAX_TIMEOUT_MS,
  );
};

/**
 * Retry a provider call on Alchemy 429 rate-limit errors using exponential
 * backoff with jitter, per Alchemy's recommended strategy.
 *
 * @see https://www.alchemy.com/docs/how-to-implement-retries
 */
export const withRateLimitRetry = async <T>(
  fn: () => Promise<T>,
  setTimeout: typeof globalThis.setTimeout = globalThis.setTimeout,
): Promise<T> => {
  await null;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      if (!isRateLimitError(err) || attempt >= RATE_LIMIT_RETRIES) throw err;
      const delay = rateLimitBackoffMs(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/** Common configuration for all chunk-based EVM chain scanning. */
type ScanOptsBase = {
  provider: EvmRpc;
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

// https://www.alchemy.com/docs/chains/ethereum/ethereum-api-endpoints/eth-get-block-receipts
type TxReceipt = {
  transactionHash: `0x${string}`;
  status: '0x0' | '0x1' | null;
  to: EvmAddress | null;
};

/**
 * LogScanOpts relies upon eth_getFilterLogs and a Log-matching predicate.
 * https://ethereum.github.io/execution-apis/api/methods/eth_getLogs
 */
type LogScanOpts = ScanOptsBase & {
  baseFilter: Partial<Omit<Filter, 'fromBlock' | 'toBlock'>>;
  predicate: (log: Log) => boolean | Promise<boolean>;
};

/**
 * FailedTxScanOpts is limited to a particular recipient address and a
 * transaction-matching predicate.
 */
type FailedTxScanOpts = ScanOptsBase & {
  toAddress: string;
  verifyFailedTx: (
    tx: TransactionResponse,
    receipt: TxReceipt,
  ) => boolean | Promise<boolean>;
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
  from: EvmAddress;
  to: EvmAddress;
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
  rpc: EvmRpc,
): Promise<CallTraceResult[]> => {
  const result: CallTraceResult[] | null = await rpc.send('trace_filter', [
    { fromBlock, toBlock, toAddress: [toAddress] },
  ]);
  return result ?? [];
};

/**
 * Running a scan requires chunkSize and a concrete
 * implementation for processing each [start, end] chunk.
 */
type ScanInChunksOpts<T> = ScanOptsBase & {
  chunkSize: number;
  scanChunk: (start: number, end: number) => Promise<T | undefined>;
  label: string;
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
    } catch (err) {
      // Rate-limit retries are handled by EvmRpc; only log here.
      log(`[${label}] Error in chunk ${start}–${end}:`, err);
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
      return undefined;
    },
  });
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

/**
 * Chunked scanner for failed transactions using the `trace_filter` RPC method.
 *
 * Scans [fromBlock, toBlock] in chunk windows looking for reverted
 * transactions sent to `toAddress`, then validates each candidate with
 * the caller-supplied `verifyFailedTx` predicate.
 *
 * Only supported on chains where Alchemy provides `trace_filter`
 * (Ethereum, Base, Optimism). Returns `undefined` immediately for
 * unsupported chains (Arbitrum, Avalanche).
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

  if (!traceFilterSupportedChains.has(chainId)) {
    log(
      `[FailedTxScan] Skipping failed tx scan for ${chainId} (trace_filter not supported)`,
    );
    return undefined;
  }

  const chunkSize = requestedChunkSize ?? TRACE_FILTER_CHUNK_SIZE;

  log(
    `[FailedTxScan] Scanning ${rest.fromBlock} → ${rest.toBlock} using trace_filter (chunk=${chunkSize})`,
  );

  return scanEvmBlocksInChunks<TransactionResponse>({
    ...rest,
    chainId,
    chunkSize,
    log,
    label: 'FailedTxScan',
    scanChunk: async (start, end) => {
      const result = await scanChunkTracesForFailedTx(start, end, opts);
      if (result) {
        log(`[FailedTxScan] Match in tx=${result.hash}`);
      }
      return result;
    },
  });
};

export const waitForBlock = async (provider: EvmRpc, targetBlock: number) => {
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

export type WaitForConfirmationsOpts = {
  provider: EvmRpc;
  txHash: string;
  minConfirmations: number;
  /** For avoiding intermediate RPC requests while awaiting confirmations. */
  meanBlockTimeMs: number;
  /** The minimum amount of time to wait between RPC requests. */
  pollIntervalMs?: number;
  signal?: AbortSignal;
  setTimeout: typeof globalThis.setTimeout;
  log?: (...args: unknown[]) => void;
};

export const waitForConfirmations = async ({
  provider,
  txHash,
  minConfirmations,
  meanBlockTimeMs,
  pollIntervalMs = DEFAULT_CONFIRMATION_POLL_INTERVAL_MS,
  signal,
  setTimeout,
  log = () => {},
}: WaitForConfirmationsOpts): Promise<TransactionReceipt | null> => {
  const makeAbortController = prepareAbortController({ setTimeout });

  await null;
  let everSeenReceipt = false;
  while (true) {
    if (signal?.aborted) return null;

    let sleepMs = pollIntervalMs;
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt) {
      everSeenReceipt = true;
      const currentBlock = await provider.getBlockNumber();
      const confirmationCount = currentBlock - receipt.blockNumber + 1;
      const confirmationsStillNeeded = minConfirmations - confirmationCount;
      if (confirmationsStillNeeded <= 0) return receipt;
      log(
        `Waiting for more confirmations: txHash=${txHash} observed=${confirmationCount} of ${minConfirmations} currentBlock=${currentBlock} receiptBlock=${receipt.blockNumber}`,
      );
      sleepMs = Math.max(
        sleepMs,
        (confirmationsStillNeeded + 1) * meanBlockTimeMs,
      );
    } else if (everSeenReceipt) {
      log(`Transaction ${txHash} receipt disappeared - likely lost in a reorg`);
      return null;
    }

    await makeAbortController(sleepMs, [signal]).abortedP;
  }
};
