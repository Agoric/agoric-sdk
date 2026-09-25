#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file Report which configured YMax vault instruments are at deposit capacity.
 *
 * For ERC-4626 instruments, capacity is determined by `maxDeposit(receiver)`.
 * A result of `0` is treated as "at capacity".
 *
 * Beefy vaults do not expose a standard ERC-4626 capacity API, so this script
 * reports them separately as unsupported for capacity probing.
 */

import '@endo/init';
import {
  createPublicClient,
  formatUnits,
  http,
  isAddress,
  type Address,
  type Chain,
} from 'viem';
import {
  axelarConfig,
  axelarConfigTestnet,
} from '../src/axelar-configs.js';

const RECEIVER_PROBE = '0x0000000000000000000000000000000000000001' as Address;

const erc20MetadataABI = [
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

const erc4626CapacityABI = [
  {
    type: 'function',
    name: 'asset',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'assetTokenAddress', type: 'address' }],
  },
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'totalAssets',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'maxDeposit',
    stateMutability: 'view',
    inputs: [{ name: 'receiver', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const DEFAULT_RPCS = {
  mainnet: {
    Arbitrum: 'https://arb1.arbitrum.io/rpc',
    Avalanche: 'https://api.avax.network/ext/bc/C/rpc',
    Base: 'https://mainnet.base.org',
    Ethereum: 'https://eth.llamarpc.com',
    Optimism: 'https://mainnet.optimism.io',
  },
  testnet: {
    Arbitrum: 'https://arbitrum-sepolia-rpc.publicnode.com',
    Avalanche: 'https://api.avax-test.network/ext/bc/C/rpc',
    Base: 'https://sepolia.base.org',
    Ethereum: 'https://ethereum-sepolia-rpc.publicnode.com',
    Optimism: 'https://sepolia.optimism.io',
  },
} as const;

type NetworkName = 'mainnet' | 'testnet';
type ChainName = keyof typeof axelarConfig;
type ProtocolName = 'ERC4626' | 'Beefy';
type ChainConfigMap = typeof axelarConfig | typeof axelarConfigTestnet;

type InstrumentEntry = {
  chain: ChainName;
  instrument: string;
  protocol: ProtocolName;
  address: Address;
};

type ERC4626ProbeResult = InstrumentEntry & {
  protocol: 'ERC4626';
  asset: Address;
  assetSymbol: string;
  assetDecimals: number;
  vaultName: string;
  vaultSymbol: string;
  maxDeposit: bigint;
  totalAssets: bigint;
  atCapacity: boolean;
};

type PublicClient = ReturnType<typeof createPublicClient>;

const usage = (argv0: string) => `Usage: ${argv0} [--network=mainnet|testnet] [--all]

Environment:
  ARBITRUM_RPC_URL   optional override for Arbitrum RPC
  AVALANCHE_RPC_URL  optional override for Avalanche RPC
  BASE_RPC_URL       optional override for Base RPC
  ETHEREUM_RPC_URL   optional override for Ethereum RPC
  OPTIMISM_RPC_URL   optional override for Optimism RPC

Behavior:
  Defaults to mainnet.
  Prints only ERC-4626 instruments at capacity unless --all is provided.
  Beefy instruments are listed separately because they do not expose a standard
  capacity view like ERC-4626 maxDeposit().`;

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 500;

const parseArgs = (argv: string[]) => {
  let network: NetworkName = 'mainnet';
  let showAll = false;

  for (const arg of argv) {
    if (arg === '--all') {
      showAll = true;
      continue;
    }
    if (arg.startsWith('--network=')) {
      const value = arg.slice('--network='.length);
      if (value === 'mainnet' || value === 'testnet') {
        network = value;
        continue;
      }
      throw Error(`invalid --network value: ${value}`);
    }
    if (arg === '--help' || arg === '-h') {
      console.log(usage(process.argv[1] || 'detect-ymax-capacity.ts'));
      process.exit(0);
    }
    throw Error(`unknown argument: ${arg}`);
  }

  return { network, showAll };
};

const toChain = (chain: ChainName, chainId: number, rpcUrl: string): Chain => ({
  id: chainId,
  name: chain,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [rpcUrl] },
    public: { http: [rpcUrl] },
  },
});

const getRpcUrl = (network: NetworkName, chain: ChainName) => {
  const envKey = `${chain.toUpperCase()}_RPC_URL`;
  return process.env[envKey] || DEFAULT_RPCS[network][chain];
};

const getChainConfig = (network: NetworkName): ChainConfigMap =>
  network === 'mainnet' ? axelarConfig : axelarConfigTestnet;

const getInstrumentEntries = (config: ChainConfigMap): InstrumentEntry[] => {
  const entries: InstrumentEntry[] = [];

  for (const [chain, chainConfig] of Object.entries(config) as [
    ChainName,
    ChainConfigMap[ChainName],
  ][]) {
    for (const [instrument, rawAddress] of Object.entries(chainConfig.contracts)) {
      const protocol =
        instrument.startsWith('ERC4626_')
          ? 'ERC4626'
          : instrument.startsWith('Beefy_')
            ? 'Beefy'
            : undefined;
      if (!protocol) continue;
      if (
        typeof rawAddress !== 'string' ||
        !isAddress(rawAddress)
      ) {
        continue;
      }
      entries.push({
        chain,
        instrument,
        protocol,
        address: rawAddress as Address,
      });
    }
  }

  return entries.sort((a, b) => a.instrument.localeCompare(b.instrument));
};

const sleep = (ms: number) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

const getErrorStatusCode = (err: unknown): number | undefined => {
  if (!err || typeof err !== 'object') return undefined;
  if ('status' in err && typeof err.status === 'number') return err.status;
  if (
    'details' in err &&
    err.details &&
    typeof err.details === 'object' &&
    'status' in err.details &&
    typeof err.details.status === 'number'
  ) {
    return err.details.status;
  }
  const message = err instanceof Error ? err.message : String(err);
  const match = message.match(/Status:\s*(\d{3})/);
  return match ? Number(match[1]) : undefined;
};

const withRpcRetry = async <T>(
  label: string,
  op: () => Promise<T>,
): Promise<T> => {
  let attempt = 0;
  for (;;) {
    try {
      return await op();
    } catch (err) {
      const status = getErrorStatusCode(err);
      if (attempt >= MAX_RETRIES || !RETRYABLE_STATUS_CODES.has(status ?? 0)) {
        throw err;
      }
      const delayMs = INITIAL_BACKOFF_MS * 2 ** attempt;
      console.error(
        `retrying ${label} after RPC error status=${status} attempt=${attempt + 1}/${MAX_RETRIES} backoffMs=${delayMs}`,
      );
      await sleep(delayMs);
      attempt += 1;
    }
  }
};

const readContractWithRetry = async <
  const abi extends readonly unknown[],
  functionName extends string,
>(client: PublicClient, params: {
  address: Address;
  abi: abi;
  functionName: functionName;
  args?: readonly unknown[];
}) =>
  withRpcRetry(
    `${params.address}.${params.functionName}`,
    async () => client.readContract(params),
  );

const probeERC4626 = async (
  entry: InstrumentEntry,
  network: NetworkName,
): Promise<ERC4626ProbeResult> => {
  const chainId = Number(getChainConfig(network)[entry.chain].chainInfo.reference);
  const rpcUrl = getRpcUrl(network, entry.chain);
  const client = createPublicClient({
    chain: toChain(entry.chain, chainId, rpcUrl),
    transport: http(rpcUrl),
  });

  const [asset, vaultName, vaultSymbol, totalAssets, maxDeposit] =
    await Promise.all([
      readContractWithRetry(client, {
        address: entry.address,
        abi: erc4626CapacityABI,
        functionName: 'asset',
      }),
      readContractWithRetry(client, {
        address: entry.address,
        abi: erc4626CapacityABI,
        functionName: 'name',
      }),
      readContractWithRetry(client, {
        address: entry.address,
        abi: erc4626CapacityABI,
        functionName: 'symbol',
      }),
      readContractWithRetry(client, {
        address: entry.address,
        abi: erc4626CapacityABI,
        functionName: 'totalAssets',
      }),
      readContractWithRetry(client, {
        address: entry.address,
        abi: erc4626CapacityABI,
        functionName: 'maxDeposit',
        args: [RECEIVER_PROBE],
      }),
    ]);

  const [assetDecimals, assetSymbol] = await Promise.all([
    readContractWithRetry(client, {
      address: asset,
      abi: erc20MetadataABI,
      functionName: 'decimals',
    }),
    readContractWithRetry(client, {
      address: asset,
      abi: erc20MetadataABI,
      functionName: 'symbol',
    }),
  ]);

  return {
    ...entry,
    protocol: 'ERC4626',
    asset,
    assetDecimals,
    assetSymbol,
    vaultName,
    vaultSymbol,
    totalAssets,
    maxDeposit,
    atCapacity: maxDeposit === 0n,
  };
};

const formatAmount = (value: bigint, decimals: number, symbol: string) =>
  `${formatUnits(value, decimals)} ${symbol}`;

const emitNdjson = (record: Record<string, unknown>) => {
  console.log(JSON.stringify(record));
};

const main = async () => {
  const { network, showAll } = parseArgs(process.argv.slice(2));
  const config = getChainConfig(network);
  const instruments = getInstrumentEntries(config);
  const erc4626Entries = instruments.filter(
    (entry): entry is InstrumentEntry & { protocol: 'ERC4626' } =>
      entry.protocol === 'ERC4626',
  );
  const beefyEntries = instruments.filter(entry => entry.protocol === 'Beefy');

  const results = await Promise.allSettled(
    erc4626Entries.map(entry => probeERC4626(entry, network)),
  );

  const successful = results.flatMap(result =>
    result.status === 'fulfilled' ? [result.value] : [],
  );
  const failures = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [
          {
            entry: erc4626Entries[index],
            error:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          },
        ]
      : [],
  );

  const atCapacity = successful.filter(result => result.atCapacity);
  const openCapacity = successful.filter(result => !result.atCapacity);
  const displayed = showAll ? successful : atCapacity;

  emitNdjson({
    type: 'run-info',
    network,
    filter: showAll ? 'all' : 'at-capacity',
    erc4626Instruments: erc4626Entries.length,
    beefyInstruments: beefyEntries.length,
  });

  for (const result of displayed) {
    emitNdjson({
      type: 'instrument',
      protocol: result.protocol,
      status: result.atCapacity ? 'at-capacity' : 'open',
      instrument: result.instrument,
      chain: result.chain,
      vault: result.address,
      vaultName: result.vaultName,
      vaultSymbol: result.vaultSymbol,
      asset: result.asset,
      assetSymbol: result.assetSymbol,
      assetDecimals: result.assetDecimals,
      maxDeposit: result.maxDeposit.toString(),
      maxDepositDisplay: formatAmount(
        result.maxDeposit,
        result.assetDecimals,
        result.assetSymbol,
      ),
      totalAssets: result.totalAssets.toString(),
      totalAssetsDisplay: formatAmount(
        result.totalAssets,
        result.assetDecimals,
        result.assetSymbol,
      ),
    });
  }

  for (const entry of beefyEntries) {
    emitNdjson({
      type: 'instrument',
      protocol: entry.protocol,
      status: 'unsupported',
      instrument: entry.instrument,
      chain: entry.chain,
      vault: entry.address,
      reason: 'no standard maxDeposit() probe',
    });
  }

  if (failures.length > 0) {
    console.error('');
    console.error('Probe errors');
    for (const failure of failures) {
      console.error(
        `  ERROR | ${failure.entry.instrument} | chain=${failure.entry.chain} | vault=${failure.entry.address} | ${failure.error}`,
      );
    }
  }

  emitNdjson({
    type: 'summary',
    network,
    atCapacity: atCapacity.length,
    open: openCapacity.length,
    unsupported: beefyEntries.length,
    errors: failures.length,
  });
};

void main().catch(err => {
  const message = err instanceof Error ? err.stack || err.message : String(err);
  console.error(message);
  process.exitCode = 1;
});
