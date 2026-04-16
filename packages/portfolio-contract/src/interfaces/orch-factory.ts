/**
 * @file ABIs for Factory/DepositFactory and wallet events.
 * @see {@link factoryABI} {@link depositFactoryABI} {@link walletABI}
 */
import {
  PermitTransferFromInternalTypeName,
  PermitTransferFromComponents,
} from '@agoric/orchestration/src/utils/permit2.js';
import type { Abi } from 'viem';

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/main/packages/axelar-local-dev-cosmos/src/contracts/Factory.sol}
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
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/main/packages/axelar-local-dev-cosmos/src/contracts/DepositFactory.sol}
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

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/main/packages/axelar-local-dev-cosmos/src/contracts/Wallet.sol}
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

/**
 * Methods whose payload structure we need, even though they are not public.
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/main/packages/axelar-local-dev-cosmos/src/contracts/Wallet.sol}
 */
export const walletMulticallABI = [
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

harden(factoryABI);
harden(depositFactoryABI);
harden(walletABI);
harden(walletMulticallABI);
