/**
 * @file ABIs and payload shapes for router-based remote account contracts.
 * @see {@link remoteAccountAxelarRouterABI} {@link remoteAccountABI}
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
  { name: 'value', type: 'uint192' },
  { name: 'gasLimit', type: 'uint64' },
] as const satisfies AbiParameter[];

export type ContractCall = AbiParameterToPrimitiveType<{
  type: 'tuple';
  components: typeof contractCallComponents;
}>;

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/mhofman/setup-router/packages/axelar-local-dev-cosmos/src/contracts/interfaces/IRemoteAccountRouter.sol}
 */
export const depositPermitComponents = [
  { name: 'owner', type: 'address' },
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

export type DepositPermit = AbiParameterToPrimitiveType<{
  type: 'tuple';
  components: typeof depositPermitComponents;
}>;

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/mhofman/setup-router/packages/axelar-local-dev-cosmos/src/contracts/interfaces/IRemoteAccountRouter.sol}
 */
export const routerProcessSharedInputComponents = [
  { name: 'idOrSourceChain', type: 'string' },
  { name: 'expectedAccountAddress', type: 'address' },
] as const satisfies AbiParameter[];

export const ProvideRemoteAccountInstructionComponents = [
  {
    name: 'depositPermit',
    type: 'tuple[]',
    components: depositPermitComponents,
  },
  {
    name: 'principalAccount',
    type: 'string',
  },
  {
    name: 'expectedAccountAddress',
    type: 'address',
  },
] as const satisfies AbiParameter[];
export type ProvideRemoteAccountInstruction = AbiParameterToPrimitiveType<{
  type: 'tuple';
  components: typeof ProvideRemoteAccountInstructionComponents;
}>;

export const RemoteAccountExecuteInstructionComponents = [
  {
    name: 'multiCalls',
    type: 'tuple[]',
    components: contractCallComponents,
  },
] as const satisfies AbiParameter[];
export type RemoteAccountExecuteInstruction = AbiParameterToPrimitiveType<{
  type: 'tuple';
  components: typeof RemoteAccountExecuteInstructionComponents;
}>;

export const updateOwnerInstructionComponents = [
  {
    name: 'newOwner',
    type: 'address',
  },
] as const satisfies AbiParameter[];
export type UpdateOwnerInstruction = AbiParameterToPrimitiveType<{
  type: 'tuple';
  components: typeof updateOwnerInstructionComponents;
}>;

/**
 * ABI inputs for encoding RouterPayload with encodeAbiParameters.
 */
export const processProvideRemoteAccountInstructionInputs = [
  ...routerProcessSharedInputComponents,
  {
    name: 'instruction',
    type: 'tuple',
    components: ProvideRemoteAccountInstructionComponents,
  },
] as const satisfies AbiParameter[];

export const processRemoteAccountExecuteInstructionInputs = [
  ...routerProcessSharedInputComponents,
  {
    name: 'instruction',
    type: 'tuple',
    components: RemoteAccountExecuteInstructionComponents,
  },
] as const satisfies AbiParameter[];

export const processUpdateOwnerInstructionInputs = [
  ...routerProcessSharedInputComponents,
  {
    name: 'instruction',
    type: 'tuple',
    components: updateOwnerInstructionComponents,
  },
] as const satisfies AbiParameter[];

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
    name: 'processProvideRemoteAccountInstruction',
    inputs: processProvideRemoteAccountInstructionInputs,
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'processRemoteAccountExecuteInstruction',
    inputs: processRemoteAccountExecuteInstructionInputs,
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'processUpdateOwnerInstruction',
    inputs: processUpdateOwnerInstructionInputs,
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

export type SupportedOperations = Extract<
  (typeof remoteAccountAxelarRouterABI)[number]['name'],
  `process${string}`
>;

type ExtractInstructionTypeFromOperation<T extends string> =
  T extends `process${infer U}Instruction` ? U : never;

export type SupportedInstructions =
  ExtractInstructionTypeFromOperation<SupportedOperations>;

export type RouterInstruction<T extends SupportedOperations> = {
  [K in T]: AbiParameterToPrimitiveType<
    Extract<
      (typeof remoteAccountAxelarRouterABI)[number],
      { name: K }
    >['inputs'][2]
  >;
}[T];

export type RouterOperationPayload<T extends SupportedOperations> = {
  [K in T]: {
    instructionType: ExtractInstructionTypeFromOperation<K>;
    instruction: RouterInstruction<K>;
  };
}[T];

export type RouterPayloadParams<
  T extends SupportedOperations = SupportedOperations,
> = {
  id: string;
  expectedAccountAddress: `0x${string}`;
} & RouterOperationPayload<T>;

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
    name: 'provideRemoteAccount',
    inputs: [
      { name: 'principalAccount', type: 'string' },
      { name: 'expectedOwner', type: 'address' },
      { name: 'expectedAddress', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'provideRemoteAccountForOwner',
    inputs: [
      { name: 'principalAccount', type: 'string' },
      { name: 'owner', type: 'address' },
      { name: 'expectedAddress', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
