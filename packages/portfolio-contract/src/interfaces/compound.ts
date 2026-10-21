/**
 * @file ABI subsets for Compound Comet and rewards controller.
 * @see {@link compoundABI} {@link compoundRewardsControllerABI}
 */
import type { Abi } from 'viem';

/**
 * @see {@link https://github.com/compound-finance/comet/blob/main/contracts/Comet.sol}
 */
export const compoundABI = [
  {
    type: 'function',
    name: 'supply',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

/**
 * @see {@link https://github.com/compound-finance/comet/blob/main/contracts/CometRewards.sol}
 */
export const compoundRewardsControllerABI = [
  {
    type: 'function',
    name: 'claim',
    inputs: [
      { name: 'comet', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'shouldAccrue', type: 'bool' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

harden(compoundABI);
harden(compoundRewardsControllerABI);
