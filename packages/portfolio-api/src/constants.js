// .js because the @enum idiom doesn't work in erasable typescript

/// <reference types="ses" />

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
 * @enum {(typeof AxelarChain)[keyof typeof AxelarChain]}
 */
export const AxelarChain = /** @type {const} */ ({
  Arbitrum: 'Arbitrum',
  Avalanche: 'Avalanche',
  Base: 'Base',
  Ethereum: 'Ethereum',
  Optimism: 'Optimism',
  Polygon: 'Polygon',
});
harden(AxelarChain);

/**
 * @enum {(typeof SupportedChain)[keyof typeof SupportedChain]}
 */
export const SupportedChain = /** @type {const} */ ({
  ...AxelarChain,
  agoric: 'agoric',
  noble: 'noble',
  // XXX: check privateArgs for chainInfo for all of these
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
