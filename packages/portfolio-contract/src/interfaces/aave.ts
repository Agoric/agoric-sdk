/**
 * @file ABI subsets for Aave V3 pool and rewards controller.
 * @see {@link aavePoolABI} {@link aaveRewardsControllerABI}
 */
import type { Abi } from 'viem';

/**
 * @see {@link https://github.com/aave/aave-v3-core/blob/master/contracts/protocol/pool/Pool.sol}
 */
export const aavePoolABI = [
  {
    type: 'function',
    name: 'supply',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
      { name: 'referralCode', type: 'uint16' },
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
      { name: 'to', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

/**
 * @see {@link https://github.com/aave/aave-v3-periphery/blob/master/contracts/rewards/RewardsController.sol}
 */
export const aaveRewardsControllerABI = [
  {
    type: 'function',
    name: 'claimAllRewardsToSelf',
    inputs: [{ name: 'assets', type: 'address[]' }],
    outputs: [
      { name: 'rewardsList', type: 'address[]' },
      { name: 'claimedAmounts', type: 'uint256[]' },
    ],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

harden(aavePoolABI);
harden(aaveRewardsControllerABI);
