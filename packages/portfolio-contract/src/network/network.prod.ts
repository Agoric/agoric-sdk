import type { NetworkSpec } from './network-spec.js';

// Initial production network in NetworkSpec format
export const PROD_NETWORK: NetworkSpec = {
  // Enable debug diagnostics to aid troubleshooting in tests
  debug: true,
  environment: 'prod',
  chains: [
    { name: 'agoric', control: 'local' },
    { name: 'noble', control: 'ibc' },
    { name: 'Arbitrum', control: 'axelar' },
    { name: 'Avalanche', control: 'axelar' },
    { name: 'Ethereum', control: 'axelar' },
  ],
  pools: [
    { pool: 'Aave_Arbitrum', chain: 'Arbitrum', protocol: 'Aave' },
    { pool: 'Beefy_re7_Avalanche', chain: 'Avalanche', protocol: 'Beefy' },
    { pool: 'Compound_Ethereum', chain: 'Ethereum', protocol: 'Compound' },
  ],
  localPlaces: [
    { id: '<Deposit>', chain: 'agoric' },
    { id: '<Cash>', chain: 'agoric' },
    { id: '+agoric', chain: 'agoric' },
  ],
  links: [
    // CCTP slow
    {
      src: 'Arbitrum',
      dest: 'noble',
      transfer: 'cctpSlow',
      variableFeeBps: 0,
      timeSec: 1080,
    },
    {
      src: 'Avalanche',
      dest: 'noble',
      transfer: 'cctpSlow',
      variableFeeBps: 0,
      timeSec: 1080,
    },
    {
      src: 'Ethereum',
      dest: 'noble',
      transfer: 'cctpSlow',
      variableFeeBps: 0,
      timeSec: 1080,
    },
    // CCTP return (fast on return path)
    {
      src: 'noble',
      dest: 'Arbitrum',
      transfer: 'cctpReturn',
      variableFeeBps: 0,
      timeSec: 20,
    },
    {
      src: 'noble',
      dest: 'Avalanche',
      transfer: 'cctpReturn',
      variableFeeBps: 0,
      timeSec: 20,
    },
    {
      src: 'noble',
      dest: 'Ethereum',
      transfer: 'cctpReturn',
      variableFeeBps: 0,
      timeSec: 20,
    },
    // Fast USDC (Axelar GMP)
    {
      src: 'Arbitrum',
      dest: 'noble',
      transfer: 'fastusdc',
      variableFeeBps: 15,
      timeSec: 45,
    },
    {
      src: 'Avalanche',
      dest: 'noble',
      transfer: 'fastusdc',
      variableFeeBps: 15,
      timeSec: 45,
    },
    {
      src: 'Ethereum',
      dest: 'noble',
      transfer: 'fastusdc',
      variableFeeBps: 15,
      timeSec: 45,
    },
    // IBC between agoric and noble
    { src: 'agoric', dest: 'noble', transfer: 'ibc', variableFeeBps: 0, timeSec: 10 },
    { src: 'noble', dest: 'agoric', transfer: 'ibc', variableFeeBps: 0, timeSec: 10 },
  ],
};

export default PROD_NETWORK;
