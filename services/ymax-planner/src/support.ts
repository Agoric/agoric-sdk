import { WebSocketProvider } from 'ethers';
import type { Address as EvmAddress } from 'viem';
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

export const UserInputError = class extends Error {} as ErrorConstructor;
harden(UserInputError);

type ROPartial<K extends string, V> = Readonly<Partial<Record<K, V>>>;

/**
 * @deprecated should come from e.g. @agoric/portfolio-api/src/constants.js
 *   or @agoric/orchestration
 */
export type UsdcAddresses = {
  mainnet: Record<CaipChainId, EvmAddress>;
  testnet: Record<CaipChainId, EvmAddress>;
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
  Pick<EvmContext, 'evmProviders' | 'usdcAddresses'>
> => {
  if (clusterName === 'local') clusterName = 'testnet';
  if (!alchemyApiKey) throw Error('missing alchemyApiKey');

  const wssUrls = getEvmRpcMap(clusterName, alchemyApiKey, 'wss');
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
  };
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
