/**
 * @file ABI subset for wallet helper utilities.
 * @see {@link walletHelperABI}
 */
import type { Abi } from 'viem';

/**
 * Beefy-specific helper invoked by the portfolio smart wallet to perform
 * a withdraw flow that is awkward to express as raw multicall steps.
 * @see {@link ../pos-gmp.flows.ts}
 */
export const walletHelperABI = [
  {
    type: 'function',
    name: 'beefyWithdrawUSDC',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

harden(walletHelperABI);
