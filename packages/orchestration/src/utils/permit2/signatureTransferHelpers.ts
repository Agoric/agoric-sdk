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
import { objectMapMutable } from '@agoric/internal/src/js-utils.js';
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

export const isPermit2MessageType = (type: string): type is PrimaryTypeName =>
  type in PrimaryTypes;

const getPrimaryType = (types: TypedData): PrimaryTypeName => {
  const found = Object.keys(types).filter(isPermit2MessageType);
  if (found.length !== 1) {
    throw new Error(
      `Exactly one of the following types must be defined: ${Object.keys(PrimaryTypes).join(', ')}`,
    );
  }
  return found[0];
};

const permit2BaseTypeParams = {
  PermitBatchWitnessTransferFrom: PermitBatchTransferFromTypeParams,
  PermitWitnessTransferFrom: PermitTransferFromTypeParams,
} satisfies Record<PrimaryTypeName, TypedDataParameter[]>;

const typeMakers = {
  PermitBatchWitnessTransferFrom: permitBatchWitnessTransferFromTypes,
  PermitWitnessTransferFrom: permitWitnessTransferFromTypes,
} satisfies Record<PrimaryTypeName, (witness: any) => TypedData>;

/**
 * Make a function for returning the `witnessTypeString` argument to use in a
 * `permitWitnessTransferFrom` call.
 */
export const makeWitnessTypeStringExtractor = (powers: {
  encodeType: typeof encodeType;
}) => {
  const { encodeType } = powers;
  const encodedTypePrefixes = objectMapMutable(
    typeMakers,
    (makeTypes, primaryType) => {
      // Each EIP-712 `types` record produced by `makeTypes` differs only in the
      // fields of the struct identified by `primaryType` and any dependencies
      // of its witness field, so the string encoding of any such struct will
      // have a common prefix (e.g.,
      // `PermitWitnessTransferFrom(TokenPermissions permitted,...,uint256 deadline,`,
      // where what follows that last comma is the witness field).
      // We construct that prefix by calling `makeTypes` with *no* witness,
      // which is in violation of its static typing information but implemented
      // to return types in which `primaryType` has no witness field and
      // therefore encodes to a string with a `)` where the witness field
      // belongs.
      // @ts-expect-error undefined witness
      const baseTypes = makeTypes(undefined);
      const encoded = encodeType({ primaryType, types: baseTypes });
      return encoded.substring(0, encoded.indexOf(')'));
    },
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
    const primaryType = getPrimaryType(types);
    const encodedType = encodeType({ primaryType, types });

    const prefix = encodedTypePrefixes[primaryType];
    if (!encodedType.startsWith(prefix)) {
      throw new Error(`${primaryType} must start with expected base fields`);
    }

    return encodedType.substring(prefix.length);
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
  types: {
    [K in PrimaryTypeName]: Record<
      K,
      readonly [...(typeof permit2BaseTypeParams)[K], T]
    >;
  }[PrimaryTypeName],
): T => {
  const primaryTypeName = getPrimaryType(types);
  const fieldDefs = (types as MapUnion<typeof types>)[primaryTypeName];

  // `fieldDefs` must match the expected base type with a single extra field for
  // witness data.
  const baseFieldDefs = permit2BaseTypeParams[primaryTypeName];
  if (fieldDefs.length !== baseFieldDefs.length + 1) {
    throw new Error(
      `${primaryTypeName} must have ${baseFieldDefs.length + 1} fields`,
    );
  }
  for (const [i, { name, type }] of baseFieldDefs.entries()) {
    if (fieldDefs[i].name !== name || fieldDefs[i].type !== type) {
      throw new Error(
        `${primaryTypeName} field at index ${i} must be \`${type} ${name}\``,
      );
    }
  }

  return fieldDefs[fieldDefs.length - 1] as T;
};

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
