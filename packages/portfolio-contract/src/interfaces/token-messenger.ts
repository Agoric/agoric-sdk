/**
 * @file ABI subset for CCTP TokenMessenger.
 * @see {@link tokenMessengerABI}
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
