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
