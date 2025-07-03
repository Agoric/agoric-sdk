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
 *
 * Subset of Axelar chains supported by YMax
 *
 * @see {@link https://docs.axelar.dev/resources/contract-addresses/mainnet/#evm-contract-addresses}
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
});
harden(SupportedChain);
