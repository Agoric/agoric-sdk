/**
 * @file ABIs and payload shapes for portfolio router contracts.
 * @see {@link portfolioRouterABI} {@link remoteAccountABI}
 */
import {
  PermitTransferFromComponents,
  PermitTransferFromInternalTypeName,
} from '@agoric/orchestration/src/utils/permit2.ts';
import type { Abi, AbiParameterToPrimitiveType } from 'viem';

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/rs-setup-router/packages/axelar-local-dev-cosmos/src/contracts/interfaces/IRemoteAccount.sol}
 */
export const contractCallComponents = [
  { name: 'target', type: 'address' },
  { name: 'data', type: 'bytes' },
] as const;

const contractCallParam = {
  name: 'call',
  type: 'tuple',
  components: contractCallComponents,
} as const;
harden(contractCallParam); // avoid unused-vars
export type ContractCall = AbiParameterToPrimitiveType<
  typeof contractCallParam
>;

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/rs-setup-router/packages/axelar-local-dev-cosmos/src/contracts/interfaces/IPortfolioRouter.sol}
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
] as const;

const depositPermitParam = {
  name: 'depositPermit',
  type: 'tuple',
  components: depositPermitComponents,
} as const;
harden(depositPermitParam);
export type DepositPermit = AbiParameterToPrimitiveType<
  typeof depositPermitParam
>;

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/rs-setup-router/packages/axelar-local-dev-cosmos/src/contracts/interfaces/IPortfolioRouter.sol}
 */
export const routerPayloadComponents = [
  {
    name: 'id',
    type: 'string',
  },
  { name: 'portfolioLCA', type: 'string' },
  { name: 'remoteAccountAddress', type: 'address' },
  { name: 'provideAccount', type: 'bool' },
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
] as const;

/**
 * ABI inputs for encoding RouterPayload with encodeAbiParameters.
 */
export const routerPayloadInputs = [
  {
    name: 'payload',
    type: 'tuple',
    components: routerPayloadComponents,
  },
] as const;

export type RouterPayload = AbiParameterToPrimitiveType<
  (typeof routerPayloadInputs)[number]
>;

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/rs-setup-router/packages/axelar-local-dev-cosmos/src/contracts/interfaces/IPortfolioRouter.sol}
 */
export const portfolioRouterABI = [
  {
    type: 'function',
    name: 'agoricLCA',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
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
] as const satisfies Abi;

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/rs-setup-router/packages/axelar-local-dev-cosmos/src/contracts/interfaces/IRemoteAccount.sol}
 */
export const remoteAccountABI = [
  {
    type: 'function',
    name: 'executeCalls',
    inputs: [
      { name: 'portfolioLCA', type: 'string' },
      {
        name: 'calls',
        type: 'tuple[]',
        components: contractCallComponents,
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'controller',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
] as const satisfies Abi;

/**
 * @see {@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/rs-setup-router/packages/axelar-local-dev-cosmos/src/contracts/interfaces/IRemoteAccountFactory.sol}
 */
export const remoteAccountFactoryABI = [
  {
    type: 'function',
    name: 'provide',
    inputs: [
      { name: 'portfolioLCA', type: 'string' },
      { name: 'expectedAddress', type: 'address' },
      { name: 'routerAddress', type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;
