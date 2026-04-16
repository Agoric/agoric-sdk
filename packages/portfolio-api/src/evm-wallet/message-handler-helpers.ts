/**
 * @file Helpers to handle portfolio EIP-712 messages, extracting operation and
 * deposit permit details, as well as verifying the signature.
 *
 * The viem runtime dependency is expected as a power to make this usable both
 * on chain and in off-chain services.
 */

import type { AbiParameterToPrimitiveType, Address } from 'abitype';
import type { getTypesForEIP712Domain } from 'viem';
import type {
  hashStruct,
  isHex,
  recoverTypedDataAddress,
  RecoverTypedDataAddressParameters,
  validateTypedData,
} from 'viem/utils';
import { sameEvmAddress } from '@agoric/orchestration/src/utils/address.js';
import type {
  encodeType,
  WithSignature,
} from '@agoric/orchestration/src/utils/viem.js';
import {
  extractWitnessFieldFromTypes,
  isPermit2MessageType,
  makeWitnessTypeStringExtractor,
  validatePermit2Domain,
  validateTokenPermissionsType,
  type Permit2Domain,
  type PermitWitnessTransferFromInputComponents,
} from '@agoric/orchestration/src/utils/permit2.js';
import {
  type OperationTypeNames,
  type YmaxStandaloneOperationData,
  type YmaxPermitWitnessTransferFromData,
  type YmaxOperationType,
  splitWitnessFieldType,
  validateYmaxDomain,
  validateYmaxOperationTypeName,
  getYmaxOperationTypes,
  type YmaxFullDomain,
} from './eip712-messages.ts';

export type YmaxOperationDetails<
  T extends OperationTypeNames = OperationTypeNames,
> = {
  [P in T]: {
    operation: P;
    domain: YmaxFullDomain;
    data: YmaxOperationType<P>;
  };
}[T];

export type PermitWitnessTransferFromPayload = AbiParameterToPrimitiveType<{
  type: 'tuple';
  components: typeof PermitWitnessTransferFromInputComponents;
}>;

export type PermitDetails = {
  chainId: bigint;
  token: Address;
  amount: bigint;
  spender: Address;
  permit2Payload: Omit<PermitWitnessTransferFromPayload, 'transferDetails'>;
};

export type FullMessageDetails<
  T extends OperationTypeNames = OperationTypeNames,
> = YmaxOperationDetails<T> & {
  permitDetails?: PermitDetails;
  evmWalletAddress: Address;
  nonce: bigint;
  deadline: bigint;
};

/**
 * EVM Message handler utils that depend on 'viem' utils for their
 * implementation. Since on-chain we cannot directly import from 'viem',
 * use a maker pattern to create these utils.
 */
export const makeEVMHandlerUtils = (viemUtils: {
  isHex: typeof isHex;
  hashStruct: typeof hashStruct;
  recoverTypedDataAddress: typeof recoverTypedDataAddress;
  validateTypedData: typeof validateTypedData;
  encodeType: typeof encodeType;
  getTypesForEIP712Domain: typeof getTypesForEIP712Domain;
}) => {
  const {
    isHex,
    hashStruct,
    recoverTypedDataAddress,
    validateTypedData,
    encodeType,
    getTypesForEIP712Domain,
  } = viemUtils;

  for (const util of [
    isHex,
    hashStruct,
    recoverTypedDataAddress,
    validateTypedData,
    encodeType,
    getTypesForEIP712Domain,
  ]) {
    if (typeof util !== 'function') {
      throw new Error(`Expected viemUtils.${util} to be a function`);
    }
  }

  const getPermit2WitnessTypeString = makeWitnessTypeStringExtractor({
    encodeType,
  });

  /**
   * Extract operation type name and data from an EIP-712 standalone Ymax typed data.
   * Validates that the message data satisfies the expected types for the operation,
   * but does not validate that the supplied data types exactly match the expected
   * types. In particular the message data may be a superset of the expected types,
   * and extra fields are included in the returned extracted details.
   *
   * Assumes the domain has the expected shape of a Ymax domain.
   *
   * @param data - The EIP-712 typed data of a standalone message
   * @returns The operation type name and associated data
   */
  const extractOperationDetailsFromStandaloneData = <
    T extends OperationTypeNames,
  >(
    data: Omit<YmaxStandaloneOperationData<T>, 'domain'> & {
      domain: YmaxFullDomain;
    },
    validContractAddresses?: undefined,
  ): YmaxOperationDetails<T> => {
    const { domain, ...standaloneData } = data;

    if (validContractAddresses) {
      throw new Error(
        'Contract address validation expected to be validated separately',
      );
    }

    validateYmaxOperationTypeName<T>(standaloneData.primaryType);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { nonce, deadline, ..._operationData } =
      standaloneData.message as YmaxStandaloneOperationData['message'];
    const operationData = _operationData as YmaxOperationType<T>;
    const operation = standaloneData.primaryType;
    // @ts-expect-error inference issue
    validateTypedData({
      types: getYmaxOperationTypes(operation),
      message: operationData,
      primaryType: operation,
    });
    return { operation, domain, data: operationData };
  };

  /**
   * Extract operation type name and data from an EIP-712 Permit2 witness typed data.
   * Validates that the supplied types exactly match types of a permit2 message.
   * Validates that the witness data satisfies the expected types for the operation,
   * but does not validate that the supplied data types exactly match the expected
   * types. In particular the witness data may be a superset of the expected types,
   * and extra fields are included in the returned witness data.
   *
   * Assumes the message has already been validated against the types from the data.
   * Assumes the domain has the expected shape of a permit2 domain.
   *
   * @param data - The EIP-712 typed data of a Permit2 witness message
   * @returns The operation type name and associated data
   */
  const extractOperationDetailsFromPermit2WitnessData = <
    T extends OperationTypeNames,
  >(
    data: Omit<YmaxPermitWitnessTransferFromData<T>, 'domain'> & {
      domain: Permit2Domain;
    },
  ): YmaxOperationDetails<T> => {
    // @ts-expect-error generic/union type compatibility
    const permitData: YmaxPermitWitnessTransferFromData = data;

    const witnessField = extractWitnessFieldFromTypes(permitData.types);
    const witnessData = permitData.message[
      witnessField.name
    ] as YmaxOperationType<T>;
    const { primaryType, domain } = splitWitnessFieldType(witnessField.type);
    const chainId = BigInt(data.domain.chainId);
    const operation = primaryType as T;

    // Validates the witness data satisfies the expected types for the operation
    // @ts-expect-error inference issue
    validateTypedData({
      types: getYmaxOperationTypes(operation),
      message: witnessData,
      primaryType: operation,
    });
    const spender = permitData.message.spender;
    return {
      operation,
      domain: { ...domain, chainId, verifyingContract: spender },
      data: witnessData,
    };
  };

  type ExtractPermitDetails = {
    <T extends OperationTypeNames>(
      data: Omit<YmaxPermitWitnessTransferFromData<T>, 'domain'> & {
        domain: Permit2Domain;
        address: Address;
        signature: WithSignature<object>['signature'];
      },
    ): PermitDetails;
    <T extends OperationTypeNames>(
      data: Omit<YmaxPermitWitnessTransferFromData<T>, 'domain'> & {
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
  const extractPermitDetails: ExtractPermitDetails = <
    T extends OperationTypeNames,
  >(
    data: Omit<YmaxPermitWitnessTransferFromData<T>, 'domain'> & {
      domain: Permit2Domain;
      address?: Address;
      signature?: WithSignature<object>['signature'];
    },
    owner = data.address,
    signature = data.signature,
  ) => {
    // @ts-expect-error generic/union type compatibility
    const permitData: YmaxPermitWitnessTransferFromData = data;

    if (!isHex(signature)) {
      throw new Error(`Invalid signature format: ${signature}`);
    }

    if (!owner) {
      throw new Error(`Missing owner address`);
    }

    // Validates the permit2 related types are correct
    const witnessField = extractWitnessFieldFromTypes(permitData.types);
    validateTokenPermissionsType(permitData.types);

    const { [witnessField.name]: witnessData, ...permit } = permitData.message;
    const witness = hashStruct({
      primaryType: witnessField.type,
      types: permitData.types,
      data: witnessData,
    });
    const witnessTypeString = getPermit2WitnessTypeString(permitData.types);

    const { spender, ...permitStruct } = permit;

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
      token: permit.permitted.token,
      amount: permit.permitted.amount,
      permit2Payload,
      spender,
    };

    return details;
  };

  /**
   * Extract all details sufficient to handle any EIP-712 portfolio message,
   * optionally with permit data.
   *
   * This does not verify the signature of permit2 based messages; that is
   * expected to be done by the caller.
   *
   * Validates the domain of the typed data, and optionally the verifying
   * contract and spender against the provided contract addresses.
   *
   * @param data The operation data with an `address` field of the signing owner.
   * @param contractAddresses Optionally, a set of valid contract addresses to validate against
   * @param contractAddresses.permit2 If provided, validates a permit2 based message's verifying contract
   * @param contractAddresses.standalone If provided, validates a standalone message's verifying contract or permit2 spender
   */
  const extractOperationDetailsFromDataWithAddress = <
    T extends OperationTypeNames = OperationTypeNames,
  >(
    data: (
      | WithSignature<YmaxPermitWitnessTransferFromData<T>>
      | YmaxStandaloneOperationData<T>
    ) & { address: Address },
    contractAddresses: {
      permit2?: Partial<Record<number | string, Address>>;
      ymaxRepresentative?: Partial<Record<number | string, Address>>;
    } = {},
  ): FullMessageDetails<T> => {
    const {
      address: tokenOwner,
      domain,
      ...otherData
    } = data as unknown as (
      | WithSignature<YmaxPermitWitnessTransferFromData>
      | YmaxStandaloneOperationData
    ) & { address: Address };
    const { nonce, deadline } = otherData.message;

    if (!domain) {
      throw new Error(`Missing domain in typed data`);
    }
    validateTypedData({
      ...otherData,
      // @ts-expect-error inference issue
      domain,
      types: {
        ...otherData.types,
        // Do not trust the type definitions coming from the message for the domain
        EIP712Domain: getTypesForEIP712Domain({ domain }),
      },
    });

    if (isPermit2MessageType(data.primaryType)) {
      const { signature, ...permit2Data } = otherData as unknown as Omit<
        WithSignature<YmaxPermitWitnessTransferFromData<T>>,
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
      // If we have standalone representative addresses, validate the extracted
      // spender against them.
      if (contractAddresses.ymaxRepresentative) {
        validateYmaxDomain(
          operationDetails.domain,
          contractAddresses.ymaxRepresentative,
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
      const standaloneData = otherData as unknown as Omit<
        YmaxStandaloneOperationData<T>,
        'domain'
      >;

      validateYmaxDomain(domain, contractAddresses.ymaxRepresentative);

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
   * Extract all details sufficient to handle any EIP-712 portfolio message,
   * optionally with permit data.
   *
   * This expects an ECDSA signature and recovers the signer address from it.
   * If an address field is present, the recovered address must match the
   * provided address.
   *
   * @deprecated Use `extractOperationDetailsFromDataWithAddress` instead,
   * performing signature verification separately.
   *
   * @param signedData
   * @param validYmaxRepresentativeContractAddresses
   */
  const extractOperationDetailsFromSignedData = async <
    T extends OperationTypeNames = OperationTypeNames,
  >(
    signedData: WithSignature<
      YmaxPermitWitnessTransferFromData<T> | YmaxStandaloneOperationData<T>
    > & { address?: Address },
    validYmaxRepresentativeContractAddresses?: Partial<
      Record<number | string, Address>
    >,
  ): Promise<FullMessageDetails<T>> => {
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
        ymaxRepresentative: validYmaxRepresentativeContractAddresses,
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
