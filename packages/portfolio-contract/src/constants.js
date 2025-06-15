/**
 * @file Shared constants and enums for portfolio contract
 * 
 * Defines the YieldProtocol enum containing supported yield protocols
 * for the portfolio management system (Aave, Compound, USDN).
 */

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
