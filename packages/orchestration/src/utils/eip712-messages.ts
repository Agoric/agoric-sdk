/**
 * @file Schema-driven EIP-712 messages, submitted either standalone or as the
 * witness of a permit2 `PermitWitnessTransferFrom`.
 *
 * A {@link EIP712MessageSchema} describes a family of messages sharing an
 * EIP-712 domain name and version: the set of operations (primary types) and
 * their fields, plus the sub-types these operations may reference.
 * {@link makeEIP712MessageKit} derives from it the helpers to author and
 * validate such messages. The fields included in the message differ based on
 * which way it's submitted:
 *
 * - standalone: the operation is the primary type, the domain is the schema's
 *   (with a `chainId` and `verifyingContract`), and the operation's fields are
 *   followed by {@link StandaloneEnvelopeTypeParams} (`nonce` and `deadline`).
 * - permit2 witness: the domain is fixed by permit2, so the schema's domain
 *   name and version are instead encoded in the witness type name, and
 *   `nonce`/`deadline` are those of the permit rather than being repeated in
 *   the witness.
 *
 * @see {@link ./eip712-message-handler.ts} for extracting verified operation
 * details from such messages.
 */

import type { Address, TypedData, TypedDataDomain } from 'abitype';
import type { TypedDataDefinition } from 'viem';
import type {
  TypedDataParameter,
  TypedDataToStructType,
  TypedDataValueKind,
} from './abitype.ts';
import {
  type Witness,
  type getPermitWitnessTransferFromData,
  type getPermitBatchWitnessTransferFromData,
  makeWitness,
  PermitTransferFromTypeParams,
} from './permit2.ts';
import { isEvmAddressShape, sameEvmAddress } from './address.js';
import { normalizeAndValidateEIP712Data } from './viem-utils/eip712-normalize.ts';

type TypedDataRecord = Record<string, readonly TypedDataParameter[]>;

/**
 * Description of a family of EIP-712 messages sharing a domain.
 */
export type EIP712MessageSchema = {
  /** EIP-712 domain name of standalone messages */
  readonly domainName: string;
  /**
   * EIP-712 domain version of standalone messages. Must be a decimal integer
   * since it's encoded in the witness type name of permit2 messages.
   */
  readonly domainVersion: `${number}`;
  /**
   * Prefix of the witness field name in permit2 messages, followed by the
   * operation name. A field named "witness" in the wallet signing UI is...
   * boring, so it's more relevant to show e.g. "ymaxDeposit".
   *
   * If absent, permit2 witness messages are not supported by this schema.
   */
  readonly witnessFieldNamePrefix?: string;
  /** The operations (primary types) and their fields */
  readonly operationTypes: TypedDataRecord;
  /** Struct types that may be referenced by operation fields */
  readonly subTypes: TypedDataRecord;
};

export const StandaloneDomainTypeParams = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
] as const satisfies TypedDataParameter[];

/**
 * Fields included in Permit data that we don't want duplicated in witness data,
 * so only included in standalone typed data.
 */
export const StandaloneEnvelopeTypeParams = [
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
] as const satisfies TypedDataParameter[];

export type OperationNames<S extends EIP712MessageSchema> =
  keyof S['operationTypes'] & string;

export type DomainBase<S extends EIP712MessageSchema> = {
  readonly name: S['domainName'];
  readonly version: S['domainVersion'];
};

export type FullDomain<S extends EIP712MessageSchema> = DomainBase<S> & {
  chainId: bigint;
  verifyingContract: Address;
};

export type OperationType<
  S extends EIP712MessageSchema,
  T extends OperationNames<S>,
> = TypedDataToStructType<S['operationTypes'] & S['subTypes'], T>;

/**
 * In the wrapped case, the domain is fixed by permit2, so we can't choose
 * name/version there, so we put the schema's domain name and version in the
 * type name.
 */
export type WitnessTypeName<
  S extends EIP712MessageSchema,
  T extends OperationNames<S>,
> = `${S['domainName']}V${S['domainVersion']}${T}`;

export type WitnessFieldName<
  S extends EIP712MessageSchema,
  T extends OperationNames<S>,
> = `${NonNullable<S['witnessFieldNamePrefix']>}${T}`;

export type WitnessTypeParam<
  S extends EIP712MessageSchema,
  T extends OperationNames<S> = OperationNames<S>,
> = TypedDataParameter<
  WitnessFieldName<S, T>,
  Extract<keyof WitnessOperationTypes<S, T>, string>
>;

type WitnessOperationTypes<
  S extends EIP712MessageSchema,
  T extends OperationNames<S> = OperationNames<S>,
> = {
  [K in T as WitnessTypeName<S, K>]: [...S['operationTypes'][K]];
};

export type WitnessTypes<
  S extends EIP712MessageSchema,
  T extends OperationNames<S> = OperationNames<S>,
> = WitnessOperationTypes<S, T> & S['subTypes'];

type StandaloneOperationTypes<
  S extends EIP712MessageSchema,
  T extends OperationNames<S> = OperationNames<S>,
> = {
  [K in T]: [...S['operationTypes'][K], ...typeof StandaloneEnvelopeTypeParams];
};

export type StandaloneTypes<
  S extends EIP712MessageSchema,
  T extends OperationNames<S> = OperationNames<S>,
> = StandaloneOperationTypes<S, T> &
  S['subTypes'] & {
    EIP712Domain: typeof StandaloneDomainTypeParams;
  };

export type WitnessData<
  S extends EIP712MessageSchema,
  T extends OperationNames<S>,
  Kind extends TypedDataValueKind = 'output',
> = TypedDataToStructType<
  WitnessTypes<S, T>,
  WitnessTypeParam<S, T>['type'],
  Kind
>;

export type StandaloneData<
  S extends EIP712MessageSchema,
  T extends OperationNames<S>,
  Kind extends TypedDataValueKind = 'output',
> = TypedDataToStructType<StandaloneTypes<S, T>, T, Kind>;

export type StandaloneOperationData<
  S extends EIP712MessageSchema,
  T extends OperationNames<S> = OperationNames<S>,
> = TypedDataDefinition<StandaloneTypes<S, T>, T, T> & {
  domain: FullDomain<S>;
};

/**
 * `WitnessTypes` narrowed to abitype's `TypedData`, which TypeScript cannot
 * prove for a generic schema (`TypedData` forbids keys that are Solidity type
 * names). For any concrete schema this resolves to `WitnessTypes` itself.
 */
type WitnessTypedData<
  S extends EIP712MessageSchema,
  T extends OperationNames<S>,
> = Extract<WitnessTypes<S, T>, TypedData>;

/** `WitnessTypeParam` narrowed to match {@link WitnessTypedData}. */
type WitnessTypedDataParam<
  S extends EIP712MessageSchema,
  T extends OperationNames<S>,
> = Extract<
  WitnessTypeParam<S, T>,
  TypedDataParameter<string, Extract<keyof WitnessTypedData<S, T>, string>>
>;

export type OperationWitness<
  S extends EIP712MessageSchema,
  T extends OperationNames<S> = OperationNames<S>,
> = Witness<WitnessTypedData<S, T>, WitnessTypedDataParam<S, T>>;

export type PermitWitnessTransferFromOperationData<
  S extends EIP712MessageSchema,
  T extends OperationNames<S> = OperationNames<S>,
> = ReturnType<
  typeof getPermitWitnessTransferFromData<
    WitnessTypedData<S, T>,
    WitnessTypedDataParam<S, T>
  >
>;

export type PermitBatchWitnessTransferFromOperationData<
  S extends EIP712MessageSchema,
  T extends OperationNames<S> = OperationNames<S>,
> = ReturnType<
  typeof getPermitBatchWitnessTransferFromData<
    WitnessTypedData<S, T>,
    WitnessTypedDataParam<S, T>
  >
>;

const IDENTIFIER = /^[A-Za-z_]\w*$/u;
const DECIMAL = /^\d+$/u;

/**
 * Type names that can't be defined by a schema, as they're defined by the
 * EIP-712 domain or by permit2 typed data (into which a witness's types are
 * merged).
 */
const RESERVED_TYPE_NAMES: readonly string[] = [
  'EIP712Domain',
  'PermitTransferFrom',
  'PermitBatchTransferFrom',
  'PermitWitnessTransferFrom',
  'PermitBatchWitnessTransferFrom',
  'TokenPermissions',
];
/** Fields of the permit2 message, which the witness field must not shadow. */
const PERMIT_FIELD_NAMES: readonly string[] = PermitTransferFromTypeParams.map(
  ({ name }) => name,
);
const ENVELOPE_FIELD_NAMES: readonly string[] =
  StandaloneEnvelopeTypeParams.map(({ name }) => name);

const validateSchema = (schema: EIP712MessageSchema) => {
  const {
    domainName,
    domainVersion,
    witnessFieldNamePrefix,
    operationTypes,
    subTypes,
  } = schema;
  if (!IDENTIFIER.test(domainName)) {
    throw new Error(`Invalid EIP-712 schema domain name: ${domainName}`);
  }
  if (!DECIMAL.test(domainVersion)) {
    throw new Error(`Invalid EIP-712 schema domain version: ${domainVersion}`);
  }
  if (
    witnessFieldNamePrefix !== undefined &&
    !IDENTIFIER.test(witnessFieldNamePrefix)
  ) {
    throw new Error(
      `Invalid EIP-712 schema witness field name prefix: ${witnessFieldNamePrefix}`,
    );
  }
  for (const subType of Object.keys(subTypes)) {
    if (RESERVED_TYPE_NAMES.includes(subType)) {
      throw new Error(`EIP-712 schema sub-type name is reserved: ${subType}`);
    }
  }
  for (const [operation, params] of Object.entries(operationTypes)) {
    if (!IDENTIFIER.test(operation)) {
      throw new Error(`Invalid EIP-712 schema operation name: ${operation}`);
    }
    if (RESERVED_TYPE_NAMES.includes(operation)) {
      throw new Error(
        `EIP-712 schema operation name is reserved: ${operation}`,
      );
    }
    if (Object.hasOwn(subTypes, operation)) {
      throw new Error(
        `EIP-712 schema operation name collides with a sub-type: ${operation}`,
      );
    }
    for (const { name } of params) {
      if (ENVELOPE_FIELD_NAMES.includes(name)) {
        throw new Error(
          `EIP-712 schema operation ${operation} field name is reserved: ${name}`,
        );
      }
    }
    if (witnessFieldNamePrefix !== undefined) {
      const witnessTypeName = `${domainName}V${domainVersion}${operation}`;
      if (Object.hasOwn(subTypes, witnessTypeName)) {
        throw new Error(
          `EIP-712 schema witness type name of ${operation} collides with a sub-type: ${witnessTypeName}`,
        );
      }
      const witnessFieldName = `${witnessFieldNamePrefix}${operation}`;
      if (PERMIT_FIELD_NAMES.includes(witnessFieldName)) {
        throw new Error(
          `EIP-712 schema witness field name of ${operation} collides with a permit field: ${witnessFieldName}`,
        );
      }
    }
  }
};

/**
 * Helpers to author and validate EIP-712 messages described by a schema.
 *
 * Explicitly declared (rather than inferred from
 * {@link makeEIP712MessageKit}) so that its assertion methods can be called
 * through a kit declared with this type, e.g.
 * `const kit: EIP712MessageKit<typeof schema> = makeEIP712MessageKit(schema)`.
 */
export interface EIP712MessageKit<S extends EIP712MessageSchema> {
  readonly schema: S;
  /** Whether messages may be submitted as a permit2 witness */
  readonly supportsPermit2Witness: boolean;
  /**
   * The types of an operation's fields (without any standalone envelope
   * fields), keyed by the operation name, along with all sub-types.
   */
  getOperationTypes<T extends OperationNames<S>>(
    operation: T,
  ): { [K in T]: S['operationTypes'][K] } & S['subTypes'];
  /** Make the witness of an operation for a permit2 message. */
  getWitness<T extends OperationNames<S>>(
    operation: T,
    data: NoInfer<WitnessData<S, T, 'input'>>,
  ): OperationWitness<S, T>;
  getStandaloneDomain(
    chainId: bigint | number,
    verifyingContract: Address,
  ): FullDomain<S>;
  /** Make the typed data of a standalone operation message. */
  getStandaloneOperationData<T extends OperationNames<S>>(
    data: NoInfer<StandaloneData<S, T, 'input'>>,
    operation: T,
    chainId: bigint | number,
    verifyingContract: Address,
  ): StandaloneOperationData<S, T>;
  /** Validate the name and version of a domain. */
  validateDomainBase(domain: TypedDataDomain): asserts domain is DomainBase<S>;
  /**
   * Validate a standalone message domain, optionally checking its verifying
   * contract against the valid contract addresses for its chain ID.
   */
  validateDomain(
    domain: TypedDataDomain,
    validContractAddresses?:
      | Partial<Record<number | string, Address>>
      | undefined,
  ): asserts domain is FullDomain<S>;
  validateOperationTypeName<T extends OperationNames<S>>(
    typeName: string,
  ): asserts typeName is T;
  /**
   * Split the type name of a permit2 witness into the domain and operation
   * it encodes, validating both.
   */
  splitWitnessFieldType<T extends OperationNames<S>>(
    fieldName: WitnessTypeName<S, T>,
  ): { domain: DomainBase<S>; primaryType: T };
}

/**
 * Make the helpers to author and validate EIP-712 messages described by
 * `schema`.
 *
 * @param schema
 * @throws {Error} if the schema is invalid: its domain name, witness field
 *   name prefix, or operation names are not identifiers, its domain version
 *   is not a decimal integer, or its type or field names are reserved or
 *   would collide once the standalone or permit2 witness types are generated
 *   (e.g. an operation named after a sub-type, or a `nonce` field).
 */
export const makeEIP712MessageKit = <const S extends EIP712MessageSchema>(
  schema: S,
): EIP712MessageKit<S> => {
  validateSchema(schema);
  const {
    domainName,
    domainVersion,
    witnessFieldNamePrefix,
    operationTypes,
    subTypes,
  } = schema;
  type Ops = OperationNames<S>;

  const domainBase = {
    name: domainName,
    version: domainVersion,
  } as DomainBase<S> satisfies TypedDataDomain;

  const getWitnessTypeName = <T extends Ops>(operation: T) =>
    `${domainName}V${domainVersion}${operation}` as WitnessTypeName<S, T>;

  const getWitnessTypeParam = <T extends Ops>(
    operation: T,
  ): WitnessTypeParam<S, T> => {
    if (witnessFieldNamePrefix === undefined) {
      throw new Error(
        `${domainName} messages do not support permit2 witness data`,
      );
    }
    return {
      name: `${witnessFieldNamePrefix}${operation}` as WitnessFieldName<S, T>,
      type: getWitnessTypeName(operation) as WitnessTypeParam<S, T>['type'],
    };
  };

  const getOperationAndSubTypes = <P extends readonly TypedDataParameter[]>(
    typeName: string,
    params: P,
  ) =>
    ({
      [typeName]: params,
      ...subTypes,
    }) as TypedDataRecord;

  const getWitnessTypes = <T extends Ops>(operation: T) =>
    getOperationAndSubTypes(getWitnessTypeName(operation), [
      ...operationTypes[operation],
    ]) as unknown as WitnessTypes<S, T>;

  const getStandaloneTypes = <T extends Ops>(
    operation: T,
  ): StandaloneTypes<S, T> => {
    const types = {
      EIP712Domain: StandaloneDomainTypeParams,
      ...getOperationAndSubTypes(operation, [
        ...operationTypes[operation],
        ...StandaloneEnvelopeTypeParams,
      ]),
    };
    // TypeScript cannot preserve the mapped tuple relationship for
    // `operationTypes[operation]` through the spreads above.
    return types as unknown as StandaloneTypes<S, T>;
  };

  /**
   * The types of an operation's fields (without any standalone envelope
   * fields), keyed by the operation name, along with all sub-types.
   *
   * @param operation
   */
  const getOperationTypes = <T extends Ops>(operation: T) =>
    getOperationAndSubTypes(
      operation,
      operationTypes[operation],
    ) as unknown as {
      [K in T]: S['operationTypes'][K];
    } & S['subTypes'];

  const getWitness = <T extends Ops>(
    operation: T,
    data: NoInfer<WitnessData<S, T, 'input'>>,
  ): OperationWitness<S, T> => {
    const witnessTypeParam = getWitnessTypeParam(operation);
    // Normalize away unused `optional` fields (and their now-unreferenced
    // types) so that e.g. omitting an optional struct field produces a
    // `types`/`message` pair that real EIP-712 hashing can encode.
    // This is the authoring side, not adversarial input, so extra fields are
    // dropped rather than rejected.
    const { message, types } = normalizeAndValidateEIP712Data({
      message: data as Record<string, unknown>,
      types: getWitnessTypes(operation),
      primaryType: witnessTypeParam.type,
    });
    return makeWitness<WitnessTypedData<S, T>, WitnessTypedDataParam<S, T>>(
      message as OperationWitness<S, T>['witness'],
      types as WitnessTypedData<S, T>,
      witnessTypeParam as WitnessTypedDataParam<S, T>,
    );
  };

  const getStandaloneDomain = (
    chainId: bigint | number,
    verifyingContract: Address,
  ): FullDomain<S> => ({
    ...domainBase,
    chainId: BigInt(chainId),
    verifyingContract,
  });

  const getStandaloneOperationData = <T extends Ops>(
    data: NoInfer<StandaloneData<S, T, 'input'>>,
    operation: T,
    chainId: bigint | number,
    verifyingContract: Address,
  ): StandaloneOperationData<S, T> => {
    // Normalize away unused `optional` fields (and their now-unreferenced
    // types) so that e.g. omitting an optional struct field produces a
    // `types`/`message` pair that real EIP-712 hashing can encode.
    // This is the authoring side, not adversarial input, so extra fields are
    // dropped rather than rejected.
    const { message, types } = normalizeAndValidateEIP712Data({
      message: data as Record<string, unknown>,
      types: getStandaloneTypes(operation),
      primaryType: operation,
    });

    return {
      domain: getStandaloneDomain(chainId, verifyingContract),
      types,
      primaryType: operation,
      message,
    } as unknown as StandaloneOperationData<S, T>;
  };

  function validateDomainBase(
    domain: TypedDataDomain,
  ): asserts domain is DomainBase<S> {
    if (domain.name !== domainName) {
      throw new Error(
        `Invalid ${domainName} domain name: ${domain.name} (expected ${domainName})`,
      );
    }
    if (domain.version !== domainVersion) {
      throw new Error(
        `Invalid ${domainName} domain version: ${domain.version} (expected ${domainVersion})`,
      );
    }
  }

  function validateDomain(
    domain: TypedDataDomain,
    validContractAddresses?:
      | Partial<Record<number | string, Address>>
      | undefined,
  ): asserts domain is FullDomain<S> {
    // Destructure before narrowing `domain` below, so `chainId`/`verifyingContract`
    // remain accessible as independent bindings afterward.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { name, version, chainId, verifyingContract, ...extra } = domain;
    validateDomainBase(domain);

    if (typeof chainId !== 'bigint' || verifyingContract === undefined) {
      throw new Error(
        `${domainName} domain must include chain ID and verifying contract`,
      );
    }
    // Its declared type may not be `address` (see
    // `extractOperationDetailsFromDataWithAddress`).
    if (!isEvmAddressShape(verifyingContract)) {
      throw new Error(
        `Invalid verifying contract address in ${domainName} domain`,
      );
    }

    if (validContractAddresses) {
      const chainIdStr = String(chainId);

      if (!Object.hasOwn(validContractAddresses, chainIdStr)) {
        throw new Error(`Unknown chain ID in ${domainName} domain: ${chainId}`);
      }

      if (
        !sameEvmAddress(verifyingContract, validContractAddresses[chainIdStr])
      ) {
        throw new Error(
          `Invalid verifying contract for chain ID ${chainId}: ${verifyingContract} (expected ${validContractAddresses[chainIdStr]})`,
        );
      }
    }

    const extraKeys = Object.keys(extra);
    if (extraKeys.length) {
      throw new Error(
        `Unexpected field(s) in ${domainName} domain: ${extraKeys.join(', ')}`,
      );
    }
  }

  function validateOperationTypeName<T extends Ops>(
    typeName: string,
  ): asserts typeName is T {
    if (!Object.hasOwn(operationTypes, typeName)) {
      throw new Error(
        `Unknown ${domainName} operation type: ${typeName} (expected one of ${Object.keys(operationTypes).join(', ')})`,
      );
    }
  }

  const splitWitnessFieldType = <T extends Ops>(
    fieldName: WitnessTypeName<S, T>,
  ) => {
    const match =
      fieldName.startsWith(domainName) &&
      fieldName.substring(domainName.length).match(/^V(\d+)(\w+)$/u);
    if (!match) {
      throw new Error(`Invalid witness field type name: ${fieldName}`);
    }
    const [, version, operation] = match;
    const domain = {
      name: domainName,
      version,
    } satisfies TypedDataDomain;

    validateDomainBase(domain);
    validateOperationTypeName<T>(operation);

    return {
      domain,
      primaryType: operation,
    };
  };

  return {
    schema,
    supportsPermit2Witness: witnessFieldNamePrefix !== undefined,
    getOperationTypes,
    getWitness,
    getStandaloneDomain,
    getStandaloneOperationData,
    validateDomainBase,
    validateDomain,
    validateOperationTypeName,
    splitWitnessFieldType,
  };
};
