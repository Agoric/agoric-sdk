import { WebSocketProvider, Log } from 'ethers';
import type { Filter } from 'ethers';
import type { CaipChainId } from '@agoric/orchestration';
import type { ClusterName } from '@agoric/internal';
import { fromTypedEntries, objectMap, typedEntries } from '@agoric/internal';
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

type ROPartial<K extends string, V> = Readonly<Partial<Record<K, V>>>;

const { entries } = Object;

type HexAddress = `0x${string}`;

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

export const spectrumProtocols: Readonly<
  Record<PoolPlaceInfo['protocol'], string>
> = {
  Aave: 'aave',
  Beefy: 'beefy',
  Compound: 'compound',
  USDN: 'USDN',
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
 * @deprecated should come from e.g. @agoric/portfolio-api/src/constants.js
 *   or @agoric/orchestration
 */
export const getEvmRpcMap = (
  clusterName: ClusterName,
  alchemyApiKey: string,
): Record<CaipChainId, string> => {
  switch (clusterName) {
    case 'mainnet':
      return {
        // Source: https://www.alchemy.com/rpc/ethereum
        'eip155:1': `wss://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/avalanche
        'eip155:43114': `wss://avax-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source:  https://www.alchemy.com/rpc/arbitrum
        'eip155:42161': `wss://arb-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/optimism
        'eip155:10': `wss://opt-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/base
        'eip155:8453': `wss://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
      };
    case 'testnet':
      return {
        // Source: https://www.alchemy.com/rpc/ethereum-sepolia
        'eip155:11155111': `wss://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/avalanche-fuji
        'eip155:43113': `wss://avax-fuji.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/arbitrum-sepolia
        'eip155:421614': `wss://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/optimism-sepolia
        'eip155:11155420': `wss://opt-sepolia.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://www.alchemy.com/rpc/base-sepolia
        'eip155:84532': `wss://base-sepolia.g.alchemy.com/v2/${alchemyApiKey}`,
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

/**
 * Verifies that all EVM chains are accessible via their providers.
 * Throws an error if any chain fails to connect.
 */
export const verifyEvmChains = async (
  evmProviders: EvmProviders,
): Promise<void> => {
  const chainResults = await Promise.allSettled(
    entries(evmProviders).map(async ([chainId, provider]) => {
      await null;
      try {
        await provider.getBlockNumber();
        return { chainId, success: true };
      } catch (error: any) {
        return { chainId, success: false, error: error.message };
      }
    }),
  );

  const workingChains: string[] = [];
  const failedChains: Array<{ chainId: string; error: string }> = [];

  for (const result of chainResults) {
    if (result.status === 'fulfilled') {
      const chainResult = result.value;
      if (chainResult.success) {
        workingChains.push(chainResult.chainId);
      } else {
        failedChains.push({
          chainId: chainResult.chainId,
          error: chainResult.error,
        });
      }
    } else {
      failedChains.push({
        chainId: 'unknown',
        error: result.reason?.message || 'Unknown error',
      });
    }
  }

  console.warn(`✓ Working chains (${workingChains.length}):`, workingChains);

  if (failedChains.length > 0) {
    console.error(`✗ Failed chains (${failedChains.length}):`);
    for (const { chainId, error } of failedChains) {
      console.error(`  - ${chainId}: ${error}`);
    }
    throw new Error(
      `Failed to connect to ${failedChains.length} EVM chain(s). ` +
        `Ensure all required chains are enabled in your Alchemy dashboard. ` +
        `Failed chains: ${failedChains.map(c => c.chainId).join(', ')}`,
    );
  }
};

export const createEVMContext = async ({
  clusterName,
  alchemyApiKey,
}: CreateContextParams): Promise<
  Pick<EvmContext, 'evmProviders' | 'usdcAddresses'>
> => {
  if (clusterName === 'local') clusterName = 'testnet';
  if (!alchemyApiKey) throw Error('missing alchemyApiKey');

  const urls = getEvmRpcMap(clusterName, alchemyApiKey);
  const evmProviders = Object.fromEntries(
    Object.entries(urls).map(([caip, wsUrl]) => [
      caip,
      new WebSocketProvider(wsUrl),
    ]),
  ) as EvmProviders;

  return {
    evmProviders,
    // XXX Remove now that @agoric/portfolio-api/src/constants.js
    // defines UsdcTokenIds.
    usdcAddresses: usdcAddresses[clusterName],
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

type ScanOpts = {
  provider: WebSocketProvider;
  baseFilter: Omit<Filter, 'fromBlock' | 'toBlock'> & Partial<Filter>;
  fromBlock: number;
  toBlock: number;
  chainId: CaipChainId;
  chunkSize?: number;
  log?: (...args: unknown[]) => void;
  signal?: AbortSignal;
};

/**
 * Generic chunked log scanner: scans [fromBlock, toBlock] in CHUNK_SIZE windows,
 * runs `predicate` on each log, and returns the first matching log or undefined.
 */
export const scanEvmLogsInChunks = async (
  opts: ScanOpts,
  predicate: LogPredicate,
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
  } = opts;

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
      const blockTimeMs = getBlockTimeMs(chainId);
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
    } catch (err) {
      log(`[LogScan] Error searching chunk ${start}–${end}:`, err);
      // continue
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
