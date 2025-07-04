/**
 * sourced from https://developers.circle.com/stablecoins/supported-domains and
 * https://chainlist.org/ on 19 March 2025
 *
 * @satisfies {Record<string, import('./orchestration-api').BaseChainInfo>}
 */
export default /** @type {const} } */ ({
  ethereum: {
    namespace: 'eip155',
    reference: '1',
    cctpDestinationDomain: 0,
  },
  // Avalanche C-Chain
  avalanche: {
    namespace: 'eip155',
    reference: '43114',
    cctpDestinationDomain: 1,
  },
  // OP Mainnet
  optimism: {
    namespace: 'eip155',
    reference: '10',
    cctpDestinationDomain: 2,
  },
  // Arbitrum One
  arbitrum: {
    namespace: 'eip155',
    reference: '42161',
    cctpDestinationDomain: 3,
  },
  noble: {
    namespace: 'cosmos',
    reference: 'noble-1',
    cctpDestinationDomain: 4,
  },
  solana: {
    namespace: 'solana',
    reference: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    cctpDestinationDomain: 5,
  },
  base: {
    namespace: 'eip155',
    reference: '8453',
    cctpDestinationDomain: 6,
  },
  // Polygon PoS
  polygon: {
    namespace: 'eip155',
    reference: '137',
    cctpDestinationDomain: 7,
  },
});

/**
 * Mainnet chains only.
 *
 * Sourced from:
 *
 * - https://developers.circle.com/stablecoins/supported-domains
 * - https://chainlist.org/
 * - https://docs.simplehash.com/reference/supported-chains-testnets (accessed on
 *   4 July 2025)
 *
 * @satisfies {Record<string, import('./orchestration-api').BaseChainInfo>}
 */
export const axelarCCTPConfig = {
  Ethereum: {
    namespace: 'eip155',
    reference: '1',
    cctpDestinationDomain: 0,
  },
  Avalanche: {
    namespace: 'eip155',
    reference: '43114',
    cctpDestinationDomain: 1,
  },
  optimism: {
    namespace: 'eip155',
    reference: '10',
    cctpDestinationDomain: 2,
  },
  arbitrum: {
    namespace: 'eip155',
    reference: '42161',
    cctpDestinationDomain: 3,
  },
  Polygon: {
    namespace: 'eip155',
    reference: '137',
    cctpDestinationDomain: 7,
  },
  Fantom: {
    namespace: 'eip155',
    reference: '250',
  },
  binance: {
    namespace: 'eip155',
    reference: '56',
  },
};

/**
 * Testnet chains only.
 *
 * Sourced from:
 *
 * - https://developers.circle.com/stablecoins/supported-domains
 * - https://chainlist.org/
 * - https://docs.simplehash.com/reference/supported-chains-testnets (accessed on
 *   4 July 2025)
 *
 * @satisfies {Record<string, import('./orchestration-api').BaseChainInfo>}
 */
export const axelarCCTPConfigTestnet = {
  'ethereum-sepolia': {
    namespace: 'eip155',
    reference: '11155111',
    cctpDestinationDomain: 0,
  },
  Avalanche: {
    namespace: 'eip155',
    reference: '43113',
    cctpDestinationDomain: 1,
  },
  'optimism-sepolia': {
    namespace: 'eip155',
    reference: '11155420',
    cctpDestinationDomain: 2,
  },
  'arbitrum-sepolia': {
    namespace: 'eip155',
    reference: '421614',
    cctpDestinationDomain: 3,
  },
  'polygon-sepolia': {
    namespace: 'eip155',
    reference: '80002',
    cctpDestinationDomain: 7,
  },
  Fantom: {
    namespace: 'eip155',
    reference: '4002', // XXX: confirm this ID
  },
  binance: {
    namespace: 'eip155',
    reference: '97',
  },
};
