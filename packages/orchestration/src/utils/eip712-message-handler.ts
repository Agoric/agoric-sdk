/**
 * @file Helpers to handle EIP-712 messages described by an
 * {@link EIP712MessageSchema}, extracting operation and deposit permit
 * details, as well as verifying the signature.
 *
 * The viem runtime dependency is expected as a power to make this usable both
 * on chain and in off-chain services.
 */

import type { Address, TypedData, TypedDataDomain } from 'abitype';
import type { getTypesForEIP712Domain } from 'viem';
import type {
  hashStruct,
  isHex,
  recoverTypedDataAddress,
  RecoverTypedDataAddressParameters,
} from 'viem/utils';
import type { TypedDataParameter } from './abitype.ts';
import { sameEvmAddress } from './address.js';
import { normalizeAndValidateEIP712Data } from './viem-utils/eip712-normalize.ts';
import type { encodeType, WithSignature } from './viem.ts';
import {
  extractWitnessFieldFromTypes,
  isPermit2MessageType,
  makeWitnessTypeStringExtractor,
  validatePermit2Domain,
  validateTokenPermissionsType,
  type Permit2Domain,
  type PermitTransferFrom,
  PermitTransferFromTypeParams,
  TokenPermissionTypeParams,
  type PermitWitnessTransferFromPayload,
} from './permit2.ts';
import {
  makeEIP712MessageKit,
  type EIP712MessageKit,
  type EIP712MessageSchema,
  type FullDomain,
  type OperationNames,
  type OperationType,
  type PermitWitnessTransferFromOperationData,
  type StandaloneOperationData,
  type WitnessTypeName,
} from './eip712-messages.ts';

export type OperationDetails<
  S extends EIP712MessageSchema,
  T extends OperationNames<S> = OperationNames<S>,
> = {
  [P in T]: {
    operation: P;
    domain: FullDomain<S>;
    /**
     * A *lower bound* on the runtime shape, not an exact description: since
     * `extractOperationDetailsFromStandaloneData` /
     * `extractOperationDetailsFromPermit2WitnessData` keep (rather than
     * drop) genuinely-signed fields this version doesn't recognize, `data`
     * can carry extra properties beyond `OperationType<S, P>` at runtime.
     * Consumers that must reject such fields (e.g. permission records)
     * need to validate that themselves against a closed shape.
     */
    data: OperationType<S, P>;
  };
}[T];

export type PermitDetails = {
  chainId: bigint;
  token: Address;
  amount: bigint;
  spender: Address;
  permit2Payload: Omit<PermitWitnessTransferFromPayload, 'transferDetails'>;
};

export type FullMessageDetails<
  S extends EIP712MessageSchema,
  T extends OperationNames<S> = OperationNames<S>,
> = OperationDetails<S, T> & {
  permitDetails?: PermitDetails;
  evmWalletAddress: Address;
  nonce: bigint;
  deadline: bigint;
};

/**
 * Valid contract addresses, keyed by chain ID.
 */
export type ContractAddresses = Partial<Record<number | string, Address>>;

export type EIP712ViemUtils = {
  isHex: typeof isHex;
  hashStruct: typeof hashStruct;
  recoverTypedDataAddress: typeof recoverTypedDataAddress;
  encodeType: typeof encodeType;
  getTypesForEIP712Domain: typeof getTypesForEIP712Domain;
};

/**
 * EIP-712 message handler utils for messages described by `schema`. They
 * depend on 'viem' utils for their implementation. Since on-chain we cannot
 * directly import from 'viem', use a maker pattern to create these utils.
 *
 * @param viemUtils
 * @param schema describes the domain and operations of accepted messages.
 *   Messages of any other domain or operation are rejected.
 * @throws {Error} if a viem util is missing, or if the schema is invalid
 *   (see {@link makeEIP712MessageKit}).
 */
export const makeEIP712MessageHandlerUtils = <
  const S extends EIP712MessageSchema,
>(
  viemUtils: EIP712ViemUtils,
  schema: S,
) => {
  type Ops = OperationNames<S>;
  type PermitData<T extends Ops = Ops> = PermitWitnessTransferFromOperationData<
    S,
    T
  >;
  type StandaloneData<T extends Ops = Ops> = StandaloneOperationData<S, T>;
  /**
   * Schema-agnostic shape of permit2 witness data, since TypeScript cannot
   * resolve the precise `PermitData` of a generic schema.
   */
  type AnyPermitData = {
    domain: Permit2Domain;
    primaryType: 'PermitWitnessTransferFrom';
    types: {
      PermitWitnessTransferFrom: readonly [
        ...typeof PermitTransferFromTypeParams,
        TypedDataParameter,
      ];
      TokenPermissions: typeof TokenPermissionTypeParams;
    } & TypedData;
    message: PermitTransferFrom & Record<string, unknown>;
  };

  const {
    isHex,
    hashStruct,
    recoverTypedDataAddress,
    encodeType,
    getTypesForEIP712Domain,
  } = viemUtils;

  for (const [utilName, util] of Object.entries({
    isHex,
    hashStruct,
    recoverTypedDataAddress,
    encodeType,
    getTypesForEIP712Domain,
  })) {
    if (typeof util !== 'function') {
      throw new Error(`Expected viemUtils.${utilName} to be a function`);
    }
  }

  // Explicitly typed, as required to call its assertion methods.
  const messageKit: EIP712MessageKit<S> = makeEIP712MessageKit(schema);
  const { domainName } = schema;

  const getPermit2WitnessTypeString = makeWitnessTypeStringExtractor({
    encodeType,
  });

  /**
   * Extract operation type name and data from an EIP-712 standalone typed data.
   *
   * By the time this is called, `data.message` has already been through the
   * "reject anything unsigned" normalize pass (see
   * `extractOperationDetailsFromDataWithAddress`), so any field here was
   * actually part of what was signed. This function normalizes it a second
   * time against the types this (possibly older) version of the code
   * expects for the operation, resolving any `optional` field based on
   * whether it's actually present in the message, but *keeps* rather than
   * drops fields the signer's client signed that this version doesn't know
   * about yet: dropping them would let a permissions-bearing field silently
   * disappear (e.g. a not-yet-understood attenuation on a grant), turning
   * an attenuated grant into an unconstrained one. The returned `data` can
   * therefore be a superset of the expected shape; it is guaranteed to
   * satisfy the expected types (required fields present, values of the
   * right shape/range), but consumers that must reject unrecognized fields
   * (e.g. permission records) need to validate that themselves against a
   * closed shape.
   *
   * Assumes the domain has the expected shape of the schema's domain.
   *
   * @param data - The EIP-712 typed data of a standalone message
   * @param validContractAddresses
   * @returns The operation type name and associated data
   */
  const extractOperationDetailsFromStandaloneData = <T extends Ops>(
    data: Omit<StandaloneData<T>, 'domain'> & {
      domain: FullDomain<S>;
    },
    validContractAddresses?: undefined,
  ): OperationDetails<S, T> => {
    const { domain, ...standaloneData } = data;

    if (validContractAddresses) {
      throw new Error(
        'Contract address validation expected to be validated separately',
      );
    }

    messageKit.validateOperationTypeName<T>(standaloneData.primaryType);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { nonce, deadline, ...operationData } =
      standaloneData.message as Record<string, unknown>;
    const operation = standaloneData.primaryType;
    const { message: normalizedData } = normalizeAndValidateEIP712Data(
      {
        message: operationData,
        types: messageKit.getOperationTypes(operation),
        primaryType: operation,
      },
      { onExtraField: 'keep' },
    );
    return {
      operation,
      domain,
      data: normalizedData as OperationType<S, T>,
    } as OperationDetails<S, T>;
  };

  /**
   * Extract operation type name and data from an EIP-712 Permit2 witness typed data.
   * Validates that the supplied types exactly match types of a permit2 message.
   *
   * By the time this is called, `data.message`/`data.types` have already been
   * through the "reject anything unsigned" normalize pass (see
   * `extractOperationDetailsFromDataWithAddress`), so any field in the
   * witness data here was actually part of what was signed. This function
   * normalizes it a second time against the types this (possibly older)
   * version of the code expects for the operation, resolving any `optional`
   * field based on whether it's actually present in the witness data, but
   * *keeps* rather than drops fields the signer's client signed that this
   * version doesn't know about yet (see
   * `extractOperationDetailsFromStandaloneData`).
   *
   * Assumes the message has already been validated against the types from the data.
   * Assumes the domain has the expected shape of a permit2 domain.
   *
   * @param data - The EIP-712 typed data of a Permit2 witness message
   * @returns The operation type name and associated data
   */
  const extractOperationDetailsFromPermit2WitnessData = <T extends Ops>(
    data: Omit<PermitData<T>, 'domain'> & {
      domain: Permit2Domain;
    },
  ): OperationDetails<S, T> => {
    const permitData = data as unknown as AnyPermitData;

    if (!messageKit.supportsPermit2Witness) {
      throw new Error(
        `${domainName} messages do not support permit2 witness data`,
      );
    }

    const witnessField = extractWitnessFieldFromTypes(permitData.types);
    const witnessData = permitData.message[witnessField.name] as Record<
      string,
      unknown
    >;
    const { primaryType, domain } = messageKit.splitWitnessFieldType(
      witnessField.type as WitnessTypeName<S, Ops>,
    );
    const chainId = BigInt(data.domain.chainId);
    const operation = primaryType as T;

    const { message: normalizedWitnessData } = normalizeAndValidateEIP712Data(
      {
        message: witnessData,
        types: messageKit.getOperationTypes(operation),
        primaryType: operation,
      },
      { onExtraField: 'keep' },
    );
    const spender = permitData.message.spender;
    return {
      operation,
      domain: { ...domain, chainId, verifyingContract: spender },
      data: normalizedWitnessData as OperationType<S, T>,
    } as OperationDetails<S, T>;
  };

  type ExtractPermitDetails = {
    <T extends Ops>(
      data: Omit<PermitData<T>, 'domain'> & {
        domain: Permit2Domain;
        address: Address;
        signature: WithSignature<object>['signature'];
      },
    ): PermitDetails;
    <T extends Ops>(
      data: Omit<PermitData<T>, 'domain'> & {
        domain: Permit2Domain;
      },
      owner: Address,
      signature: WithSignature<object>['signature'],
    ): PermitDetails;
  };

  /**
   * Extract the data that can be used as partial arguments to permit2's
   * `permitWitnessTransferFrom`.
   * Validates that the supplied types exactly match types of a permit2 message.
   * Does not validate any part of the witness data, uses the supplied types to
   * compute the witness data hash.
   *
   * Assumes the message has already been validated against the types from the data.
   * Assumes the domain has the expected shape of a permit2 domain.
   *
   * This does not verify the signature; that is expected to be done by the caller.
   *
   * @param data permit2 message with witness data to summarize
   * @param owner address of the permit2 message signer
   * @param signature signature of the permit2 message
   */
  const extractPermitDetails: ExtractPermitDetails = <T extends Ops>(
    data: Omit<PermitData<T>, 'domain'> & {
      domain: Permit2Domain;
      address?: Address;
      signature?: WithSignature<object>['signature'];
    },
    owner = data.address,
    signature = data.signature,
  ) => {
    const permitData = data as unknown as AnyPermitData;

    if (!isHex(signature)) {
      throw new Error(`Invalid signature format: ${signature}`);
    }

    if (!owner) {
      throw new Error(`Missing owner address`);
    }

    // Validates the permit2 related types are correct
    const witnessField = extractWitnessFieldFromTypes(permitData.types);
    validateTokenPermissionsType(permitData.types);

    const { message } = permitData;
    const witness = hashStruct({
      primaryType: witnessField.type,
      types: permitData.types,
      data: message[witnessField.name] as Record<string, unknown>,
    });
    const witnessTypeString = getPermit2WitnessTypeString(permitData.types);

    const { permitted, spender, nonce, deadline } = message;
    const permitStruct = { permitted, nonce, deadline };

    const permit2Payload: Omit<
      PermitWitnessTransferFromPayload,
      'transferDetails'
    > = {
      permit: permitStruct,
      owner,
      witness,
      witnessTypeString,
      signature,
    };

    const chainId = BigInt(data.domain.chainId);

    const details: PermitDetails = {
      chainId,
      token: permitted.token,
      amount: permitted.amount,
      permit2Payload,
      spender,
    };

    return details;
  };

  /**
   * Extract all details sufficient to handle any EIP-712 message of the
   * schema, optionally with permit data.
   *
   * This does not verify the signature of permit2 based messages; that is
   * expected to be done by the caller.
   *
   * Validates the domain of the typed data, and optionally the verifying
   * contract and spender against the provided contract addresses.
   *
   * Before anything else, the message is normalized *and validated* against
   * its own (untrusted) wire-supplied `types`, rejecting any field not
   * declared there: such a field was never part of the signed struct, so it
   * never affected the EIP-712 hash and could have been added after signing
   * without invalidating the signature. This is the AGO-874 defense. The
   * same function also validates that the message actually satisfies those
   * wire-supplied types (required fields present, values in range/shape),
   * recursing correctly through arrays -- something real EIP-712 tooling
   * (e.g. viem's `validateTypedData`) does not do. The domain is validated
   * the same way, separately (its values live outside `message`).
   * A *different*, later normalize pass (in
   * `extractOperationDetailsFromStandaloneData` /
   * `extractOperationDetailsFromPermit2WitnessData`) keeps -- rather than
   * rejects -- fields that were genuinely signed but aren't supported by
   * this version's schema operation types: they were legitimately
   * signed, merely not (yet) understood by this version. They are not
   * dropped, because a permissions-bearing field this version doesn't
   * understand yet must not silently vanish and be treated as absent (that
   * would turn an attenuated grant into an unconstrained one); instead,
   * downstream permission consumers validate against a closed shape and
   * reject any field they don't recognize.
   *
   * @param data The operation data with an `address` field of the signing owner.
   * @param contractAddresses Optionally, a set of valid contract addresses to validate against
   * @param contractAddresses.permit2 If provided, validates a permit2 based message's verifying contract
   * @param contractAddresses.verifyingContract If provided, validates a standalone message's verifying contract or permit2 spender
   */
  const extractOperationDetailsFromDataWithAddress = <T extends Ops = Ops>(
    data: (WithSignature<PermitData<T>> | StandaloneData<T>) & {
      address: Address;
    },
    contractAddresses: {
      permit2?: ContractAddresses;
      verifyingContract?: ContractAddresses;
    } = {},
  ): FullMessageDetails<S, T> => {
    const {
      address: tokenOwner,
      domain: rawDomain,
      ...otherData
    } = data as unknown as {
      address: Address;
      domain?: TypedDataDomain;
      message: Record<string, unknown>;
      types: Record<string, readonly TypedDataParameter[]>;
      primaryType: string;
    };

    if (!rawDomain) {
      throw new Error(`Missing domain in typed data`);
    }

    // Reject anything not part of the actual signed structure (see doc above).
    const { message: signedMessage, types: signedTypes } =
      normalizeAndValidateEIP712Data(
        {
          message: otherData.message as Record<string, unknown>,
          types: otherData.types,
          primaryType: otherData.primaryType,
        },
        { onExtraField: 'throw' },
      );
    const signedData = {
      ...otherData,
      message: signedMessage,
      types: signedTypes,
    };
    const { nonce, deadline } = signedMessage as {
      nonce: bigint;
      deadline: bigint;
    };

    // Do not trust type definitions coming from the message for the domain;
    // derive them from `domain`'s own shape instead, then validate `domain`
    // against that (e.g. `chainId` range, `verifyingContract` shape), and
    // normalize its values (e.g. a number `chainId` to a bigint). Any field
    // the derived types leave out was not part of the signed domain hash, so
    // reject rather than drop it -- notably a string `chainId`, which viem
    // (unlike ethers.js) omits from the domain hash entirely.
    // Domain-specific checks (name/version/contract match) happen later, in
    // `validateDomain`/`validatePermit2Domain`.
    const domain = normalizeAndValidateEIP712Data(
      {
        message: rawDomain as Record<string, unknown>,
        types: {
          EIP712Domain: getTypesForEIP712Domain({ domain: rawDomain }),
        },
        primaryType: 'EIP712Domain',
      },
      { onExtraField: 'throw' },
    ).message as TypedDataDomain;

    if (isPermit2MessageType(data.primaryType)) {
      if (!messageKit.supportsPermit2Witness) {
        throw new Error(
          `${domainName} messages do not support permit2 witness data`,
        );
      }

      const { signature, ...permit2Data } = signedData as unknown as Omit<
        WithSignature<PermitData<T>>,
        'domain'
      >;

      validatePermit2Domain(domain, contractAddresses.permit2);
      const permit2DataWithDomain = { ...permit2Data, domain };

      // Validates the permit2 related types are correct
      const permitDetails = extractPermitDetails(
        permit2DataWithDomain,
        tokenOwner,
        signature,
      );
      // Validates the witness data satisfies the expected types for the operation
      const operationDetails = extractOperationDetailsFromPermit2WitnessData(
        permit2DataWithDomain,
      );
      // If we have standalone verifying contract addresses, validate the
      // extracted spender against them.
      if (contractAddresses.verifyingContract) {
        messageKit.validateDomain(
          operationDetails.domain,
          contractAddresses.verifyingContract,
        );
      }

      return {
        ...operationDetails,
        permitDetails,
        evmWalletAddress: tokenOwner,
        nonce,
        deadline,
      };
    } else {
      const standaloneData = signedData as unknown as Omit<
        StandaloneData<T>,
        'domain'
      >;

      messageKit.validateDomain(domain, contractAddresses.verifyingContract);

      const operationDetails = extractOperationDetailsFromStandaloneData({
        ...standaloneData,
        domain,
      });

      return {
        ...operationDetails,
        evmWalletAddress: tokenOwner,
        nonce,
        deadline,
      };
    }
  };

  /**
   * Extract all details sufficient to handle any EIP-712 message of the
   * schema, optionally with permit data.
   *
   * This expects an ECDSA signature and recovers the signer address from it.
   * If an address field is present, the recovered address must match the
   * provided address.
   *
   * @deprecated Use `extractOperationDetailsFromDataWithAddress` instead,
   * performing signature verification separately.
   *
   * @param signedData
   * @param validVerifyingContractAddresses
   */
  const extractOperationDetailsFromSignedData = async <T extends Ops = Ops>(
    signedData: WithSignature<PermitData<T> | StandaloneData<T>> & {
      address?: Address;
    },
    validVerifyingContractAddresses?: ContractAddresses,
  ): Promise<FullMessageDetails<S, T>> => {
    const tokenOwner = await recoverTypedDataAddress(
      signedData as RecoverTypedDataAddressParameters,
    );

    if (signedData.address && !sameEvmAddress(tokenOwner, signedData.address)) {
      throw new Error(
        `Recovered address does not match provided address ${signedData.address}`,
      );
    }

    return extractOperationDetailsFromDataWithAddress(
      { ...signedData, address: tokenOwner },
      {
        verifyingContract: validVerifyingContractAddresses,
      },
    );
  };

  return {
    extractOperationDetailsFromStandaloneData,
    extractOperationDetailsFromPermit2WitnessData,
    extractPermitDetails,
    extractOperationDetailsFromDataWithAddress,
    extractOperationDetailsFromSignedData,
  };
};

export type EIP712MessageHandlerUtils<S extends EIP712MessageSchema> =
  ReturnType<typeof makeEIP712MessageHandlerUtils<S>>;
