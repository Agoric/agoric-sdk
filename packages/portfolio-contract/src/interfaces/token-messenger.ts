/**
 * @file ABI subset for CCTP TokenMessenger variants.
 * @see {@link tokenMessengerABI}
 * @see {@link tokenMessengerV2ABI}
 */
import type { Abi } from 'viem';

/**
 * @see {@link https://github.com/circlefin/evm-cctp-contracts/blob/master/src/TokenMessenger.sol}
 */
export const tokenMessengerABI = [
  {
    type: 'function',
    name: 'depositForBurn',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

harden(tokenMessengerABI);

/**
 * @see {@link https://github.com/circlefin/evm-cctp-contracts/blob/master/src/v2/TokenMessengerV2.sol}
 */
export const tokenMessengerV2ABI = [
  {
    type: 'function',
    name: 'depositForBurn',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
      { name: 'destinationCaller', type: 'bytes32' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'minFinalityThreshold', type: 'uint32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

harden(tokenMessengerV2ABI);
