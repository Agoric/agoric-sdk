import { JsonRpcProvider, Log, type Filter } from 'ethers';
import type { CaipChainId } from '@agoric/orchestration';
import type { ClusterName } from './config.ts';
import type { EvmContext } from './pending-tx-manager.ts';

type HexAddress = `0x${string}`;

export type UsdcAddresses = {
  mainnet: Record<CaipChainId, HexAddress>;
  testnet: Record<CaipChainId, HexAddress>;
};

/**
 * Sourced from:
 * - https://chainlist.org/
 * - https://docs.simplehash.com/reference/supported-chains-testnets
 *   (accessed on 27th August 2025)
 * - https://developers.circle.com/cctp/evm-smart-contracts
 * - https://developers.circle.com/stablecoins/usdc-contract-addresses
 *
 * Notes:
 * - This list should conceptually come from an orchestration type
 *   for supported EVM networks.
 * - Currently this config mirrors the EVM chains defined in
 *   packages/orchestration/src/cctp-chain-info.js
 */
export const usdcAddresses: UsdcAddresses = {
  mainnet: {
    'eip155:8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base
    'eip155:43114': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', // Avalanche
    'eip155:42161': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
    'eip155:1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
    'eip155:10': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
    'eip155:137': '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359', // Polygon
  },
  testnet: {
    'eip155:84532': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
    'eip155:43113': '0x5425890298aed601595a70AB815c96711a31Bc65', // Avalanche Fuji
    'eip155:421614': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia
    'eip155:11155111': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Ethereum Sepolia
    'eip155:11155420': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // Optimism Sepolia
    'eip155:80002': '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582', // Polygon Amoy
  },
};

export const getEvmRpcMap = (
  clusterName: ClusterName,
  alchemyApiKey: string,
): Record<CaipChainId, string> => {
  switch (clusterName) {
    case 'mainnet':
      return {
        // Source: https://www.alchemy.com/rpc/ethereum
        'eip155:1': `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`,
        // Source: https://build.avax.network/docs/tooling/rpc-providers#http
        'eip155:43114': 'https://api.avax.network/ext/bc/C/rpc',
        // Source: https://docs.arbitrum.io/build-decentralized-apps/reference/node-providers
        'eip155:42161': 'https://arb1.arbitrum.io/rpc',
        // Source: https://docs.optimism.io/superchain/networks
        'eip155:10': 'https://mainnet.optimism.io',
        // Source: https://docs.polygon.technology/pos/reference/rpc-endpoints/#amoy
        'eip155:137': 'https://polygon-rpc.com/',
      };
    case 'testnet':
      return {
        'eip155:11155111': `https://eth-sepolia.g.alchemy.com/v2/${alchemyApiKey}`,
        'eip155:43113': 'https://api.avax-test.network/ext/bc/C/rpc',
        'eip155:421614': 'https://arbitrum-sepolia-rpc.publicnode.com',
        'eip155:11155420': 'https://optimism-sepolia-rpc.publicnode.com',
        'eip155:80002': 'https://polygon-amoy-bor-rpc.publicnode.com',
      };
    default:
      throw Error(`Unsupported cluster name ${clusterName}`);
  }
};
type CreateContextParams = {
  clusterName: ClusterName;
  alchemyApiKey: string;
};

export type EvmProviders = Record<CaipChainId, JsonRpcProvider>;

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
    Object.entries(urls).map(([caip, rpcUrl]) => [
      caip,
      new JsonRpcProvider(rpcUrl),
    ]),
  ) as EvmProviders;

  return {
    evmProviders,
    usdcAddresses: usdcAddresses[clusterName],
  };
};

/**
 * Generic binary search helper for finding the greatest value that satisfies a predicate.
 * Assumes a transition from acceptance to rejection somewhere in [start, end].
 *
 * @param start - Starting value (inclusive)
 * @param end - Ending value (inclusive)
 * @param acceptancePredicate - Function that returns true for accepted values
 * @param transform - Optional function to transform values before testing
 * @returns The greatest accepted value in the range
 */
export const binarySearch = async <T, U>(
  start: T,
  end: T,
  acceptancePredicate: (x: U) => Promise<boolean> | boolean,
  transform?: (x: T) => Promise<U> | U,
): Promise<T> => {
  let left = start;
  let right = end as any;
  let result = left;

  while (left <= right) {
    const mid = Math.floor((Number(left) + Number(right)) / 2) as T;
    const value = transform ? await transform(mid) : mid;

    if (await acceptancePredicate(value as any)) {
      result = mid;
      left = (mid as any) + 1;
    } else {
      right = (mid as any) - 1;
    }
  }

  return result;
};

const findBlockByTimestamp = async (
  provider: JsonRpcProvider,
  targetMs: number,
) => {
  const posixSeconds = Math.floor(targetMs / 1000);
  const startBlockNumber = await binarySearch(
    0,
    await provider.getBlockNumber(),
    (block: Awaited<ReturnType<typeof provider.getBlock>>) =>
      block?.timestamp ? block.timestamp <= posixSeconds : false,
    blockNumber => provider.getBlock(blockNumber),
  );
  return startBlockNumber;
};

export const buildTimeWindow = async (
  provider: JsonRpcProvider,
  publishTimeMs: number,
  fudgeFactorMs = 5 * 60 * 1000, // 5 minutes to account for cross-chain clock differences
) => {
  const adjustedTime = publishTimeMs - fudgeFactorMs;
  const fromBlock = await findBlockByTimestamp(provider, adjustedTime);
  const toBlock = await provider.getBlockNumber();
  return { fromBlock, toBlock };
};

type LogPredicate = (log: Log) => boolean | Promise<boolean>;

type ScanOpts = {
  provider: JsonRpcProvider;
  baseFilter: Omit<Filter, 'fromBlock' | 'toBlock'> & Partial<Filter>;
  fromBlock: number;
  toBlock: number;
  chunkSize?: number;
  log?: (...args: unknown[]) => void;
  onMatch?: (log: Log) => void | Promise<void>;
};

/**
 * Generic chunked log scanner: scans [fromBlock, toBlock] in CHUNK_SIZE windows,
 * runs `predicate` on each log, and returns true on the first match.
 */
export const scanEvmLogsInChunks = async (
  {
    provider,
    baseFilter,
    fromBlock,
    toBlock,
    chunkSize = 10,
    log = () => {},
    onMatch,
  }: ScanOpts,
  predicate: LogPredicate,
): Promise<boolean> => {
  for (let start = fromBlock; start <= toBlock; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, toBlock);

    /**
     * Generic chunked log scanner: scans [fromBlock, toBlock] (inclusive) in CHUNK_SIZE windows,
     * runs `predicate` on each log, and returns true on the first match.
     * @param fromBlock - Starting block number (inclusive)
     * @param toBlock - Ending block number (inclusive)
     */
    const chunkFilter: Filter = {
      // baseFilter represents core filter configuration (address, topics, etc.) without block range
      ...baseFilter,
      fromBlock: start,
      toBlock: end,
    };

    try {
      log(`[LogScan] Searching chunk ${start} → ${end}`);
      const logs = await provider.getLogs(chunkFilter);

      for (const ev of logs) {
        if (await predicate(ev)) {
          log(`[LogScan] Match in tx=${ev.transactionHash}`);
          if (onMatch) await onMatch(ev);
          return true;
        }
      }
    } catch (err) {
      log(`[LogScan] Error searching chunk ${start}–${end}:`, err);
      // continue
    }
  }
  return false;
};
