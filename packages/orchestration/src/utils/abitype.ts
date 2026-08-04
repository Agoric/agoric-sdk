import type { TypedDataType, TypedData } from 'abitype';
import type { Simplify } from '@agoric/internal';

// Redefine abitype's TypedDataParameter to make it generic
export type TypedDataParameter<
  TN extends string = string,
  TT extends string =
    | TypedDataType
    | keyof TypedData
    | `${keyof TypedData}[${string | ''}]`,
> = {
  name: TN;
  type: TT;
  /**
   * Repo-local extension, not part of the EIP-712 spec: marks this field as
   * not required to be present on every instance of the struct in a given
   * message. Must be resolved by `normalizeEIP712Data` (dropped, or stripped
   * to a plain required field) before the type record is used by any real
   * EIP-712 tooling (e.g. viem's `hashStruct`/`validateTypedData`), which
   * doesn't understand it.
   */
  optional?: boolean;
};

/** Names of fields in a struct field list `F` marked `optional: true`. */
export type OptionalFieldNames<F extends readonly TypedDataParameter[]> =
  Extract<F[number], { optional: true }>['name'];

/**
 * Given a primitive type `T` inferred for a struct (e.g. via abitype's
 * `TypedDataToPrimitiveTypes`) and that struct's field list `F` (which may
 * carry `optional` markers), re-mark the fields named in `F` as `optional`
 * as optional (`?`) in `T`. `TypedDataToPrimitiveTypes` doesn't understand
 * the repo-local `optional` marker, so every field shows up as required in
 * `T` unless corrected this way.
 */
export type WithOptionalFields<
  T,
  F extends readonly TypedDataParameter[],
> = Simplify<
  Omit<T, OptionalFieldNames<F>> &
    Partial<Pick<T, OptionalFieldNames<F> & keyof T>>
>;
