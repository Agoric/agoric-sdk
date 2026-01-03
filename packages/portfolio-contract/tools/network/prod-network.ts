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
    { name: 'Base', control: 'axelar' },
    { name: 'Ethereum', control: 'axelar' },
    { name: 'Optimism', control: 'axelar' },
  ],
  pools: [
    { pool: 'Aave_Arbitrum', chain: 'Arbitrum', protocol: 'Aave' },
    { pool: 'Aave_Avalanche', chain: 'Avalanche', protocol: 'Aave' },
    { pool: 'Aave_Base', chain: 'Base', protocol: 'Aave' },
    { pool: 'Aave_Ethereum', chain: 'Ethereum', protocol: 'Aave' },
    { pool: 'Aave_Optimism', chain: 'Optimism', protocol: 'Aave' },
    { pool: 'Beefy_re7_Avalanche', chain: 'Avalanche', protocol: 'Beefy' },
    {
      pool: 'Beefy_morphoGauntletUsdc_Ethereum',
      chain: 'Ethereum',
      protocol: 'Beefy',
    },
    {
      pool: 'Beefy_morphoSmokehouseUsdc_Ethereum',
      chain: 'Ethereum',
      protocol: 'Beefy',
    },
    { pool: 'Beefy_morphoSeamlessUsdc_Base', chain: 'Base', protocol: 'Beefy' },
    {
      pool: 'Beefy_compoundUsdc_Optimism',
      chain: 'Optimism',
      protocol: 'Beefy',
    },
    {
      pool: 'Beefy_compoundUsdc_Arbitrum',
      chain: 'Arbitrum',
      protocol: 'Beefy',
    },
    { pool: 'Compound_Arbitrum', chain: 'Arbitrum', protocol: 'Compound' },
    { pool: 'Compound_Base', chain: 'Base', protocol: 'Compound' },
    { pool: 'Compound_Ethereum', chain: 'Ethereum', protocol: 'Compound' },
    { pool: 'Compound_Optimism', chain: 'Optimism', protocol: 'Compound' },
    { pool: 'USDN', chain: 'noble', protocol: 'USDN' },
    { pool: 'USDNVault', chain: 'noble', protocol: 'USDN' },
  ],
  localPlaces: [
    { id: '<Deposit>', chain: 'agoric' },
    { id: '<Cash>', chain: 'agoric' },
  ],
  links: [
    // USDN costs a fee to get into
    {
      src: '@noble',
      dest: 'USDN',
      transfer: 'local',
      variableFeeBps: 10,
      timeSec: 0,
      feeMode: 'toUSDN',
    },
    {
      src: '@noble',
      dest: 'USDNVault',
      transfer: 'local',
      variableFeeBps: 10,
      timeSec: 0,
      feeMode: 'toUSDN',
    },

    // CCTP slow (inbound auto-forward compressed: EVM -> @agoric)
    // Latency kept at 1080s (assuming IBC forward overlaps); adjust if sequential.
    {
      src: '@Arbitrum',
      dest: '@agoric',
      transfer: 'cctpSlow',
      variableFeeBps: 0,
      timeSec: 1080,
      feeMode: 'evmToNoble',
    },
    {
      src: '@Avalanche',
      dest: '@agoric',
      transfer: 'cctpSlow',
      variableFeeBps: 0,
      timeSec: 1080,
      feeMode: 'evmToNoble',
    },
    {
      src: '@Ethereum',
      dest: '@agoric',
      transfer: 'cctpSlow',
      variableFeeBps: 0,
      timeSec: 1080,
      feeMode: 'evmToNoble',
    },
    {
      src: '@Optimism',
      dest: '@agoric',
      transfer: 'cctpSlow',
      variableFeeBps: 0,
      timeSec: 1080,
      feeMode: 'evmToNoble',
    },
    {
      src: '@Base',
      dest: '@agoric',
      transfer: 'cctpSlow',
      variableFeeBps: 0,
      timeSec: 1080,
      feeMode: 'evmToNoble',
    },
    // CCTP return (fast on return path)
    {
      src: '@noble',
      dest: '@Arbitrum',
      transfer: 'cctpReturn',
      variableFeeBps: 0,
      timeSec: 20,
      feeMode: 'makeEvmAccount',
    },
    {
      src: '@noble',
      dest: '@Avalanche',
      transfer: 'cctpReturn',
      variableFeeBps: 0,
      timeSec: 20,
      feeMode: 'makeEvmAccount',
    },
    {
      src: '@noble',
      dest: '@Ethereum',
      transfer: 'cctpReturn',
      variableFeeBps: 0,
      timeSec: 20,
      feeMode: 'makeEvmAccount',
    },
    {
      src: '@noble',
      dest: '@Optimism',
      transfer: 'cctpReturn',
      variableFeeBps: 0,
      timeSec: 20,
      feeMode: 'makeEvmAccount',
    },
    {
      src: '@noble',
      dest: '@Base',
      transfer: 'cctpReturn',
      variableFeeBps: 0,
      timeSec: 20,
      feeMode: 'makeEvmAccount',
    },
    // IBC connectivity (explicit both directions required for USDN and other noble-origin flows)
    {
      src: '@agoric',
      dest: '@noble',
      transfer: 'ibc',
      variableFeeBps: 0,
      timeSec: 10,
    },
    {
      src: '@noble',
      dest: '@agoric',
      transfer: 'ibc',
      variableFeeBps: 0,
      timeSec: 10,
    },
  ],
};

export default PROD_NETWORK;
