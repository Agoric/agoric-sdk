// .js because the @enum idiom doesn't work in erasable typescript

/**
 * Yield protocols for Proof of Concept.
 *
 * @enum {(typeof YieldProtocol)[keyof typeof YieldProtocol]}
 */
export const YieldProtocol = /** @type {const} */ ({
  Aave: 'Aave',
  Compound: 'Compound',
  USDN: 'USDN',
});
harden(YieldProtocol);

/**
 * Subset of Axelar Mainnet chains supported by YMax
 * @see {@link https://docs.axelar.dev/resources/contract-addresses/mainnet/#evm-contract-addresses}
 */

/**
 * A subset of Axelar Mainnet chain identifiers supported by YMax.
 * These keys (AxelarIDs) correspond to supported chains listed in Axelar’s official documentation.
 *
 * Note: Some chain names (e.g. `Avalanche`, `Fantom`, `binance`) remain unchanged across
 * both mainnet and testnet.
 *
 * @typedef {Object} MainnetAxelarChain
 * @property {'Ethereum'|'Avalanche'|'arbitrum'|'optimism'|'Polygon'|'Fantom'|'binance'} AxelarChainId
 *
 * @see {@link https://docs.axelar.dev/resources/contract-addresses/mainnet/#evm-contract-addresses}
 * @see {@link https://github.com/axelarnetwork/axelarjs-sdk/blob/f84c8a21ad9685091002e24cac7001ed1cdac774/src/chains/supported-chains-list.ts | supported-chains-list.ts}
 */
const MainnetAxelarChain = /** @type {const} */ ({
  Ethereum: 'Ethereum',
  Avalanche: 'Avalanche', // same name for mainnet and testnet
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  Polygon: 'Polygon',
  Fantom: 'Fantom', // same name for mainnet and testnet
  binance: 'binance', // same name for mainnet and testnet
});
harden(MainnetAxelarChain);

/**
 * A subset of Axelar Testnet chain identifiers supported by YMax.
 * These keys (AxelarIDs) are used to map testnet environments.
 *
 * Note: Some chain names (e.g. `Avalanche`, `Fantom`, `binance`) remain unchanged across
 * both mainnet and testnet.
 *
 * @typedef {Object} TestnetAxelarChain
 * @property {'ethereum-sepolia'|'Avalanche'|'arbitrum-sepolia'|'optimism-sepolia'|'polygon-sepolia'|'Fantom'|'binance'} AxelarChainId
 *
 * @see {@link https://docs.axelar.dev/resources/contract-addresses/testnet/#evm-contract-addresses}
 * @see {@link https://github.com/axelarnetwork/axelarjs-sdk/blob/f84c8a21ad9685091002e24cac7001ed1cdac774/src/chains/supported-chains-list.ts | supported-chains-list.ts}
 */
const TestnetAxelarChain = /** @type {const} */ ({
  'ethereum-sepolia': 'ethereum-sepolia',
  Avalanche: 'Avalanche',
  'arbitrum-sepolia': 'arbitrum-sepolia',
  'optimism-sepolia': 'optimism-sepolia',
  'polygon-sepolia': 'polygon-sepolia',
  Fantom: 'Fantom',
  binance: 'binance',
});
harden(TestnetAxelarChain);

/**
 * @enum {(typeof AxelarChain)[keyof typeof AxelarChain]}
 */
export const AxelarChain = /** @type {const} */ ({
  ...MainnetAxelarChain,
  ...TestnetAxelarChain,
});
harden(AxelarChain);

/**
 * @enum {(typeof SupportedChain)[keyof typeof SupportedChain]}
 */
export const SupportedChain = /** @type {const} */ ({
  ...AxelarChain,
  agoric: 'agoric',
  noble: 'noble',
  // TODO: check privateArgs for chainInfo for all of these
});
harden(SupportedChain);

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
