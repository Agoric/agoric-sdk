/** @import { YdsInstruments } from '../src/token-meta.js'; */

export const arbitrumCaip2Id = 'eip155:42161';
export const arbitrumSepoliaCaip2Id = 'eip155:421614';

/** @type {Record<string, YdsInstruments['data'][number]>} */
export const ydsInstruments = {
  Aave_Arbitrum: {
    asset: { symbol: 'USDC' },
    caipChainId: arbitrumCaip2Id,
    id: 'Aave_Arbitrum',
    protocol: {
      id: 'aave',
      name: 'Aave',
    },
  },
};

/** @type {Record<string, YdsInstruments['data'][number]>} */
export const ydsTestnetInstruments = {
  Aave_ArbitrumSepolia: {
    asset: { symbol: 'USDC' },
    caipChainId: arbitrumSepoliaCaip2Id,
    id: 'Aave_Arbitrum',
    protocol: {
      id: 'aave',
      name: 'Aave',
    },
  },
};
