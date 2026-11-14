/** ABI subset for Morpho's Bundler3 minimum-price redemption path. */
import type { Abi } from 'viem';

/** @see https://github.com/morpho-org/bundler3/blob/main/src/interfaces/IBundler3.sol */
export const bundler3ABI = [
  {
    type: 'function',
    name: 'multicall',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'bundle',
        type: 'tuple[]',
        components: [
          { name: 'to', type: 'address' },
          { name: 'data', type: 'bytes' },
          { name: 'value', type: 'uint256' },
          { name: 'skipRevert', type: 'bool' },
          { name: 'callbackHash', type: 'bytes32' },
        ],
      },
    ],
    outputs: [],
  },
] as const satisfies Abi;

/** @see https://github.com/morpho-org/bundler3/blob/main/src/adapters/GeneralAdapter1.sol */
export const generalAdapter1ABI = [
  {
    type: 'function',
    name: 'erc4626Redeem',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'vault', type: 'address' },
      { name: 'shares', type: 'uint256' },
      { name: 'minSharePriceE27', type: 'uint256' },
      { name: 'receiver', type: 'address' },
      { name: 'owner', type: 'address' },
    ],
    outputs: [],
  },
] as const satisfies Abi;

harden(bundler3ABI);
harden(generalAdapter1ABI);
