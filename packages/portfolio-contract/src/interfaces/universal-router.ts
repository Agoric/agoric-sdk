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
