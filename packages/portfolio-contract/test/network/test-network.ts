/* eslint-disable camelcase */

import type { SupportedChain } from '@agoric/portfolio-api/src/constants.js';
import type { NetworkSpec } from '../../src/network/network-spec.js';
import type { PoolKey } from '../../src/type-guards.js';
import type { AssetPlaceRef } from '../../src/type-guards-steps.js';

// @ts-expect-error TS2322: Type '"Polygon"' is not assignable to type 'SupportedChain'.
const Polygon: SupportedChain = 'Polygon';

// @ts-expect-error TS2322: Type '"Compound_Polygon"' is not assignable to type 'PoolKey'.
const Compound_Polygon: PoolKey = 'Compound_Polygon';

export const TEST_NETWORK: NetworkSpec = {
  debug: true,
  environment: 'test',
  chains: [
    { name: 'agoric', control: 'local' },
    { name: 'noble', control: 'ibc' },
    { name: 'Arbitrum', control: 'axelar' },
    { name: 'Avalanche', control: 'axelar' },
    { name: Polygon, control: 'axelar' },
    { name: 'Ethereum', control: 'axelar' },
  ],
  pools: [
    { pool: 'Aave_Arbitrum', chain: 'Arbitrum', protocol: 'Aave' },
    { pool: 'Beefy_re7_Avalanche', chain: 'Avalanche', protocol: 'Beefy' },
    { pool: 'Compound_Ethereum', chain: 'Ethereum', protocol: 'Compound' },
    { pool: 'Aave_Avalanche', chain: 'Avalanche', protocol: 'Aave' },
    { pool: Compound_Polygon, chain: Polygon, protocol: 'Compound' },
    { pool: 'USDN', chain: 'noble', protocol: 'USDN' },
    { pool: 'USDNVault', chain: 'noble', protocol: 'USDN' },
  ],
  localPlaces: [
    // Agoric seats/accounts
    { id: '<Deposit>', chain: 'agoric' },
    { id: '<Cash>', chain: 'agoric' },
    { id: '+agoric', chain: 'agoric' },
  ],
  links: [
    // USDN costs a fee to get into
    { src: '@noble', dest: 'USDN', transfer: 'local', variableFeeBps: 5, timeSec: 0, feeMode: 'toUSDN' },
    { src: '@noble', dest: 'USDNVault', transfer: 'local', variableFeeBps: 5, timeSec: 0, feeMode: 'toUSDN' },

    // CCTP slow towards noble
    { src: '@Polygon' as AssetPlaceRef, dest: '@noble', transfer: 'cctpSlow', variableFeeBps: 0, timeSec: 1080 },
    { src: '@Arbitrum', dest: '@noble', transfer: 'cctpSlow', variableFeeBps: 0, timeSec: 1080 },
    { src: '@Avalanche', dest: '@noble', transfer: 'cctpSlow', variableFeeBps: 0, timeSec: 1080 },
    { src: '@Ethereum', dest: '@noble', transfer: 'cctpSlow', variableFeeBps: 0, timeSec: 1080 },
    // Return path
    { src: '@noble', dest: '@Arbitrum', transfer: 'cctpReturn', variableFeeBps: 0, timeSec: 20, feeMode: 'gmpTransfer' },
    { src: '@noble', dest: '@Polygon' as AssetPlaceRef, transfer: 'cctpReturn', variableFeeBps: 0, timeSec: 20, feeMode: 'gmpTransfer' },
    { src: '@noble', dest: '@Avalanche', transfer: 'cctpReturn', variableFeeBps: 0, timeSec: 20, feeMode: 'gmpTransfer' },
    { src: '@noble', dest: '@Ethereum', transfer: 'cctpReturn', variableFeeBps: 0, timeSec: 20, feeMode: 'gmpTransfer' },
    // IBC agoric<->noble
    { src: '@agoric', dest: '@noble', transfer: 'ibc', variableFeeBps: 0, timeSec: 10 },
    { src: '@noble', dest: '@agoric', transfer: 'ibc', variableFeeBps: 0, timeSec: 10 },
  ],
};

export default TEST_NETWORK;
