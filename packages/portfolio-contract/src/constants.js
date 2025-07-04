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
 * @enum {(typeof MainnetAxelarChain)[keyof typeof MainnetAxelarChain]}
 *
 * Subset of Axelar Mainnet chains supported by YMax
 *
 * @see {@link https://docs.axelar.dev/resources/contract-addresses/mainnet/#evm-contract-addresses}
 */
export const MainnetAxelarChain = /** @type {const} */ ({
  Ethereum: 'Ethereum',
  Avalanche: 'Avalanche',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  Polygon: 'Polygon',
  Fantom: 'Fantom',
  binance: 'binance',
});
harden(MainnetAxelarChain);

/**
 * @enum {(typeof TestnetAxelarChain)[keyof typeof TestnetAxelarChain]}
 *
 * Subset of Axelar testnet chains supported by YMax
 *
 * @see {@link https://docs.axelar.dev/resources/contract-addresses/testnet/#evm-contract-addresses}
 */
export const TestnetAxelarChain = /** @type {const} */ ({
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
 * @enum {(typeof SupportedChain)[keyof typeof SupportedChain]}
 */
export const SupportedChain = /** @type {const} */ ({
  ...MainnetAxelarChain,
  ...TestnetAxelarChain,
  agoric: 'agoric',
  noble: 'noble',
});
harden(SupportedChain);
