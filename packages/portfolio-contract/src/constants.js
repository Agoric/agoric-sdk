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
 * @enum {(typeof PortfolioChain)[keyof typeof PortfolioChain]}
 */
export const PortfolioChain = /** @type {const} */ ({
  Ethereum: 'Ethereum',
  Avalanche: 'Avalanche',
  Base: 'Base',
  Noble: 'Noble',
});
harden(PortfolioChain);
