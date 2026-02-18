/**
 * @file Portfolio operations are either in a permit2 witness or standalone,
 * in either case, following EIP-712
 *
 * The fields included in the operation differ based on which way they're submitted.
 * In the wrapped case, we don't want to repeat stuff from the permit envelope.
 * {@link OperationTypes}
 *
 * Currently all types and helpers are built around a hard-coded Ymax product
 * name but with some effort this could be parametrizable
 */

import type {
  Address,
  TypedData,
  TypedDataDomain,
  TypedDataToPrimitiveTypes,
} from 'abitype';
import type { TypedDataDefinition } from 'viem';
import { Fail, q } from '@endo/errors';
import type { TypedDataParameter } from '@agoric/orchestration/src/utils/abitype.js';
import {
  type Witness,
  type getPermitWitnessTransferFromData,
  type getPermitBatchWitnessTransferFromData,
  makeWitness,
  TokenPermissionsComponents,
} from '@agoric/orchestration/src/utils/permit2.js';

const YMAX_DOMAIN_NAME = 'Ymax';
const YMAX_DOMAIN_VERSION = '1';

const YMAX_WITNESS_FIELD_NAME_PREFIX = 'ymax';

const StandaloneDomainTypeParams = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
] as const satisfies TypedDataParameter[];

const YmaxStandaloneDomainBase = {
  name: YMAX_DOMAIN_NAME,
  version: YMAX_DOMAIN_VERSION,
} as const satisfies TypedDataDomain;
export type YmaxSharedDomain = typeof YmaxStandaloneDomainBase & {
  chainId: bigint;
};
export type YmaxStandaloneDomain = YmaxSharedDomain & {
  verifyingContract: Address;
};

// A param to designate the portfolio in operations by its `portfolioId`
const PortfolioIdParam = {
  name: 'portfolio',
  type: 'uint256',
} as const satisfies TypedDataParameter;

// XXX: Remove
const SharedPortfolioTypeParams = [] as const satisfies TypedDataParameter[];

/**
 * Fields included in Permit data that we don't want duplicated in witness data,
 * so only included in standalone typed data.
 */
const PortfolioStandaloneTypeParams = [
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
] as const satisfies TypedDataParameter[];

/**
 * The set of portfolio operations supported by EVM Wallets, and their associated params
 */
const OperationTypes = {
  OpenPortfolio: [{ name: 'allocations', type: 'Allocation[]' }],
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
} as const satisfies TypedData;
type OperationTypes = typeof OperationTypes;
export type OperationTypeNames = keyof OperationTypes;

const OperationSubTypes = {
  Allocation: [
    { name: 'instrument', type: 'string' },
    { name: 'portion', type: 'uint256' },
  ],
  Asset: TokenPermissionsComponents,
} as const satisfies TypedData;

/**
 * Target allocation for portfolio positions.
 * Uses 'portion' (not 'basisPoints') to allow flexible ratios.
 * The denominator is implicitly the sum of all portions.
 *
 * Examples:
 * - [{instrument: 'A', portion: 60}, {instrument: 'B', portion: 40}] => 60:40 ratio
 * - [{instrument: 'A', portion: 6}, {instrument: 'B', portion: 4}] => 6:4 ratio (same as 60:40)
 */
export type TargetAllocation = TypedDataToPrimitiveTypes<
  typeof OperationSubTypes
>['Allocation'];
type YmaxOperationTypesWithSubTypes<
  T extends string,
  P extends readonly TypedDataParameter[],
> = {
  [K in T]: P;
} & typeof OperationSubTypes;

/**
 * In the wrapped case, the domain is fixed by permit2, so we can't choose name/version there.
 * so we put the ymax-specifc domain name and version in the type name.
 */
const getYmaxWitnessTypeName = <T extends OperationTypeNames>(operation: T) =>
  `${YMAX_DOMAIN_NAME}V${YMAX_DOMAIN_VERSION}${operation}` as const;
type YmaxWitnessTypeName<T extends OperationTypeNames> = ReturnType<
  typeof getYmaxWitnessTypeName<T>
>;
const getYmaxWitnessFieldName = <T extends OperationTypeNames>(operation: T) =>
  `${YMAX_WITNESS_FIELD_NAME_PREFIX}${operation}` as const;
type YmaxWitnessFieldName<T extends OperationTypeNames> = ReturnType<
  typeof getYmaxWitnessFieldName<T>
>;
export type YmaxWitnessTypeParam<
  T extends OperationTypeNames = OperationTypeNames,
> = TypedDataParameter<
  YmaxWitnessFieldName<T>,
  Extract<keyof YmaxWitnessOperationTypes<T>, string>
>;

/**
 * showing a field named "witness" in the wallet signing UI is... boring
 * so let's put something more relevant like the @{link OperationTypes}: Deposit etc.
 */
const getYmaxWitnessTypeParam = <T extends OperationTypeNames>(
  operation: T,
): YmaxWitnessTypeParam<T> => ({
  name: getYmaxWitnessFieldName(operation),
  type: getYmaxWitnessTypeName(operation) as YmaxWitnessTypeParam<T>['type'],
});

// TODO: Filter operation types to only those needed for witness/standalone
type YmaxWitnessOperationTypes<
  T extends OperationTypeNames = OperationTypeNames,
> = {
  [K in T as YmaxWitnessTypeName<K>]: [
    ...OperationTypes[K],
    ...typeof SharedPortfolioTypeParams,
  ];
};
type YmaxWitnessTypes<T extends OperationTypeNames = OperationTypeNames> =
  YmaxWitnessOperationTypes<T> & typeof OperationSubTypes;
type YmaxStandaloneOperationTypes<
  T extends OperationTypeNames = OperationTypeNames,
> = {
  [K in T]: [
    ...OperationTypes[K],
    ...typeof SharedPortfolioTypeParams,
    ...typeof PortfolioStandaloneTypeParams,
  ];
};
type YmaxStandaloneTypes<T extends OperationTypeNames = OperationTypeNames> =
  YmaxStandaloneOperationTypes<T> &
    typeof OperationSubTypes & {
      EIP712Domain: typeof StandaloneDomainTypeParams;
    };

export type YmaxOperationType<T extends OperationTypeNames> =
  TypedDataToPrimitiveTypes<OperationTypes & typeof OperationSubTypes>[T];

type YmaxWitnessData<T extends OperationTypeNames> = TypedDataToPrimitiveTypes<
  YmaxWitnessTypes<T>
>[YmaxWitnessTypeParam<T>['type']];
type YmaxStandaloneData<T extends OperationTypeNames> =
  TypedDataToPrimitiveTypes<YmaxStandaloneTypes<T>>[T];

const getYmaxOperationAndSubTypes = <
  T extends string,
  P extends readonly TypedDataParameter[],
>(
  operation: T,
  params: P,
) =>
  ({
    [operation]: params,
    ...OperationSubTypes,
  }) as YmaxOperationTypesWithSubTypes<T, P> satisfies TypedData;

const getYmaxWitnessTypes = <T extends OperationTypeNames>(operation: T) =>
  getYmaxOperationAndSubTypes(getYmaxWitnessTypeName(operation), [
    ...OperationTypes[operation],
    ...SharedPortfolioTypeParams,
  ]) as YmaxWitnessTypes<T> satisfies TypedData;

const getYmaxStandaloneTypes = <T extends OperationTypeNames>(operation: T) =>
  ({
    EIP712Domain: StandaloneDomainTypeParams,
    ...getYmaxOperationAndSubTypes(operation, [
      ...OperationTypes[operation],
      ...SharedPortfolioTypeParams,
      ...PortfolioStandaloneTypeParams,
    ]),
  }) as YmaxStandaloneTypes<T> satisfies TypedData;

export const getYmaxOperationTypes = <T extends OperationTypeNames>(
  operation: T,
) =>
  getYmaxOperationAndSubTypes(operation, OperationTypes[operation]) as {
    [K in T]: OperationTypes[K];
  } & typeof OperationSubTypes satisfies TypedData;

export const getYmaxWitness = <T extends OperationTypeNames>(
  operation: T,
  data: NoInfer<YmaxWitnessData<T>>,
): Witness<YmaxWitnessTypes<T>, YmaxWitnessTypeParam<T>> =>
  makeWitness<YmaxWitnessTypes<T>, YmaxWitnessTypeParam<T>>(
    data,
    getYmaxWitnessTypes(operation),
    getYmaxWitnessTypeParam(operation),
  );

export const getYmaxStandaloneDomain = (
  chainId: bigint | number,
  verifyingContract: Address,
): YmaxStandaloneDomain => ({
  ...YmaxStandaloneDomainBase,
  chainId: BigInt(chainId),
  verifyingContract,
});

export const getYmaxStandaloneOperationData = <T extends OperationTypeNames>(
  data: NoInfer<TypedDataToPrimitiveTypes<YmaxStandaloneTypes>[T]>,
  operation: T,
  chainId: bigint | number,
  verifyingContract: Address,
): TypedDataDefinition<YmaxStandaloneTypes<T>, T, T> & {
  domain: YmaxStandaloneDomain;
} => {
  const types = getYmaxStandaloneTypes(operation);

  // @ts-expect-error some generic inference issue I suppose?
  return {
    domain: getYmaxStandaloneDomain(chainId, verifyingContract),
    types,
    primaryType: operation,
    message: data,
  };
};

export type YmaxStandaloneOperationData<
  T extends OperationTypeNames = OperationTypeNames,
> = ReturnType<typeof getYmaxStandaloneOperationData<T>>;

export type YmaxPermitWitnessTransferFromData<
  T extends OperationTypeNames = OperationTypeNames,
> = ReturnType<
  typeof getPermitWitnessTransferFromData<
    YmaxWitnessTypes<T>,
    YmaxWitnessTypeParam<T>
  >
>;

export type YmaxPermitBatchWitnessTransferFromData<
  T extends OperationTypeNames = OperationTypeNames,
> = ReturnType<
  typeof getPermitBatchWitnessTransferFromData<
    YmaxWitnessTypes<T>,
    YmaxWitnessTypeParam<T>
  >
>;

export function validateYmaxDomain(
  domain: TypedDataDomain,
  validContractAddresses?: undefined,
): asserts domain is typeof YmaxStandaloneDomainBase;
export function validateYmaxDomain(
  domain: TypedDataDomain,
  validContractAddresses: Record<number | string, Address>,
): asserts domain is YmaxStandaloneDomain;
export function validateYmaxDomain(
  domain: TypedDataDomain,
  validContractAddresses?: Record<number | string, Address>,
) {
  if (domain.name !== YMAX_DOMAIN_NAME) {
    throw new Error(
      `Invalid Ymax domain name: ${domain.name} (expected ${YMAX_DOMAIN_NAME})`,
    );
  }
  if (domain.version !== YMAX_DOMAIN_VERSION) {
    throw new Error(
      `Invalid Ymax domain version: ${domain.version} (expected ${YMAX_DOMAIN_VERSION})`,
    );
  }

  if (validContractAddresses) {
    const chainIdStr = String(domain.chainId);

    chainIdStr in validContractAddresses ||
      Fail`Unknown chain ID in Ymax domain: ${q(domain.chainId)}`;

    domain.verifyingContract === validContractAddresses[chainIdStr] ||
      Fail`Invalid verifying contract for chain ID ${q(domain.chainId)}: ${q(
        domain.verifyingContract,
      )} (expected ${q(validContractAddresses[chainIdStr])})`;
  }

  // XXX: check no extra fields?
}

export function validateYmaxOperationTypeName<T extends OperationTypeNames>(
  typeName: string,
): asserts typeName is T {
  if (!(typeName in OperationTypes)) {
    throw new Error(
      `Unknown Ymax operation type: ${typeName} (expected one of ${Object.keys(OperationTypes).join(', ')})`,
    );
  }
}

export const splitWitnessFieldType = <T extends OperationTypeNames>(
  fieldName: `${typeof YMAX_DOMAIN_NAME}V${typeof YMAX_DOMAIN_VERSION}${T}`,
) => {
  const match =
    fieldName.startsWith(YMAX_DOMAIN_NAME) &&
    fieldName.substring(YMAX_DOMAIN_NAME.length).match(/^V(\d+)(\w+)$/u);
  if (!match) {
    throw new Error(`Invalid witness field type name: ${fieldName}`);
  }
  const [, version, operation] = match;
  const domain = {
    name: YMAX_DOMAIN_NAME,
    version,
  } satisfies TypedDataDomain;

  validateYmaxDomain(domain);
  validateYmaxOperationTypeName<T>(operation);

  return {
    domain,
    primaryType: operation,
  };
};
