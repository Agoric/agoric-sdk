/**
 * sourced from https://developers.circle.com/stablecoins/supported-domains and
 * https://chainlist.org/ on 19 March 2025
 *
 * @satisfies {Record<string, import('./orchestration-api').ChainInfo>}
 */
export default /** @type {const} } */ ({
  ethereum: {
    chainId: 'eip155:1',
    namespace: 'eip155',
    reference: '1',
    cctpDestinationDomain: 0,
  },
  // Avalanche C-Chain
  avalanche: {
    chainId: 'eip155:43114',
    namespace: 'eip155',
    reference: '43114',
    cctpDestinationDomain: 1,
  },
  // OP Mainnet
  optimism: {
    chainId: 'eip155:10',
    namespace: 'eip155',
    reference: '10',
    cctpDestinationDomain: 2,
  },
  // Arbitrum One
  arbitrum: {
    chainId: 'eip155:42161',
    namespace: 'eip155',
    reference: '42161',
    cctpDestinationDomain: 3,
  },
  noble: {
    chainId: 'noble-1', // legacy, non-CAIP-2 format
    namespace: 'cosmos',
    reference: 'noble-1',
    cctpDestinationDomain: 4,
  },
  solana: {
    chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    namespace: 'solana',
    reference: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    cctpDestinationDomain: 5,
  },
  base: {
    chainId: 'eip155:8453',
    namespace: 'eip155',
    reference: '8453',
    cctpDestinationDomain: 6,
  },
  // Polygon PoS
  polygon: {
    chainId: 'eip155:137',
    namespace: 'eip155',
    reference: '137',
    cctpDestinationDomain: 7,
  },
});
