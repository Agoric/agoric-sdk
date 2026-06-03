/**
 * @file ABI subset for a Merkle-based rewards distributor.
 * @see {@link merkleDistributorABI}
 */
import type { Abi } from 'viem';

export const merkleDistributorABI = [
  {
    type: 'function',
    name: 'claim',
    inputs: [
      { name: 'users', type: 'address[]' },
      { name: 'tokens', type: 'address[]' },
      { name: 'amounts', type: 'uint256[]' },
      { name: 'proofs', type: 'bytes32[][]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

harden(merkleDistributorABI);
