/**
 * @file Portfolio operations are either in a permit2 witness or standalone,
 * in either case, following EIP-712
 *
 * The fields included in the operation differ based on which way they're submitted.
 * In the wrapped case, we don't want to repeat stuff from the permit envelope.
 * {@link OperationTypes}
 *
 * The generic machinery lives in `@agoric/orchestration`; this module defines
 * the Ymax {@link YmaxPortfolioMessageSchema} and binds the helpers to it.
 */

import type {
  TypedDataParameter,
  TypedDataToStructType,
} from '@agoric/orchestration/src/utils/abitype.js';
import { TokenPermissionsComponents } from '@agoric/orchestration/src/utils/permit2.ts';
import {
  makeEIP712MessageKit,
  type EIP712MessageKit,
  type EIP712MessageSchema,
  type FullDomain,
  type OperationType,
  type PermitBatchWitnessTransferFromOperationData,
  type PermitWitnessTransferFromOperationData,
  type StandaloneOperationData,
  type WitnessTypeParam,
} from '@agoric/orchestration/src/utils/eip712-messages.ts';

// A param to designate the portfolio in operations by its `portfolioId`
const PortfolioIdParam = {
  name: 'portfolio',
  type: 'uint256',
} as const satisfies TypedDataParameter;

/**
 * The set of portfolio operations supported by EVM Wallets, and their associated params
 */
const OperationTypes = {
  /**
   * Open a portfolio, optionally in the same signed message enabling
   * auto-features and/or granting portfolio permissions to an automation
   * agent's Agoric address, now that `features`/`grantee` can be marked
   * `optional` in the EIP-712 type definition. This is the preferred,
   * general form of the former separate {@link OpenPortfolioWithAutoFeatures}
   * / {@link OpenPortfolioWithGrant} operations, which remain supported as
   * distinct operation types for backward compatibility with existing
   * clients/messages, but should not be needed for new callers. Granting
   * delivers the delegation to `grantee.address`, exactly as a standalone
   * {@link Grant} would; enabling auto-features behaves exactly as a
   * standalone {@link SetAutoFeatures} would.
   *
   * - allocations: initial target allocation across instruments
   * - features: auto-features to enable on open, if any
   * - grantee: delegation recipient and encoded portfolio permissions, if any
   */
  OpenPortfolio: [
    { name: 'allocations', type: 'Allocation[]' },
    { name: 'features', type: 'PortfolioAutoFeatures', optional: true },
    { name: 'grantee', type: 'DelegationGrantee', optional: true },
  ],
  /**
   * @deprecated prefer {@link OpenPortfolio} with its optional `features`
   * field. Kept as a distinct operation type for backward compatibility.
   */
  OpenPortfolioWithAutoFeatures: [
    { name: 'allocations', type: 'Allocation[]' },
    { name: 'features', type: 'PortfolioAutoFeatures' },
  ],
  /**
   * @deprecated prefer {@link OpenPortfolio} with its optional `grantee`
   * field. Kept as a distinct operation type for backward compatibility.
   */
  OpenPortfolioWithGrant: [
    { name: 'allocations', type: 'Allocation[]' },
    { name: 'grantee', type: 'DelegationGrantee' },
  ],
  Rebalance: [PortfolioIdParam],
  SetTargetAllocation: [
    { name: 'allocations', type: 'Allocation[]' },
    PortfolioIdParam,
  ],
  Deposit: [PortfolioIdParam],
  /**
   * Withdraw funds from a portfolio to the source EVM account.
   * The signer of the message must match the portfolio's source EVM account
   * The destination chain is determined from the domain info (chainId).
   * - token: ERC-20 token contract address (must be USDC contract on the destination chain)
   */
  Withdraw: [{ name: 'withdraw', type: 'Asset' }, PortfolioIdParam],
  /**
   * Grant portfolio permissions on a portfolio to another Agoric address
   * (e.g. an automation agent). The contract delivers an invitation whose
   * redeemed result can be saved in the grantee's wallet store and used via
   * wallet invocation.
   *
   * - accountHolder: bech32 Agoric address that will receive the invitation
   * - permissions: encoded portfolio permissions (see PortfolioPermissions)
   */
  Grant: [
    { name: 'accountHolder', type: 'string' },
    { name: 'permissions', type: 'PortfolioPermissions' },
    PortfolioIdParam,
  ],
  /** Atomically replace an external delegation's complete permissions. */
  ChangePermissions: [
    { name: 'agentId', type: 'uint256' },
    { name: 'permissions', type: 'PortfolioPermissions' },
    PortfolioIdParam,
  ],
  /** Irreversibly revoke an external delegation. */
  Revoke: [{ name: 'agentId', type: 'uint256' }, PortfolioIdParam],
  /**
   * Update which auto-features are enabled for a portfolio. The contract will
   * generate a permissioned delegation as necessary and deliver it to the planner.
   */
  SetAutoFeatures: [
    { name: 'features', type: 'PortfolioAutoFeatures' },
    PortfolioIdParam,
  ],
  // `satisfies Record<string, readonly TypedDataParameter[]>` rather than
  // abitype's own `TypedData` (whose `TypedDataParameter` is strictly
  // `{name, type}`) so struct fields here can carry the repo-local `optional`
  // marker without tripping excess-property checks on this literal. Downstream
  // consumption (e.g. `satisfies TypedData` on values derived from `typeof
  // OperationTypes`) is unaffected: those check a type reference structurally,
  // and an extra optional `optional?` property doesn't break assignability to
  // abitype's `TypedData`.
} as const satisfies Record<string, readonly TypedDataParameter[]>;
type OperationTypes = typeof OperationTypes;
export type OperationTypeNames = keyof OperationTypes;

const OperationSubTypes = {
  Allocation: [
    { name: 'instrument', type: 'string' },
    { name: 'portion', type: 'uint256' },
  ],
  Asset: TokenPermissionsComponents,
  /** @see {@link PortfolioPermissions} */
  PortfolioPermissions: [
    { name: 'allocation', type: 'bool', optional: true },
    { name: 'maxWeightBps', type: 'uint256', optional: true },
    { name: 'minVaultTvlUsd', type: 'uint256', optional: true },
    { name: 'maxVaultShareBps', type: 'uint256', optional: true },
  ],
  DelegationGrantee: [
    { name: 'address', type: 'string' },
    { name: 'permissions', type: 'PortfolioPermissions' },
  ],
  /**
   * @see {@link PortfolioAutoFeatures}
   *
   * Both fields are `optional` so a `SetAutoFeatures` message can flip a
   * single feature while leaving the other at its current on-chain value.
   */
  PortfolioAutoFeatures: [
    { name: 'rebalance', type: 'bool', optional: true },
    { name: 'claimRewards', type: 'bool', optional: true },
  ],
} as const satisfies Record<string, readonly TypedDataParameter[]>;

/**
 * Target allocation for portfolio positions.
 * Uses 'portion' (not 'basisPoints') to allow flexible ratios.
 * The denominator is implicitly the sum of all portions.
 *
 * Examples:
 * - [{instrument: 'A', portion: 60}, {instrument: 'B', portion: 40}] => 60:40 ratio
 * - [{instrument: 'A', portion: 6}, {instrument: 'B', portion: 4}] => 6:4 ratio (same as 60:40)
 */
export type TargetAllocation = TypedDataToStructType<
  typeof OperationSubTypes,
  'Allocation'
>;

export type PortfolioPermissionsEIP712 = TypedDataToStructType<
  typeof OperationSubTypes,
  'PortfolioPermissions'
>;

export type PortfolioAutoFeaturesEIP712 = TypedDataToStructType<
  typeof OperationSubTypes,
  'PortfolioAutoFeatures'
>;

/**
 * The schema of Ymax portfolio operation messages.
 */
export const YmaxPortfolioMessageSchema = {
  domainName: 'Ymax',
  domainVersion: '1',
  witnessFieldNamePrefix: 'ymax',
  operationTypes: OperationTypes,
  subTypes: OperationSubTypes,
} as const satisfies EIP712MessageSchema;
export type YmaxPortfolioMessageSchema = typeof YmaxPortfolioMessageSchema;

type YmaxPortfolioMessageKit = EIP712MessageKit<YmaxPortfolioMessageSchema>;
const ymaxPortfolioMessageKit: YmaxPortfolioMessageKit = makeEIP712MessageKit(
  YmaxPortfolioMessageSchema,
);

export type YmaxFullDomain = FullDomain<YmaxPortfolioMessageSchema>;

export type YmaxWitnessTypeParam<
  T extends OperationTypeNames = OperationTypeNames,
> = WitnessTypeParam<YmaxPortfolioMessageSchema, T>;

export type YmaxOperationType<T extends OperationTypeNames> = OperationType<
  YmaxPortfolioMessageSchema,
  T
>;

/**
 * @deprecated Use `getOperationTypes` of
 * `makeEIP712MessageKit(YmaxPortfolioMessageSchema)` from
 * `@agoric/orchestration/src/utils/eip712-messages.js` instead.
 */
export const getYmaxOperationTypes: YmaxPortfolioMessageKit['getOperationTypes'] =
  ymaxPortfolioMessageKit.getOperationTypes;

/**
 * @deprecated Use `getWitness` of
 * `makeEIP712MessageKit(YmaxPortfolioMessageSchema)` from
 * `@agoric/orchestration/src/utils/eip712-messages.js` instead.
 */
export const getYmaxWitness: YmaxPortfolioMessageKit['getWitness'] =
  ymaxPortfolioMessageKit.getWitness;

/**
 * @deprecated Use `getStandaloneDomain` of
 * `makeEIP712MessageKit(YmaxPortfolioMessageSchema)` from
 * `@agoric/orchestration/src/utils/eip712-messages.js` instead.
 */
export const getYmaxStandaloneDomain: YmaxPortfolioMessageKit['getStandaloneDomain'] =
  ymaxPortfolioMessageKit.getStandaloneDomain;

/**
 * @deprecated Use `getStandaloneOperationData` of
 * `makeEIP712MessageKit(YmaxPortfolioMessageSchema)` from
 * `@agoric/orchestration/src/utils/eip712-messages.js` instead.
 */
export const getYmaxStandaloneOperationData: YmaxPortfolioMessageKit['getStandaloneOperationData'] =
  ymaxPortfolioMessageKit.getStandaloneOperationData;

export type YmaxStandaloneOperationData<
  T extends OperationTypeNames = OperationTypeNames,
> = StandaloneOperationData<YmaxPortfolioMessageSchema, T>;

export type YmaxPermitWitnessTransferFromData<
  T extends OperationTypeNames = OperationTypeNames,
> = PermitWitnessTransferFromOperationData<YmaxPortfolioMessageSchema, T>;

export type YmaxPermitBatchWitnessTransferFromData<
  T extends OperationTypeNames = OperationTypeNames,
> = PermitBatchWitnessTransferFromOperationData<YmaxPortfolioMessageSchema, T>;

/**
 * @deprecated Use `validateDomainBase` of
 * `makeEIP712MessageKit(YmaxPortfolioMessageSchema)` from
 * `@agoric/orchestration/src/utils/eip712-messages.js` instead.
 */
export const validateYmaxDomainBase: YmaxPortfolioMessageKit['validateDomainBase'] =
  ymaxPortfolioMessageKit.validateDomainBase;

/**
 * @deprecated Use `validateDomain` of
 * `makeEIP712MessageKit(YmaxPortfolioMessageSchema)` from
 * `@agoric/orchestration/src/utils/eip712-messages.js` instead.
 */
export const validateYmaxDomain: YmaxPortfolioMessageKit['validateDomain'] =
  ymaxPortfolioMessageKit.validateDomain;

/**
 * @deprecated Use `validateOperationTypeName` of
 * `makeEIP712MessageKit(YmaxPortfolioMessageSchema)` from
 * `@agoric/orchestration/src/utils/eip712-messages.js` instead.
 */
export const validateYmaxOperationTypeName: YmaxPortfolioMessageKit['validateOperationTypeName'] =
  ymaxPortfolioMessageKit.validateOperationTypeName;

/**
 * @deprecated Use `splitWitnessFieldType` of
 * `makeEIP712MessageKit(YmaxPortfolioMessageSchema)` from
 * `@agoric/orchestration/src/utils/eip712-messages.js` instead.
 */
export const splitWitnessFieldType: YmaxPortfolioMessageKit['splitWitnessFieldType'] =
  ymaxPortfolioMessageKit.splitWitnessFieldType;
