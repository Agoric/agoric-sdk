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
