import { WebSocketProvider, Log, toBeHex } from 'ethers';
import type { Filter, TransactionResponse } from 'ethers';
import type { CaipChainId } from '@agoric/orchestration';
import type { ClusterName } from '@agoric/internal';
import { fromTypedEntries, objectMap, typedEntries } from '@agoric/internal';
import { makeWorkPool } from '@agoric/internal/src/work-pool.js';
import {
  CaipChainIds,
  EvmWalletOperationType,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import type { SupportedChain } from '@agoric/portfolio-api/src/constants.js';
import type {
  PoolKey as InstrumentId,
  PoolPlaceInfo,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import {
  aaveRewardsControllerAddresses,
  compoundAddresses,
} from '@aglocal/portfolio-deploy/src/axelar-configs.js';
import type { EvmContext } from './pending-tx-manager.ts';
import { lookupValueForKey } from './utils.ts';

/**
 * Narrow interface for a JSON-RPC 2.0 batch client.
 *
 * We define a custom interface rather than importing {@link JSONRPCClient}
 * from `json-rpc-2.0` because the test lockdown (`overrideTaming: 'min'`)
 * is incompatible with that library's compiled `__extends`
 * (see `src/lockdown.js`).  The custom type still limits the power surface
 * passed to downstream functions.
 */
export type JsonRpcBatchClient = {
  batchCall: (
    requests: Array<{ method: string; params: unknown[] }>,
  ) => Promise<Array<{ result?: unknown }>>;
};

export const UserInputError = class extends Error {} as ErrorConstructor;
harden(UserInputError);

type ROPartial<K extends string, V> = Readonly<Partial<Record<K, V>>>;

type HexAddress = `0x${string}`;

export type WatcherTimeoutOptions = {
  timeoutMs?: number;
  setTimeout?: typeof globalThis.setTimeout;
  signal?: AbortSignal;
};

/**
 * @deprecated should come from e.g. @agoric/portfolio-api/src/constants.js
 *   or @agoric/orchestration
 */
export type UsdcAddresses = {
  mainnet: Record<CaipChainId, HexAddress>;
  testnet: Record<CaipChainId, HexAddress>;
};

const spectrumChainIds: Record<`${CaipChainId} ${SupportedChain}`, string> = {
  // for mainnet
  'eip155:42161 Arbitrum': '0xa4b1',
  'eip155:43114 Avalanche': '0xa86a',
  'eip155:8453 Base': '0x2105',
  'eip155:1 Ethereum': '0x1',
  'eip155:10 Optimism': '0xa',
  'cosmos:agoric-3 agoric': 'agoric-3',
  'cosmos:noble-1 noble': 'noble-1',
  // for testnet (EVM chains are mostly "Sepolia", but Avalanche is "Fuji")
  'eip155:421614 Arbitrum': '0x66eee',
  'eip155:43113 Avalanche': '0xa869',
  'eip155:84532 Base': '0x14a34',
  'eip155:11155111 Ethereum': '0xaa36a7',
  'eip155:11155420 Optimism': '0xaa37dc',
  'cosmos:agoricdev-25 agoric': 'agoricdev-25',
  'cosmos:grand-1 noble': 'grand-1',
};

// Note that lookupValueForKey throws when the key is not found.
export const spectrumChainIdsByCluster: Readonly<
  Record<ClusterName, ROPartial<SupportedChain, string>>
> = {
  mainnet: {
    ...objectMap(CaipChainIds.mainnet, (chainId, chainLabel) =>
      lookupValueForKey(spectrumChainIds, `${chainId} ${chainLabel}`),
    ),
  },
  testnet: {
    ...objectMap(CaipChainIds.testnet, (chainId, chainLabel) =>
      lookupValueForKey(spectrumChainIds, `${chainId} ${chainLabel}`),
    ),
  },
  local: {
    ...objectMap(CaipChainIds.local, (chainId, chainLabel) =>
      lookupValueForKey(spectrumChainIds, `${chainId} ${chainLabel}`),
    ),
  },
};

export const spectrumPoolIdsByCluster: Readonly<
  Record<ClusterName, ROPartial<InstrumentId, string>>
> = {
  mainnet: {
    ...fromTypedEntries(
      typedEntries(aaveRewardsControllerAddresses.mainnet).map(
        ([chainName, _addr]) => [`Aave_${chainName}` as InstrumentId, 'USDC'],
      ),
    ),
    ...fromTypedEntries(
      typedEntries(compoundAddresses.mainnet).map(([chainName, addr]) => [
        `Compound_${chainName}` as InstrumentId,
        addr,
      ]),
    ),
    Beefy_re7_Avalanche: 'euler-avax-re7labs-usdc',
    Beefy_morphoGauntletUsdc_Ethereum: 'morpho-gauntlet-usdc',
    Beefy_morphoSmokehouseUsdc_Ethereum: 'morpho-smokehouse-usdc',
    Beefy_morphoSeamlessUsdc_Base: 'morpho-seamless-usdc',
    Beefy_compoundUsdc_Optimism: 'compound-op-usdc',
    Beefy_compoundUsdc_Arbitrum: 'compound-arbitrum-usdc',
  },
  testnet: {
    ...fromTypedEntries(
      typedEntries(aaveRewardsControllerAddresses.testnet).map(
        ([chainName, _addr]) => [`Aave_${chainName}` as InstrumentId, 'USDC'],
      ),
    ),
    ...fromTypedEntries(
      typedEntries(compoundAddresses.testnet).map(([chainName, addr]) => [
        `Compound_${chainName}` as InstrumentId,
        addr,
      ]),
    ),
  },
  local: {},
};

// Not a keyMirror because some values change casing from keys
export const spectrumProtocols: Readonly<
  Record<PoolPlaceInfo['protocol'], string>
> = {
  Aave: 'aave',
  Beefy: 'beefy',
  Compound: 'compound',
  USDN: 'USDN',
  ERC4626: 'ERC4626',
};

/**
 * Sourced from:
 * - https://chainlist.org/
 * - https://docs.simplehash.com/reference/supported-chains-testnets
 *   (accessed on 27th August 2025)
 * - https://developers.circle.com/cctp/evm-smart-contracts
 * - https://developers.circle.com/stablecoins/usdc-contract-addresses
 *
 * @deprecated should come from e.g. @agoric/portfolio-api/src/constants.js
 *   or @agoric/orchestration
 * @see {@link ../../../packages/orchestration/src/cctp-chain-info.js}
 */
export const usdcAddresses: UsdcAddresses = {
  mainnet: {
    'eip155:8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
    'eip155:43114': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche
    'eip155:42161': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
    'eip155:1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
    'eip155:10': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
  },
  testnet: {
    'eip155:84532': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
    'eip155:43113': '0x5425890298aed601595a70AB815c96711a31Bc65', // Avalanche Fuji
    'eip155:421614': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia
    'eip155:11155111': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Ethereum Sepolia
    'eip155:11155420': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // Optimism Sepolia
  },
};

export const walletOperationGasLimitEstimates: Record<
  EvmWalletOperationType,
  Partial<Record<YieldProtocol, bigint>>
> = {
  // Assume that creation has the same gas cost on every chain.
  // https://sepolia.arbiscan.io/tx/0xfdb38b1680c10919b7ff360b21703e349b74eac585f15c70ba9733c7ddaccfe6
  [EvmWalletOperationType.Create]: objectMap(YieldProtocol, () => 1_209_435n),
  // https://github.com/Agoric/agoric-sdk/issues/12021#issuecomment-3361285596
  [EvmWalletOperationType.Supply]: {
    [YieldProtocol.Aave]: 279_473n,
    [YieldProtocol.Compound]: 151_692n,
  },
  [EvmWalletOperationType.Withdraw]: {
    [YieldProtocol.Aave]: 234_327n,
    [YieldProtocol.Compound]: 123_081n,
  },
  [EvmWalletOperationType.DepositForBurn]: objectMap(
    YieldProtocol,
    () => 151_320n,
  ),
};

/** In the absence of a more specific gas estimate, use this one. */
export const walletOperationFallbackGasLimit = 276_809n;

/**
 * Average block times for supported EVM chains in milliseconds.
 *
 * Mainnet data: https://eth.blockscout.com/ (except Avalanche),
 *   https://chainspect.app/ , https://subnets.avax.network/c-chain
 * Testnet data: https://eth.blockscout.com/ (except Avalanche),
 *   https://subnets-test.avax.network/c-chain
 *
 * @deprecated should come from e.g. @agoric/portfolio-api/src/constants.js
 *   or @agoric/orchestration
 */
const chainBlockTimesMs: Record<CaipChainId, number> = harden({
  // ========= Mainnet =========
  'eip155:1': 12_000, // Ethereum Mainnet
  'eip155:42161': 300, // Arbitrum One
  'eip155:43114': 2_000, // Avalanche C-Chain
  'eip155:8453': 2_500, // Base
  'eip155:10': 2_000, // Optimism

  // ========= Testnet =========
  'eip155:11155111': 12_000, // Ethereum Sepolia
  'eip155:421614': 300, // Arbitrum Sepolia
  'eip155:43113': 2_000, // Avalanche Fuji
  'eip155:84532': 2_000, // Base Sepolia
  'eip155:11155420': 2_000, // Optimism Sepolia
});

/**
 * Get the average block time for a given chain ID.
 * Defaults to Ethereum's 12s if chain is unknown (conservative approach).
 */
export const getBlockTimeMs = (chainId: CaipChainId): number => {
  return chainBlockTimesMs[chainId] ?? 12_000; // Default to Ethereum's conservative 12s
};

/**
 * Number of block confirmations required before marking a transaction as final.
 * Higher values provide stronger finality guarantees but increase latency.
 *
 * Note: We use 25 confirmations for all chains as a conservative, uniform approach
 * that maximizes safety. Since confirmation waits only apply to transaction failures
 * (success cases return immediately with 0 confirmations), the latency impact is
 * acceptable and limited to rare failure scenarios.
 *
 * This value can be reconfigured on a per-chain basis if specific networks require
 * different confirmation depths based on their consensus mechanisms or reorg risk.
 *
 * Background: Circle's blockchain confirmation guidance recommends 12 for Ethereum,
 * 20 for Arbitrum, 1 for Avalanche, and 10 for Base/Optimism. Our choice of 25
 * provides additional safety margin beyond these recommendations.
 *
 * @see https://developers.circle.com/w3s/blockchain-confirmations
 */

const blockConfirmationsRequired: Record<CaipChainId, number> = harden({
  // ========= Mainnet =========
  'eip155:1': 25, // Ethereum Mainnet
  'eip155:42161': 25, // Arbitrum One
  'eip155:43114': 25, // Avalanche C-Chain
  'eip155:8453': 25, // Base
  'eip155:10': 25, // Optimism

  // ========= Testnet =========
  'eip155:11155111': 25, // Ethereum Sepolia
  'eip155:421614': 25, // Arbitrum Sepolia
  'eip155:43113': 25, // Avalanche Fuji
  'eip155:84532': 25, // Base Sepolia
  'eip155:11155420': 25, // Optimism Sepolia
});

/**
 * Get the number of confirmations required for a given chain ID.
 */
export const getConfirmationsRequired = (chainId: CaipChainId): number => {
  return blockConfirmationsRequired[chainId];
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

/**
 * @deprecated should come from e.g. @agoric/portfolio-api/src/constants.js
 *   or @agoric/orchestration
 */
export const getEvmRpcMap = (
  clusterName: ClusterName,
  alchemyApiKey: string,
  protocol: 'wss' | 'https' = 'wss',
): Record<CaipChainId, string> => {
  switch (clusterName) {
    case 'mainnet':
      return {
        // Source: https://www.alchemy.com/rpc/ethereum
        'eip155:1': `${protocol}://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/avalanche
        'eip155:43114': `${protocol}://avax-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/arbitrum
        'eip155:42161': `${protocol}://arb-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/optimism
        'eip155:10': `${protocol}://opt-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/base
        'eip155:8453': `${protocol}://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
      };
    case 'testnet':
      return {
        // Source: https://www.alchemy.com/rpc/ethereum-sepolia
        'eip155:11155111': `${protocol}://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/avalanche-fuji
        'eip155:43113': `${protocol}://avax-fuji.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/arbitrum-sepolia
        'eip155:421614': `${protocol}://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/optimism-sepolia
        'eip155:11155420': `${protocol}://opt-sepolia.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/base-sepolia
        'eip155:84532': `${protocol}://base-sepolia.g.alchemy.com/v2/${alchemyApiKey}`,
      };
    default:
      throw Error(`Unsupported cluster name ${clusterName}`);
  }
};
type CreateContextParams = {
  clusterName: ClusterName;
  alchemyApiKey: string;
};

export type EvmProviders = Record<CaipChainId, WebSocketProvider>;

export const createEVMContext = async ({
  clusterName,
  alchemyApiKey,
}: CreateContextParams): Promise<
  Pick<EvmContext, 'evmProviders' | 'usdcAddresses' | 'rpcUrls'>
> => {
  if (clusterName === 'local') clusterName = 'testnet';
  if (!alchemyApiKey) throw Error('missing alchemyApiKey');

  const wssUrls = getEvmRpcMap(clusterName, alchemyApiKey, 'wss');
  const httpsUrls = getEvmRpcMap(clusterName, alchemyApiKey, 'https');
  const evmProviders = Object.fromEntries(
    Object.entries(wssUrls).map(([caip, wsUrl]) => [
      caip,
      new WebSocketProvider(wsUrl),
    ]),
  ) as EvmProviders;

  return {
    evmProviders,
    // XXX Remove now that @agoric/portfolio-api/src/constants.js
    // defines UsdcTokenIds.
    usdcAddresses: usdcAddresses[clusterName],
    rpcUrls: httpsUrls,
  };
};

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

type LogPredicate = (log: Log) => boolean | Promise<boolean>;

type ScanOptsBase = {
  provider: WebSocketProvider;
  fromBlock: number;
  toBlock: number;
  chainId: CaipChainId;
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

type FailedTxScanOpts = ScanOptsBase & {
  toAddress: string;
  verifyFailedTx: (
    tx: TransactionResponse,
    receipt: BlockReceipt,
  ) => boolean | Promise<boolean>;
  rpcClient: JsonRpcBatchClient;
};

type BlockReceipt = {
  transactionHash: `0x${string}`;
  status: `0x${string}` | null;
  to: `0x${string}` | null;
};

type TraceAction = {
  from: `0x${string}`;
  to: `0x${string}`;
  input: `0x${string}`;
  value: `0x${string}`;
  gas: `0x${string}`;
  callType: string;
};

type TraceResult = {
  action: TraceAction;
  blockNumber: number;
  transactionHash: `0x${string}`;
  error?: string;
  type: string;
  subtraces: number;
  traceAddress: number[];
};

/**
 * Create a {@link JsonRpcBatchClient} backed by HTTP POST via the given `fetch`.
 *
 * Use this instead of passing raw `fetch` + `rpcUrl` to downstream functions
 * so that callees only receive the constrained JSON-RPC interface.
 */
export const makeJsonRpcClient = (
  fetch: typeof globalThis.fetch,
  rpcUrl: string,
): JsonRpcBatchClient => ({
  batchCall: async requests => {
    const payload = requests.map((req, i) => ({
      jsonrpc: '2.0',
      id: i + 1,
      method: req.method,
      params: req.params,
    }));
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  },
});

/**
 * Fetches block receipts in batch using eth_getBlockReceipts RPC method.
 * This function cannot use an ethers provider because ethers does not support
 * batching of this method.
 *
 * @param start - Start block number (inclusive)
 * @param end - End block number (inclusive)
 * @param client - JSON-RPC batch client
 * @returns Array of BlockReceipt objects for the requested blocks
 */
const getBlockReceiptsBatch = async (
  start: number,
  end: number,
  client: JsonRpcBatchClient,
): Promise<BlockReceipt[]> => {
  const requests = Array.from({ length: end - start + 1 }, (_, i) => ({
    method: 'eth_getBlockReceipts',
    params: [toBeHex(start + i)] as unknown[],
  }));
  const responses = await client.batchCall(requests);
  return responses.flatMap(r => (r.result ?? []) as BlockReceipt[]);
};

/**
 * Generic chunked log scanner: scans [fromBlock, toBlock] in CHUNK_SIZE windows,
 * runs `predicate` on each log, and returns the first matching log or undefined.
 */
export const scanEvmLogsInChunks = async (
  opts: LogScanOpts,
): Promise<Log | undefined> => {
  const {
    provider,
    baseFilter,
    fromBlock,
    toBlock,
    chainId,
    chunkSize = 10,
    log = () => {},
    signal,
    predicate,
  } = opts;

  const blockTimeMs = getBlockTimeMs(chainId);
  await null;
  for (let start = fromBlock; start <= toBlock; ) {
    if (signal?.aborted) {
      log('[LogScan] Aborted');
      return undefined;
    }
    const end = Math.min(start + chunkSize - 1, toBlock);
    const currentBlock = await provider.getBlockNumber();

    // Wait for the chain to catch up if end block doesn't exist yet
    if (end > currentBlock) {
      const blocksToWait = Math.max(50, chunkSize);
      const waitTimeMs = blocksToWait * blockTimeMs;
      const blocksBehind = end - currentBlock;
      log(
        `[LogScan] Chain ${blocksBehind} blocks behind (need ${end}, at ${currentBlock}). Waiting ${waitTimeMs}ms (${blocksToWait} blocks @ ${blockTimeMs}ms/block)`,
      );
      await new Promise(resolve => setTimeout(resolve, waitTimeMs));
      continue; // Retry this chunk after waiting
    }

    const chunkFilter: Filter = {
      // baseFilter represents core filter configuration (address, topics, etc.) without block range
      ...baseFilter,
      fromBlock: start,
      toBlock: end,
    };

    try {
      log(`[LogScan] Searching chunk ${start} → ${end}`);
      const logs = await provider.getLogs(chunkFilter);
      for (const evt of logs) {
        if (await predicate(evt)) {
          log(`[LogScan] Match in tx=${evt.transactionHash}`);
          return evt;
        }
      }
      await opts.onRejectedChunk?.(start, end);
    } catch (err) {
      log(`[LogScan] Error searching chunk ${start}–${end}:`, err);
      // continue
    }

    start += chunkSize;
  }
  return undefined;
};

/**
 * Fetches failed transaction traces using trace_filter RPC method.
 * Filters by toAddress server-side and includes calldata in the response,
 * avoiding extra getTransaction round-trips.
 */
const getTraceFilter = async (
  fromBlock: string,
  toBlock: string,
  toAddress: string,
  provider: WebSocketProvider,
): Promise<TraceResult[]> => {
  const result: TraceResult[] | null = await provider.send('trace_filter', [
    { fromBlock, toBlock, toAddress: [toAddress] },
  ]);
  return result ?? [];
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
const scanChunkWithBlockReceipts = async (
  start: number,
  end: number,
  opts: FailedTxScanOpts,
): Promise<TransactionResponse | undefined> => {
  const { provider, toAddress, verifyFailedTx, rpcClient } = opts;

  const receipts = await getBlockReceiptsBatch(start, end, rpcClient);

  const { promise, resolve, reject } = Promise.withResolvers<
    TransactionResponse | undefined
  >();
  let isDone = false;
  const scanner = makeWorkPool(receipts, undefined, async receipt => {
    if (isDone) return;
    const { transactionHash, status, to } = receipt;

    if (!to || to.toLowerCase() !== toAddress.toLowerCase()) return;

    const statusValue = status ? Number.parseInt(status, 16) : undefined;
    if (statusValue !== 0) return;

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
const scanChunkWithTraceFilter = async (
  start: number,
  end: number,
  opts: FailedTxScanOpts,
): Promise<TransactionResponse | undefined> => {
  const { provider, toAddress, verifyFailedTx } = opts;

  const traces = await getTraceFilter(
    toBeHex(start),
    toBeHex(end),
    toAddress,
    provider,
  );

  for (const trace of traces) {
    // Only top-level calls (not internal sub-calls) with errors
    if (trace.traceAddress.length !== 0 || !trace.error) {
      continue;
    }

    // Construct objects compatible with the verifyFailedTx callback.
    // Callers only access .hash, .to, and .data on the tx object.
    const syntheticTx = {
      hash: trace.transactionHash,
      to: trace.action.to,
      data: trace.action.input,
    } as TransactionResponse;

    const syntheticReceipt: BlockReceipt = {
      transactionHash: trace.transactionHash,
      status: '0x0',
      to: trace.action.to,
    };

    if (await verifyFailedTx(syntheticTx, syntheticReceipt)) {
      return syntheticTx;
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
  const {
    provider,
    fromBlock,
    toBlock,
    chainId,
    chunkSize: requestedChunkSize,
    log = () => {},
    signal,
  } = opts;

  const useTraceFilter = traceFilterSupportedChains.has(chainId);
  const blockTimeMs = getBlockTimeMs(chainId);
  const chunkSize =
    requestedChunkSize ??
    (useTraceFilter ? TRACE_FILTER_CHUNK_SIZE : BLOCK_RECEIPTS_CHUNK_SIZE);
  const scanChunk = useTraceFilter
    ? scanChunkWithTraceFilter
    : scanChunkWithBlockReceipts;

  let currentBlock = await provider.getBlockNumber();
  for (let start = fromBlock; start <= toBlock; ) {
    if (signal?.aborted) {
      log('[FailedTxScan] Aborted');
      return undefined;
    }
    const end = Math.min(start + chunkSize - 1, toBlock);

    // Wait for the chain to catch up if end block doesn't exist yet
    if (end > currentBlock) currentBlock = await provider.getBlockNumber();
    if (end > currentBlock) {
      const blocksToWait = Math.max(50, chunkSize);
      const waitTimeMs = blocksToWait * blockTimeMs;
      const blocksBehind = end - currentBlock;
      log(
        `[FailedTxScan] Chain ${blocksBehind} blocks behind (need ${end}, at ${currentBlock}). Waiting ${waitTimeMs}ms (${blocksToWait} blocks @ ${blockTimeMs}ms/block)`,
      );
      await new Promise(resolve => setTimeout(resolve, waitTimeMs));
      continue; // Retry this chunk after waiting
    }

    try {
      const result = await scanChunk(start, end, opts);
      if (result) return result;
      await opts.onRejectedChunk?.(start, end);
    } catch (err) {
      log(
        `[FailedTxScan] Error checking block ${start} -> ${end} for failures:`,
        err,
      );
    }

    start += chunkSize;
  }
  return undefined;
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

/**
 * Mock the abort reason of `AbortSignal.timeout(ms)`.
 * https://dom.spec.whatwg.org/#dom-abortsignal-timeout
 */
const makeTimeoutReason = () =>
  Object.defineProperty(Error('Timed out'), 'name', {
    value: 'TimeoutError',
  });

/**
 * Abstract AbortController/AbortSignal functionality upon a provided
 * setTimeout.
 */
export const prepareAbortController = ({
  setTimeout,
  AbortController = globalThis.AbortController,
  AbortSignal = globalThis.AbortSignal,
}: {
  setTimeout: typeof globalThis.setTimeout;
  AbortController?: typeof globalThis.AbortController;
  AbortSignal?: typeof globalThis.AbortSignal;
}) => {
  /**
   * Make a new manually-abortable AbortSignal with optional timeout and/or
   * optional signals whose own aborts should propagate (as with
   * `AbortSignal.any`).
   */
  const makeAbortController = (
    timeoutMillisec?: number,
    racingSignals?: Iterable<AbortSignal>,
  ): AbortController => {
    let controller: AbortController | null = new AbortController();
    const abort: AbortController['abort'] = reason => {
      try {
        return controller?.abort(reason);
      } finally {
        controller = null;
      }
    };
    if (timeoutMillisec !== undefined) {
      setTimeout(() => abort(makeTimeoutReason()), timeoutMillisec);
    }
    if (!racingSignals) {
      return { abort, signal: controller.signal };
    }
    const signal = AbortSignal.any([controller.signal, ...racingSignals]);
    signal.addEventListener('abort', _event => abort());
    return { abort, signal };
  };
  return makeAbortController;
};

export type MakeAbortController = ReturnType<typeof prepareAbortController>;
