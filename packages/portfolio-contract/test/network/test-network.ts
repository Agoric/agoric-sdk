import type { NetworkDefinition } from '../../src/network/types.js';
import { validateNetworkDefinition } from '../../src/network/types.js';

export const TEST_NETWORK: NetworkDefinition = validateNetworkDefinition({
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
    {
      src: '@Arbitrum',
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
      src: '@Avalanche',
      dest: '@noble',
      variableFee: 0,
      timeSec: 1080,
      tags: ['cctpSlow'],
    },
    {
      src: '@noble',
      dest: '@Avalanche',
      variableFee: 0,
      timeSec: 20,
      tags: ['cctpReturn'],
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
      dest: '@Ethereum',
      variableFee: 0,
      timeSec: 20,
      tags: ['cctpReturn'],
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

export default TEST_NETWORK;
