import type { AbiParameter } from 'viem';

/**
 * Minimal Uniswap Universal Router ABI for execute(bytes,bytes[]).
 * Used for atomic balance checks in enforcing minimum withdrawal proceeds.
 *
 * @see https://developers.uniswap.org/docs/protocols/universal-router/concepts/commands
 */
export const universalRouterABI = [
  {
    type: 'function',
    name: 'execute',
    stateMutability: 'payable',
    inputs: [
      { name: 'commands', type: 'bytes' },
      { name: 'inputs', type: 'bytes[]' },
    ],
    outputs: [],
  },
] as const;
harden(universalRouterABI);

export const balanceCheckErc20Schema = {
  // The high bit (0x80) is the router's allow-revert flag and must stay unset:
  // this command reports a low balance as a failed command rather than
  // reverting, so with the flag set the check would be silently skipped.
  commandByte: '0x0e' as const,
  inputs: [
    { type: 'address', name: 'owner' },
    { type: 'address', name: 'token' },
    { type: 'uint256', name: 'minBalance' },
  ] as const satisfies AbiParameter[],
};
harden(balanceCheckErc20Schema);
