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
 * @enum {(typeof AxelarChains)[keyof typeof AxelarChains]}
 */
export const AxelarChains = /** @type {const} */ ({
  Ethereum: 'Ethereum',
  Avalanche: 'Avalanche',
  Arbitrum: 'Arbitrum',
  Optimism: 'Optimism',
  Polygon: 'Polygon',
  Fantom: 'Fantom',
  BNB: 'BNB',
});
harden(AxelarChains);
