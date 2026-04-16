import type {
  ByteArray,
  Hex,
  Signature,
  TypedData,
  TypedDataDefinition,
} from 'viem';

export type WithSignature<T> = T & {
  signature: Hex | ByteArray | Signature;
};

export type SignedTypedDataDefinition<
  typedData extends TypedData | Record<string, unknown> = TypedData,
  primaryType extends keyof typedData | 'EIP712Domain' = keyof typedData,
  ///
  primaryTypes = typedData extends TypedData ? keyof typedData : string,
> = WithSignature<TypedDataDefinition<typedData, primaryType, primaryTypes>>;
