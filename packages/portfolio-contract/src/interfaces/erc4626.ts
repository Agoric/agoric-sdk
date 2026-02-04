/**
 * @file ABI subset for ERC-4626 vaults.
 * @see {@link erc4626ABI}
 */
import type { Abi } from 'viem';

/**
 * @see {@link https://eips.ethereum.org/EIPS/eip-4626}
 */
export const erc4626ABI = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

harden(erc4626ABI);
