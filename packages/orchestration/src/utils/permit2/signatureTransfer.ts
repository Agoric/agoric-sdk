/**
 * @file Signature transfer permit2 types and utilities
 *
 * @license MIT
 * Copyright (c) 2021 Uniswap Lab
 * Copied and adapted from https://github.com/Uniswap/sdks/blob/de28419fcae6e6ba6f88e4a4ae46b2fc9d226cd6/sdks/permit2-sdk/src/signatureTransfer.ts
 *
 * The modifications made are to generalize the witness type to allow defining the field name,
 * and use viem types instead of ethers types.
 *
 * Some stylistic changes have also been made to conform to our code style.
 */

import type { TypedDataToPrimitiveTypes } from 'abitype';
import type {
  Address,
  TypedData,
  TypedDataDefinition,
  TypedDataDomain,
} from 'viem';
import type { TypedDataParameter } from '../abitype.ts';

const PERMIT2_DOMAIN_NAME = 'Permit2';

// TODO: disallow witness type field being another Permit field name
interface WitnessDefinition<
  T extends TypedData = TypedData,
  TD extends TypedDataParameter<string, Extract<keyof T, string>> =
    TypedDataParameter<'witness', Extract<keyof T, string>>,
> {
  witnessField: TD;
  witnessTypes: T;
}

export interface Witness<
  T extends TypedData = TypedData,
  TD extends TypedDataParameter<string, Extract<keyof T, string>> =
    TypedDataParameter<'witness', Extract<keyof T, string>>,
> extends WitnessDefinition<T, TD> {
  witness: TypedDataToPrimitiveTypes<T>[TD['type']];
}

/**
 * Helper to help caller check that the `data` matches the inferred witness types
 *
 * @see {@link https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html#the-noinfer-utility-type}
 */
export function makeWitness<
  T extends TypedData,
  TD extends TypedDataParameter<string, Extract<keyof T, string>>,
>(
  data: NoInfer<TypedDataToPrimitiveTypes<T>[TD['type']]>,
  types: T,
  typeParam: TD,
): Witness<T, TD> {
  return {
    witness: data,
    witnessTypes: types,
    witnessField: typeParam,
  };
}

export type TokenPermissions = {
  token: Address;
  amount: bigint;
};

export type PermitTransferFrom = {
  permitted: TokenPermissions;
  spender: Address;
  nonce: bigint;
  deadline: bigint;
};

export type PermitBatchTransferFrom = {
  permitted: readonly TokenPermissions[];
  spender: Address;
  nonce: bigint;
  deadline: bigint;
};

const Permit2DomainTypeParams = [
  { name: 'name', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
] as const satisfies TypedDataParameter[];

export const PermitTransferFromTypeParams = [
  { name: 'permitted', type: 'TokenPermissions' },
  { name: 'spender', type: 'address' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
] as const satisfies TypedDataParameter[];

export const PermitBatchTransferFromTypeParams = [
  { name: 'permitted', type: 'TokenPermissions[]' },
  { name: 'spender', type: 'address' },
  { name: 'nonce', type: 'uint256' },
  { name: 'deadline', type: 'uint256' },
] as const satisfies TypedDataParameter[];

const TokenPermissionTypeParams = [
  { name: 'token', type: 'address' },
  { name: 'amount', type: 'uint256' },
] as const satisfies TypedDataParameter[];

export const PermitTransferFromTypes = {
  EIP712Domain: Permit2DomainTypeParams,
  PermitTransferFrom: PermitTransferFromTypeParams,
  TokenPermissions: TokenPermissionTypeParams,
} as const satisfies TypedData;

export const PermitBatchTransferFromTypes = {
  EIP712Domain: Permit2DomainTypeParams,
  PermitBatchTransferFrom: PermitBatchTransferFromTypeParams,
  TokenPermissions: TokenPermissionTypeParams,
} as const satisfies TypedData;

export function permitWitnessTransferFromTypes<
  T extends TypedData,
  TD extends TypedDataParameter<string, Extract<keyof T, string>> =
    TypedDataParameter<'witness', Extract<keyof T, string>>,
>(witness: WitnessDefinition<T, TD>) {
  return {
    EIP712Domain: Permit2DomainTypeParams,
    PermitWitnessTransferFrom: [
      ...PermitTransferFromTypeParams,
      // Enable runtime type to accept undefined field for base type extraction
      ...((witness ? [witness.witnessField] : []) as [TD]),
    ],
    TokenPermissions: TokenPermissionTypeParams,
    ...witness?.witnessTypes,
  } as const satisfies TypedData;
}

export function permitBatchWitnessTransferFromTypes<
  T extends TypedData,
  TD extends TypedDataParameter<string, Extract<keyof T, string>> =
    TypedDataParameter<'witness', Extract<keyof T, string>>,
>(witness: WitnessDefinition<T, TD>) {
  return {
    EIP712Domain: Permit2DomainTypeParams,
    PermitBatchWitnessTransferFrom: [
      ...PermitBatchTransferFromTypeParams,
      // Enable runtime type to accept undefined field for base type extraction
      ...((witness ? [witness.witnessField] : []) as [TD]),
    ],
    TokenPermissions: TokenPermissionTypeParams,
    ...witness?.witnessTypes,
  } as const satisfies TypedData;
}

export type PermitWitnessTransferFrom<
  T extends Record<string, unknown>,
  TN extends string = 'witness',
> = PermitTransferFrom & { [key in TN]: T };

export type PermitBatchWitnessTransferFrom<
  T extends Record<string, unknown>,
  TN extends string = 'witness',
> = PermitBatchTransferFrom & { [key in TN]: T };

export function permit2Domain(
  permit2Address: Address,
  chainId: number | bigint,
) {
  return {
    name: PERMIT2_DOMAIN_NAME,
    chainId,
    verifyingContract: permit2Address,
  } as const satisfies TypedDataDomain;
}

// XXX: restore permit to be either PermitTransferFrom or PermitBatchTransferFrom
// and remove duplication between the two functions below
// Original method was `SignatureTransfer.getPermitData`
export function getPermitWitnessTransferFromData<
  T extends TypedData,
  TD extends TypedDataParameter<string, Extract<keyof T, string>> =
    TypedDataParameter<'witness', Extract<keyof T, string>>,
>(
  permit: PermitTransferFrom,
  permit2Address: Address,
  chainId: number | bigint,
  witness: Witness<T, TD>,
): TypedDataDefinition<
  ReturnType<typeof permitWitnessTransferFromTypes<T, TD>>,
  'PermitWitnessTransferFrom',
  'PermitWitnessTransferFrom'
> {
  // type MessageType = TypedDataToPrimitiveTypes<
  //   ReturnType<typeof permitWitnessTransferFromTypes<T, TD>>
  // >['PermitWitnessTransferFrom'];

  const domain = permit2Domain(permit2Address, chainId);

  const types = permitWitnessTransferFromTypes(witness);

  return {
    // @ts-expect-error some generic type inference issue
    domain,
    types,
    primaryType: 'PermitWitnessTransferFrom',
    // @ts-expect-error some generic type inference issue
    message: {
      ...permit,
      [witness.witnessField.name]: witness.witness,
    },
  };
}

export function getPermitBatchWitnessTransferFromData<
  T extends TypedData,
  TD extends TypedDataParameter<string, Extract<keyof T, string>> =
    TypedDataParameter<'witness', Extract<keyof T, string>>,
>(
  permit: PermitBatchTransferFrom,
  permit2Address: Address,
  chainId: number | bigint,
  witness: Witness<T, TD>,
): TypedDataDefinition<
  ReturnType<typeof permitBatchWitnessTransferFromTypes<T, TD>>,
  'PermitBatchWitnessTransferFrom',
  'PermitBatchWitnessTransferFrom'
> {
  // type MessageType = TypedDataToPrimitiveTypes<
  //   ReturnType<typeof permitBatchWitnessTransferFromTypes<T, TD>>
  // >['PermitBatchWitnessTransferFrom'];

  const domain = permit2Domain(permit2Address, chainId);

  const types = permitBatchWitnessTransferFromTypes(witness);

  return {
    // @ts-expect-error some generic type inference issue
    domain,
    types,
    primaryType: 'PermitBatchWitnessTransferFrom',
    // @ts-expect-error some generic type inference issue
    message: {
      ...permit,
      [witness.witnessField.name]: witness.witness,
    },
  };
}
