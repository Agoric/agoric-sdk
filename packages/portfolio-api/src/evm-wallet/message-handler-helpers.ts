/**
 * @file Helpers to handle portfolio EIP-712 messages, extracting operation and
 * deposit permit details, as well as verifying the signature.
 *
 * The viem runtime dependency is expected as a power to make this usable both
 * on chain and in off-chain services.
 */

import type {
  AbiParameterToPrimitiveType,
  Address,
  TypedDataDomain,
} from 'abitype';
import type {
  hashStruct,
  isHex,
  recoverTypedDataAddress,
  RecoverTypedDataAddressParameters,
  validateTypedData,
} from 'viem/utils';
import {
  encodeType,
  type WithSignature,
} from '@agoric/orchestration/src/utils/viem.ts';
import {
  extractWitnessFieldFromTypes,
  isPermit2MessageType,
  makeWitnessTypeStringExtractor,
  type PermitWitnessTransferFromInputComponents,
} from '@agoric/orchestration/src/utils/permit2.ts';
import {
  type OperationTypeNames,
  type YmaxStandaloneOperationData,
  type YmaxPermitWitnessTransferFromData,
  type YmaxOperationType,
  splitWitnessFieldType,
  validateYmaxDomain,
  validateYmaxOperationTypeName,
  getYmaxOperationTypes,
} from './eip712-messages.ts';

export type YmaxOperationDetails<T extends OperationTypeNames> = {
  [P in T]: {
    operation: P;
    data: YmaxOperationType<P>;
  };
}[T];

export type PermitWitnessTransferFromPayload = AbiParameterToPrimitiveType<{
  type: 'tuple';
  components: typeof PermitWitnessTransferFromInputComponents;
}>;

export type PermitDetails = {
  chainId: NonNullable<TypedDataDomain['chainId']>;
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

export const makeEVMHandlerUtils = (powers: {
  isHex: typeof isHex;
  hashStruct: typeof hashStruct;
  recoverTypedDataAddress: typeof recoverTypedDataAddress;
  validateTypedData: typeof validateTypedData;
  encodeType: typeof encodeType;
}) => {
  const {
    isHex,
    hashStruct,
    recoverTypedDataAddress,
    validateTypedData,
    encodeType,
  } = powers;
  /**
   * Extract operation type name and data from an EIP-712 standalone Ymax typed data
   *
   * @param data - The EIP-712 typed data of a standalone message
   * @returns The operation type name and associated data
   */
  const extractOperationDetailsFromStandaloneData = <
    T extends OperationTypeNames,
  >(
    data: YmaxStandaloneOperationData<T>,
  ): YmaxOperationDetails<T> => {
    // @ts-expect-error generic/union type compatibility
    const standaloneData: YmaxStandaloneOperationData = data;

    validateYmaxDomain(standaloneData.domain);
    validateYmaxOperationTypeName<T>(standaloneData.primaryType);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { nonce, deadline, ..._operationData } = standaloneData.message;
    const operationData = _operationData as YmaxOperationType<T>;
    const operation = standaloneData.primaryType;
    // @ts-expect-error inference issue
    validateTypedData({
      types: getYmaxOperationTypes(operation),
      message: operationData,
      primaryType: operation,
    });
    return { operation, data: operationData };
  };

  /**
   * Extract operation type name and data from an EIP-712 Permit2 witness typed data.
   *
   * @param data - The EIP-712 typed data of a Permit2 witness message
   * @returns The operation type name and associated data
   */
  const extractOperationDetailsFromPermit2WitnessData = <
    T extends OperationTypeNames,
  >(
    data: YmaxPermitWitnessTransferFromData<T>,
  ): YmaxOperationDetails<T> => {
    // @ts-expect-error generic/union type compatibility
    const permitData: YmaxPermitWitnessTransferFromData = data;

    const witnessField = extractWitnessFieldFromTypes(permitData.types);
    const witnessData = permitData.message[
      witnessField.name
    ] as YmaxOperationType<T>;
    const operation = splitWitnessFieldType(witnessField.type).primaryType as T;
    // @ts-expect-error inference issue
    validateTypedData({
      types: getYmaxOperationTypes(operation),
      message: witnessData,
      primaryType: operation,
    });
    return { operation, data: witnessData };
  };

  /**
   * Extract the data that can be used as partial arguments to permit2's
   * permitWitnessTransferFrom
   *
   * This does not verify the signature; that is expected to be done by the caller.
   *
   * @param data permit2 message with witness data to summarize
   * @param owner address of the permit2 message signer
   * @param signature signature of the permit2 message
   */
  const extractPermitDetails = <T extends OperationTypeNames>(
    data: YmaxPermitWitnessTransferFromData<T>,
    owner: Address,
    signature: WithSignature<object>['signature'],
  ): PermitDetails => {
    const witnessTypeStringExtractor = makeWitnessTypeStringExtractor({
      encodeType,
    });
    // @ts-expect-error generic/union type compatibility
    const permitData: YmaxPermitWitnessTransferFromData = data;

    if (!isHex(signature)) {
      throw new Error(`Invalid signature format: ${signature}`);
    }

    const witnessField = extractWitnessFieldFromTypes(permitData.types);
    const { [witnessField.name]: witnessData, ...permit } = permitData.message;
    const witness = hashStruct({
      primaryType: witnessField.type,
      types: permitData.types,
      data: witnessData,
    });
    const witnessTypeString = witnessTypeStringExtractor(permitData.types);

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

    const details: PermitDetails = {
      chainId: permitData.domain!.chainId!,
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
   * @param signedData
   * @returns
   */
  const extractOperationDetailsFromSignedData = async <
    T extends OperationTypeNames = OperationTypeNames,
  >(
    signedData: WithSignature<
      YmaxPermitWitnessTransferFromData<T> | YmaxStandaloneOperationData<T>
    >,
  ): Promise<FullMessageDetails<T>> => {
    const tokenOwner = await recoverTypedDataAddress(
      signedData as RecoverTypedDataAddressParameters,
    );
    const { nonce, deadline } = (
      signedData as unknown as
        | YmaxPermitWitnessTransferFromData
        | YmaxStandaloneOperationData
    ).message;

    if (isPermit2MessageType(signedData.primaryType)) {
      const permit2Data =
        signedData as unknown as YmaxPermitWitnessTransferFromData<T>;

      const permitDetails = extractPermitDetails(
        permit2Data,
        tokenOwner,
        signedData.signature,
      );
      const operationDetails =
        extractOperationDetailsFromPermit2WitnessData(permit2Data);

      return {
        ...operationDetails,
        permitDetails,
        evmWalletAddress: tokenOwner,
        nonce,
        deadline,
      };
    } else {
      const standaloneData =
        signedData as unknown as YmaxStandaloneOperationData<T>;
      const operationDetails =
        extractOperationDetailsFromStandaloneData(standaloneData);

      return {
        ...operationDetails,
        evmWalletAddress: tokenOwner,
        nonce,
        deadline,
      };
    }
  };

  return {
    extractOperationDetailsFromStandaloneData,
    extractOperationDetailsFromPermit2WitnessData,
    extractPermitDetails,
    extractOperationDetailsFromSignedData,
  };
};
