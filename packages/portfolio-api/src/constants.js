// .js because the @enum idiom doesn't work in erasable typescript

/// <reference types="ses" />

import { keyMirror } from '@agoric/internal';

/**
 * Yield protocols for Proof of Concept.
 *
 * @enum {(typeof YieldProtocol)[keyof typeof YieldProtocol]}
 */
export const YieldProtocol = keyMirror({
  Aave: null,
  Compound: null,
  USDN: null,
  Beefy: null,
});
harden(YieldProtocol);

/**
 * @enum {(typeof AxelarChain)[keyof typeof AxelarChain]}
 */
export const AxelarChain = keyMirror({
  Arbitrum: null,
  Avalanche: null,
  Base: null,
  Ethereum: null,
  Optimism: null,
});
harden(AxelarChain);

/**
 * @enum {(typeof SupportedChain)[keyof typeof SupportedChain]}
 */
export const SupportedChain = {
  ...AxelarChain,
  ...keyMirror({
    agoric: null,
    noble: null,
    // XXX: check privateArgs for chainInfo for all of these
  }),
};
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
