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
 * @enum {(typeof AxelarChain)[keyof typeof AxelarChain]}
 */
export const AxelarChain = /** @type {const} */ ({
  Ethereum: 'Ethereum',
  Avalanche: 'Avalanche',
  Base: 'Base',
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
