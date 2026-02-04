/**
 * @file ABIs and payload shapes for portfolio router contracts.
 * @see {@link portfolioRouterABI} {@link remoteAccountABI}
 */
import {
  PermitTransferFromComponents,
  PermitTransferFromInternalTypeName,
} from '@agoric/orchestration/src/utils/permit2.ts';
import type { Abi, AbiParameter, AbiParameterToPrimitiveType } from 'viem';

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/mhofman/setup-router/packages/axelar-local-dev-cosmos/src/contracts/interfaces/IRemoteAccount.sol}
 */
export const contractCallComponents = [
  { name: 'target', type: 'address' },
  { name: 'data', type: 'bytes' },
] as const satisfies AbiParameter[];

const contractCallParam = {
  name: 'call',
  type: 'tuple',
  components: contractCallComponents,
} as const satisfies AbiParameter;
harden(contractCallParam); // avoid unused-vars
export type ContractCall = AbiParameterToPrimitiveType<
  typeof contractCallParam
>;

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/mhofman/setup-router/packages/axelar-local-dev-cosmos/src/contracts/interfaces/IRemoteAccountRouter.sol}
 */
export const depositPermitComponents = [
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
] as const satisfies AbiParameter[];

const depositPermitParam = {
  name: 'depositPermit',
  type: 'tuple',
  components: depositPermitComponents,
} as const satisfies AbiParameter;
harden(depositPermitParam);
export type DepositPermit = AbiParameterToPrimitiveType<
  typeof depositPermitParam
>;

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/mhofman/setup-router/packages/axelar-local-dev-cosmos/src/contracts/interfaces/IRemoteAccountRouter.sol}
 */
export const routerInstructionBaseComponents = [
  { name: 'id', type: 'string' },
  { name: 'expectedAccountAddress', type: 'address' },
] as const satisfies AbiParameter[];

export const routerRemoteAccountInstructionComponents = [
  {
    name: 'depositPermit',
    type: 'tuple[]',
    components: depositPermitComponents,
  },
  {
    name: 'multiCalls',
    type: 'tuple[]',
    components: contractCallComponents,
  },
] as const satisfies AbiParameter[];

/**
 * ABI inputs for encoding RouterPayload with encodeAbiParameters.
 */
export const processInstructionInputs = [
  { name: 'sourceAddress', type: 'string' },
  {
    name: 'instruction',
    type: 'tuple',
    components: [
      ...routerInstructionBaseComponents,
      ...routerRemoteAccountInstructionComponents,
    ],
  },
] as const satisfies AbiParameter[];

export type RouterInstruction = AbiParameterToPrimitiveType<
  (typeof processInstructionInputs)[1]
>;

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/mhofman/setup-router/packages/axelar-local-dev-cosmos/src/contracts/interfaces/IRemoteAccountRouter.sol}
 */
export const remoteAccountAxelarRouterABI = [
  {
    type: 'function',
    name: 'factory',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'permit2',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'execute',
    inputs: [
      { name: 'commandId', type: 'bytes32' },
      { name: 'sourceChain', type: 'string' },
      { name: 'sourceAddress', type: 'string' },
      { name: 'payload', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'processInstruction',
    inputs: processInstructionInputs,
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/mhofman/setup-router/packages/axelar-local-dev-cosmos/src/contracts/interfaces/IRemoteAccount.sol}
 */
export const remoteAccountABI = [
  {
    type: 'constructor',
    inputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'executeCalls',
    inputs: [
      {
        name: 'calls',
        type: 'tuple[]',
        components: contractCallComponents,
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/mhofman/setup-router/packages/axelar-local-dev-cosmos/src/contracts/interfaces/IRemoteAccountFactory.sol}
 */
export const remoteAccountFactoryABI = [
  {
    type: 'function',
    name: 'provide',
    inputs: [
      { name: 'principalAccount', type: 'string' },
      { name: 'expectedRouter', type: 'address' },
      { name: 'expectedAddress', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'provideForRouter',
    inputs: [
      { name: 'principalAccount', type: 'string' },
      { name: 'router', type: 'address' },
      { name: 'expectedAddress', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
