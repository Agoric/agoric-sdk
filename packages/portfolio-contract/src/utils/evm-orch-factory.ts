/**
 * @file Utilities for using Factory.sol to emulate orchestration
 * `chain.makeAccount()` behavior on EVM chains (CREATE2 prediction, etc.).
 */
import {
  PermitTransferFromComponents,
  PermitTransferFromInternalTypeName,
} from '@agoric/orchestration/src/utils/permit2.ts';
import { assert } from '@endo/errors';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import type { Abi, AbiParameterToPrimitiveType, Hex } from 'viem';
import { computeCreate2Address, hashInitCode } from './create2.ts';

// TODO: refactor EVMInterface to use { type: 'address', name: '...' }
type FactoryI = {
  constructor: ['address', 'address', 'string'];
};
const Factory: FactoryI = {
  constructor: ['address', 'address', 'string'],
} as const;

const toUtf8 = (() => {
  // TextEncoder has state. encapsulate it.
  const textEncoder = new TextEncoder();
  return (s: string) => textEncoder.encode(s);
})();

export const predictWalletAddress = ({
  factoryAddress,
  walletBytecode,
  gatewayAddress,
  gasServiceAddress,
  owner,
}: {
  factoryAddress: Hex;
  walletBytecode: Uint8Array;
  gatewayAddress: Hex;
  gasServiceAddress: Hex;
  owner: string;
}): Hex => {
  assert(owner.length > 0);
  const salt = keccak256(toUtf8(owner));
  const initCodeHash = hashInitCode(
    walletBytecode,
    Factory.constructor,
  )([gatewayAddress, gasServiceAddress, owner]);

  const out = computeCreate2Address({
    deployer: factoryAddress,
    salt,
    initCodeHash,
  });
  return out;
};

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/main/packages/axelar-local-dev-cosmos/src/contracts/Factory.sol Factory.sol (_execute method)}
 * 1520650 2026-01-24
 */
export const factoryABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'gateway_', type: 'address' },
      { name: 'gasReceiver_', type: 'address' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'createSmartWallet',
    inputs: [{ name: 'expectedWalletAddress', type: 'address' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'event',
    name: 'SmartWalletCreated',
    anonymous: false,
    inputs: [
      { name: 'wallet', type: 'address', indexed: true },
      { name: 'owner', type: 'string', indexed: false },
      { name: 'sourceChain', type: 'string', indexed: false },
    ],
  },
] as const satisfies Abi;

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/main/packages/axelar-local-dev-cosmos/src/contracts/DepositFactory.sol DepositFactory.sol}
 * 1520650 2026-01-24
 */
export const depositFactoryABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'gateway_', type: 'address' },
      { name: 'gasReceiver_', type: 'address' },
      { name: 'permit2_', type: 'address' },
      { name: 'owner_', type: 'string' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'createAndDeposit',
    inputs: [
      {
        type: 'tuple',
        name: 'p',
        components: [
          { name: 'lcaOwner', type: 'string' },
          { name: 'tokenOwner', type: 'address' },
          {
            name: 'permit',
            type: 'tuple',
            internalType: PermitTransferFromInternalTypeName,
            components: PermitTransferFromComponents,
          },
          { name: 'witness', type: 'bytes32' },
          { name: 'witnessTypeString', type: 'string' },
          { name: 'signature', type: 'bytes' },
          { name: 'expectedWalletAddress', type: 'address' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

const depositFactoryCreateAndDeposit = depositFactoryABI.find(
  (
    item,
  ): item is Extract<
    (typeof depositFactoryABI)[number],
    { type: 'function'; name: 'createAndDeposit' }
  > => item.type === 'function' && item.name === 'createAndDeposit',
);
if (!depositFactoryCreateAndDeposit) {
  throw new Error('depositFactoryABI missing createAndDeposit');
}

export const depositFactoryCreateAndDepositInputs =
  depositFactoryCreateAndDeposit.inputs ?? [];

type DepositFactoryCreateAndDepositInput = NonNullable<
  (typeof depositFactoryCreateAndDeposit)['inputs']
>[0];
export type CreateAndDepositPayload =
  AbiParameterToPrimitiveType<DepositFactoryCreateAndDepositInput>;

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/main/packages/axelar-local-dev-cosmos/src/contracts/Wallet.sol Wallet.sol}
 * 1520650 2026-01-24
 */
export const walletABI = [
  {
    type: 'constructor',
    inputs: [
      { name: 'gateway_', type: 'address' },
      { name: 'gasReceiver_', type: 'address' },
      { name: 'owner_', type: 'string' },
    ],
    stateMutability: 'payable',
  },
  {
    type: 'event',
    name: 'CallStatus',
    anonymous: false,
    inputs: [
      { name: 'id', type: 'string', indexed: true },
      { name: 'callIndex', type: 'uint256', indexed: true },
      { name: 'target', type: 'address', indexed: true },
      { name: 'methodSelector', type: 'bytes4', indexed: false },
      { name: 'success', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MulticallStatus',
    anonymous: false,
    inputs: [
      { name: 'id', type: 'string', indexed: true },
      { name: 'success', type: 'bool', indexed: false },
      { name: 'totalCalls', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Received',
    anonymous: false,
    inputs: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const satisfies Abi;

const walletMulticallABI = [
  {
    type: 'function',
    name: '_multicall',
    inputs: [
      {
        type: 'tuple',
        name: 'callMessage',
        components: [
          { name: 'id', type: 'string' },
          {
            name: 'calls',
            type: 'tuple[]',
            components: [
              { name: 'target', type: 'address' },
              { name: 'data', type: 'bytes' },
            ],
          },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

export const walletCallMessageParams = walletMulticallABI[0].inputs ?? [];
