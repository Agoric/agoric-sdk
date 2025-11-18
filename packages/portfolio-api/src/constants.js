// .js because the @enum idiom doesn't work in erasable typescript

/// <reference types="ses" />

import { objectMap } from '@endo/common/object-map.js';

/**
 * @import {ClusterName} from '@agoric/internal';
 * @import {CaipChainId} from '@agoric/orchestration';
 * @import {FlowConfig} from './types.js';
 */

/**
 * Configuration arguments for newly-created portfolio flows.
 *
 * This is only a default so that existing flows continue to behave as before
 * for replay fidelity.
 *
 * @type {FlowConfig | undefined}
 */
export const DEFAULT_FLOW_CONFIG = {
  features: {
    /** Enable ProgressTracker support in new flows. */
    useProgressTracker: true,
  },
};
harden(DEFAULT_FLOW_CONFIG);

/**
 * Yield protocols for Proof of Concept.
 *
 * @enum {(typeof YieldProtocol)[keyof typeof YieldProtocol]}
 */
export const YieldProtocol = /** @type {const} */ ({
  Aave: 'Aave',
  Compound: 'Compound',
  USDN: 'USDN',
  Beefy: 'Beefy',
});
harden(YieldProtocol);

/**
 * EVM chain wallet operations that incur different gas costs.
 * Supply: user is supplying assets to a yield protocol on the target chain.
 * Withdraw: user is withdrawing assets from a yield protocol on the target chain.
 * DepositForBurn: user is transferring assets off the target chain via CCTP.
 *
 * @enum {(typeof EvmWalletOperationType)[keyof typeof EvmWalletOperationType]}
 */
export const EvmWalletOperationType = /** @type {const} */ ({
  Supply: 'supply',
  Withdraw: 'withdraw',
  DepositForBurn: 'depositforburn',
});
harden(EvmWalletOperationType);

/**
 * @enum {(typeof AxelarChain)[keyof typeof AxelarChain]}
 */
export const AxelarChain = /** @type {const} */ ({
  Arbitrum: 'Arbitrum',
  Avalanche: 'Avalanche',
  Base: 'Base',
  Ethereum: 'Ethereum',
  Optimism: 'Optimism',
});
harden(AxelarChain);

/**
 * cf. https://chainlist.org/
 * XXX this probably belongs in @agoric/orchestration
 * @type {Readonly<Record<ClusterName, Readonly<Partial<Record<AxelarChain, bigint>>>>>}
 */
export const Eip155ChainIds = {
  mainnet: {
    Arbitrum: 42161n,
    Avalanche: 43114n,
    Base: 8453n,
    Ethereum: 1n,
    Optimism: 10n,
  },
  testnet: {
    Arbitrum: 421614n, // Sepolia
    Avalanche: 43113n, // Fuji
    Base: 84532n, // Sepolia
    Ethereum: 11155111n, // Sepolia
    Optimism: 11155420n, // Sepolia
  },
  local: {},
};
harden(Eip155ChainIds);

/**
 * @enum {(typeof SupportedChain)[keyof typeof SupportedChain]}
 */
export const SupportedChain = /** @type {const} */ ({
  // ...AxelarChain works locally but gets lost in .d.ts generation
  Arbitrum: 'Arbitrum',
  Avalanche: 'Avalanche',
  Base: 'Base',
  Ethereum: 'Ethereum',
  Optimism: 'Optimism',
  // Unique to this object
  agoric: 'agoric',
  noble: 'noble',
  // XXX: check privateArgs for chainInfo for all of these
});
harden(SupportedChain);

/** @type {(eip155ChainId: bigint) => CaipChainId} */
const caipChainIdFromEip155 = chainId => `eip155:${chainId}`;

/**
 * cf. https://chainagnostic.org/CAIPs/caip-2
 * Please keep in sync with ../../../services/ymax-planner/src/support.ts `spectrumChainIds`
 *
 * XXX this probably belongs in @agoric/orchestration
 *
 * @type {Readonly<Record<ClusterName, Readonly<Partial<Record<SupportedChain, CaipChainId>>>>>}
 */
export const CaipChainIds = {
  mainnet: {
    ...objectMap(Eip155ChainIds.mainnet, caipChainIdFromEip155),
    agoric: 'cosmos:agoric-3',
    noble: 'cosmos:noble-1',
  },
  testnet: {
    ...objectMap(Eip155ChainIds.testnet, caipChainIdFromEip155),
    agoric: 'cosmos:agoricdev-25',
    noble: 'cosmos:grand-1',
  },
  local: {
    ...objectMap(Eip155ChainIds.local, caipChainIdFromEip155),
  },
};
harden(CaipChainIds);

/**
 * cf. https://developers.circle.com/stablecoins/usdc-contract-addresses
 * XXX this might belong in @agoric/orchestration
 * @type {Readonly<Record<ClusterName, Readonly<Partial<Record<SupportedChain, string>>>>>}
 */
export const UsdcTokenIds = {
  mainnet: {
    Arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    Avalanche: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    Base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    Ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    Optimism: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    agoric:
      'ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9',
    noble: 'usdc',
  },
  testnet: {
    Arbitrum: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Sepolia
    Avalanche: '0x5425890298aed601595a70AB815c96711a31Bc65', // Fuji
    Base: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Sepolia
    Ethereum: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia
    Optimism: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // Sepolia
    agoric:
      'ibc/75F84596DDE9EE93010620701FFED959F3FFA1D0979F6773DE994FFEEA7D32F3',
    noble: 'usdc',
  },
  local: {},
};
harden(UsdcTokenIds);

/**
 * Strategies for portfolio rebalancing of bulk deposits.
 *
 * @enum {(typeof RebalanceStrategy)[keyof typeof RebalanceStrategy]}
 */
export const RebalanceStrategy = /** @type {const} */ ({
  /**
   * Use a strategy specified in advance by the portfolio's
   * configuration.
   */
  Preset: 'preset',
  /**
   * Divide the deposit between the positions so that the proportions between
   * the existing balances are preserved.
   */
  PreserveExistingProportions: 'pep',
});
harden(RebalanceStrategy);

/**
 * Treat account deltas smaller than this value (in micro-units) as dust.
 * This corresponds to 100 uusdc, i.e., $0.0001 for USDC.
 */
export const ACCOUNT_DUST_EPSILON = 100n;
