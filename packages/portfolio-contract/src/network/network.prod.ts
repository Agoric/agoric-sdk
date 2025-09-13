import type { NetworkDefinition } from './types.js';
import { validateNetworkDefinition } from './types.js';

// Initial production network (static placeholder)
export const PROD_NETWORK: NetworkDefinition = validateNetworkDefinition({
  nodes: [
    '@agoric',
    '@noble',
    '@Arbitrum',
    '@Avalanche',
    '@Ethereum',
    '<Deposit>',
    '<Cash>',
    '+agoric',
    'Aave_Arbitrum',
    'Beefy_re7_Avalanche',
    'Compound_Ethereum',
  ],
  edges: [
    // Inter-chain hub edges (similar to previous LINKS array)
    {
      src: '@Arbitrum',
      dest: '@noble',
      variableFee: 0,
      timeSec: 1080,
      tags: ['cctpSlow'],
    },
    {
      src: '@Avalanche',
      dest: '@noble',
      variableFee: 0,
      timeSec: 1080,
      tags: ['cctpSlow'],
    },
    {
      src: '@Ethereum',
      dest: '@noble',
      variableFee: 0,
      timeSec: 1080,
      tags: ['cctpSlow'],
    },
    {
      src: '@noble',
      dest: '@Arbitrum',
      variableFee: 0,
      timeSec: 20,
      tags: ['cctpReturn'],
    },
    {
      src: '@noble',
      dest: '@Avalanche',
      variableFee: 0,
      timeSec: 20,
      tags: ['cctpReturn'],
    },
    {
      src: '@noble',
      dest: '@Ethereum',
      variableFee: 0,
      timeSec: 20,
      tags: ['cctpReturn'],
    },
    {
      src: '@Arbitrum',
      dest: '@noble',
      variableFee: 0.0015,
      timeSec: 45,
      tags: ['fast'],
    },
    {
      src: '@Avalanche',
      dest: '@noble',
      variableFee: 0.0015,
      timeSec: 45,
      tags: ['fast'],
    },
    {
      src: '@Ethereum',
      dest: '@noble',
      variableFee: 0.0015,
      timeSec: 45,
      tags: ['fast'],
    },
    {
      src: '@agoric',
      dest: '@noble',
      variableFee: 2,
      timeSec: 10,
      tags: ['ibc'],
    },
    {
      src: '@noble',
      dest: '@agoric',
      variableFee: 2,
      timeSec: 10,
      tags: ['ibc'],
    },
  ],
});

export default PROD_NETWORK;
