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

// TODO: pass via terms?
/**
 * @enum {(typeof PortfolioChain)[keyof typeof PortfolioChain]}
 */
export const PortfolioChain = /** @type {const} */ ({
  Ethereum: 'eip155:1',
  Avalanche: 'eip155:43114',
  Base: 'eip155:8453',
  Noble: 'cosmos:noble-1',
});
harden(PortfolioChain);
