/**
 * @file Helpers for working with Uniswap Permit2 SignatureTransfer
 * `permitWitnessTransferFrom`.
 * @see {@link https://docs.uniswap.org/contracts/permit2/reference/signature-transfer}
 *
 * This is original code that was adapted for permit2-sdk, unlike @see ./permit2SignatureTransfer.ts
 */

import type {
  AbiFunction,
  AbiParameter,
  AbiParameterToPrimitiveType,
  TypedData,
} from 'abitype';
import { keyMirror } from '@agoric/internal/src/keyMirror.js';
import type { TypedDataParameter } from '../abitype.ts';
import type { encodeType } from '../viem-utils/hashTypedData.ts';
import {
  PermitBatchTransferFromTypeParams,
  permitBatchWitnessTransferFromTypes,
  PermitTransferFromTypeParams,
  permitWitnessTransferFromTypes,
} from './signatureTransfer.ts';

const PrimaryTypes = keyMirror({
  PermitBatchWitnessTransferFrom: null,
  PermitWitnessTransferFrom: null,
});
type PrimaryTypeName = keyof typeof PrimaryTypes;

/**
 * Make a function for returning the `witnessTypeString` argument to use in a
 * `permitWitnessTransferFrom` call.
 */
export const makeWitnessTypeStringExtractor = (powers: {
  encodeType: typeof encodeType;
}) => {
  const { encodeType } = powers;
  const baseTypeStrings = Object.fromEntries(
    Object.entries({
      PermitBatchWitnessTransferFrom: permitBatchWitnessTransferFromTypes,
      PermitWitnessTransferFrom: permitWitnessTransferFromTypes,
    }).map(([typeName, typeFunc]) => {
      const encoded = encodeType({
        primaryType: typeName,
        // @ts-expect-error undefined is not allowed in types but supported in implementation
        types: typeFunc(undefined),
      });

      const prefix = encoded.substring(0, encoded.indexOf(')'));
      return [typeName, `${prefix},`];
    }),
  );

  /**
   * Return the `witnessTypeString` argument for a `permitWitnessTransferFrom`
   * call using the provided EIP-712 `types` record.
   * Note that `types` must define either a valid "PermitWitnessTransferFrom" or
   * a valid "PermitBatchWitnessTransferFrom", but not both.
   * The returned string is the suffix of the EIP-712 encoding of that primary
   * type that starts with its witness field.
   */
  const getWitnessTypeString = (types: TypedData) => {
    const matchingTypes = Object.keys(types).filter(
      type => type in baseTypeStrings,
    );

    if (matchingTypes.length !== 1) {
      throw new Error(
        `TypedData must have exactly one of the following types: ${Object.keys(baseTypeStrings).join(', ')}`,
      );
    }

    const primaryType = matchingTypes[0];
    const encodedType = encodeType({
      primaryType,
      types,
    });

    const baseTypeString = baseTypeStrings[primaryType];
    if (!encodedType.startsWith(baseTypeString)) {
      throw new Error(
        `TypedData has an invalid type string for ${primaryType}`,
      );
    }

    return encodedType.substring(baseTypeString.length);
  };
  return getWitnessTypeString;
};

type MapUnion<U> = {
  [K in U extends any ? keyof U : never]: U extends any
    ? K extends keyof U
      ? U[K]
      : never
    : never;
};

/**
 * Confirm that the input is a EIP-712 `types` record with a single struct
 * definition for the first argument to a `permitWitnessTransferFrom` call
 * (i.e., named either "PermitWitnessTransferFrom" for a single-token transfer
 * or "PermitBatchWitnessTransferFrom" for a multi-token transfer), and return
 * the TypedDataParameter describing the witness field of that definition.
 */
export const extractWitnessFieldFromTypes = <
  T extends Readonly<TypedDataParameter>,
>(
  types:
    | {
        PermitBatchWitnessTransferFrom: readonly [
          ...typeof PermitBatchTransferFromTypeParams,
          T,
        ];
      }
    | {
        PermitWitnessTransferFrom: readonly [
          ...typeof PermitTransferFromTypeParams,
          T,
        ];
      },
): T => {
  const baseTypes = {
    PermitBatchWitnessTransferFrom: PermitBatchTransferFromTypeParams,
    PermitWitnessTransferFrom: PermitTransferFromTypeParams,
  };

  const matchingTypes = Object.keys(types).filter(
    type => type in baseTypes,
  ) as PrimaryTypeName[];

  if (matchingTypes.length !== 1) {
    throw new Error(
      `TypedData must have exactly one of the following types: ${Object.keys(baseTypes).join(', ')}`,
    );
  }

  const primaryType = matchingTypes[0];
  const candidateType = (types as MapUnion<typeof types>)[primaryType];
  const referenceType = baseTypes[primaryType];
  // `candidateType` must match the expected reference type with a single extra
  // field for witness data.
  if (candidateType.length !== referenceType.length + 1) {
    throw new Error(
      `TypedData has an invalid number of fields for ${primaryType}`,
    );
  }

  for (const [i, field] of referenceType.entries()) {
    if (
      candidateType[i].name !== field.name ||
      candidateType[i].type !== field.type
    ) {
      throw new Error(
        `TypedData has an invalid field at index ${i} for ${primaryType}`,
      );
    }
  }

  return candidateType[candidateType.length - 1] as T;
};

export const isPermit2MessageType = (type: string): type is PrimaryTypeName =>
  type in PrimaryTypes;

export const TokenPermissionsComponents = [
  { name: 'token', type: 'address' },
  { name: 'amount', type: 'uint256' },
] as const satisfies AbiParameter[];
export const TokenPermissionsInternalTypeName =
  'struct ISignatureTransfer.TokenPermissions' as const;

export const PermitTransferFromComponents = [
  {
    name: 'permitted',
    type: 'tuple',
    internalType: TokenPermissionsInternalTypeName,
    components: TokenPermissionsComponents,
  },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
] as const satisfies AbiParameter[];
export const PermitTransferFromInternalTypeName =
  'struct ISignatureTransfer.PermitTransferFrom' as const;
export type PermitTransferFromStruct = AbiParameterToPrimitiveType<{
  type: 'tuple';
  internalType: typeof PermitTransferFromInternalTypeName;
  components: typeof PermitTransferFromComponents;
}>;

export const PermitBatchTransferFromComponents = [
  {
    name: 'permitted',
    type: 'tuple[]',
    internalType: `${TokenPermissionsInternalTypeName}[]`,
    components: TokenPermissionsComponents,
  },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
] as const satisfies AbiParameter[];
export const PermitBatchTransferFromInternalTypeName =
  'struct ISignatureTransfer.PermitBatchTransferFrom' as const;
export type PermitBatchTransferFromStruct = AbiParameterToPrimitiveType<{
  type: 'tuple';
  internalType: typeof PermitBatchTransferFromInternalTypeName;
  components: typeof PermitBatchTransferFromComponents;
}>;

export const SignatureTransferDetailsComponents = [
  { name: 'to', type: 'address' },
  { name: 'requestedAmount', type: 'uint256' },
] as const satisfies AbiParameter[];
export const SignatureTransferDetailsInternalTypeName =
  'struct ISignatureTransfer.SignatureTransferDetails' as const;
export type SignatureTransferDetailsStruct = AbiParameterToPrimitiveType<{
  type: 'tuple';
  internalType: typeof SignatureTransferDetailsInternalTypeName;
  components: typeof SignatureTransferDetailsComponents;
}>;

export const PermitWitnessTransferFromInputComponents = [
  {
    name: 'permit',
    type: 'tuple',
    internalType: PermitTransferFromInternalTypeName,
    components: PermitTransferFromComponents,
  },
  {
    name: 'transferDetails',
    type: 'tuple',
    internalType: SignatureTransferDetailsInternalTypeName,
    components: SignatureTransferDetailsComponents,
  },
  { name: 'owner', type: 'address' },
  { name: 'witness', type: 'bytes32' },
  { name: 'witnessTypeString', type: 'string' },
  { name: 'signature', type: 'bytes' },
] as const satisfies AbiParameter[];
export type PermitWitnessTransferFromPayload = AbiParameterToPrimitiveType<{
  type: 'tuple';
  components: typeof PermitWitnessTransferFromInputComponents;
}>;

export const BatchPermitWitnessTransferFromInputComponents = [
  {
    name: 'permit',
    type: 'tuple',
    internalType: PermitBatchTransferFromInternalTypeName,
    components: PermitBatchTransferFromComponents,
  },
  {
    name: 'transferDetails',
    type: 'tuple[]',
    internalType: `${SignatureTransferDetailsInternalTypeName}[]`,
    components: SignatureTransferDetailsComponents,
  },
  { name: 'owner', type: 'address' },
  { name: 'witness', type: 'bytes32' },
  { name: 'witnessTypeString', type: 'string' },
  { name: 'signature', type: 'bytes' },
] as const satisfies AbiParameter[];
export type BatchPermitWitnessTransferFromPayload =
  AbiParameterToPrimitiveType<{
    type: 'tuple';
    components: typeof BatchPermitWitnessTransferFromInputComponents;
  }>;

export const PermitWitnessTransferFromFunctionABIType = {
  name: 'permitWitnessTransferFrom',
  inputs: PermitWitnessTransferFromInputComponents,
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
} as const satisfies AbiFunction;

export const BatchPermitWitnessTransferFunctionABIType = {
  name: 'permitWitnessTransferFrom',
  inputs: BatchPermitWitnessTransferFromInputComponents,
  outputs: [],
  stateMutability: 'nonpayable',
  type: 'function',
} as const satisfies AbiFunction;
