/**
 * @file Helpers for working with permit2 signature transfer witness types
 *
 * This is original code that was adapted for permit2-sdk, unlike @see ./permit2SignatureTransfer.ts
 */

import type { TypedData } from 'viem';
import type { TypedDataParameter } from '../abitype.ts';
import {
  PermitBatchTransferFromTypeParams,
  permitBatchWitnessTransferFromTypes,
  PermitTransferFromTypeParams,
  permitWitnessTransferFromTypes,
} from './signatureTransfer.ts';

export const makeWitnessTypeStringExtractor = ({
  encodeType,
}: {
  encodeType: ({
    primaryType,
    types,
  }: {
    primaryType: string;
    types: TypedData;
  }) => string;
}) => {
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

  return function getWitnessTypeString(types: TypedData) {
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
};

type MapUnion<U> = {
  [K in U extends any ? keyof U : never]: U extends any
    ? K extends keyof U
      ? U[K]
      : never
    : never;
};

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
  ) as (keyof typeof baseTypes)[];

  if (matchingTypes.length !== 1) {
    throw new Error(
      `TypedData must have exactly one of the following types: ${Object.keys(baseTypes).join(', ')}`,
    );
  }

  const primaryType = matchingTypes[0];
  const candidateType = (types as MapUnion<typeof types>)[primaryType];
  const referenceType = baseTypes[primaryType];
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

export const isPermit2MessageType = (type: string) => {
  return (
    type === 'PermitBatchWitnessTransferFrom' ||
    type === 'PermitWitnessTransferFrom'
  );
};
