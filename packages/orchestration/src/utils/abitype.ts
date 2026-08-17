import type {
  AbiParameterToPrimitiveType,
  TypedDataType,
  TypedData,
} from 'abitype';
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

/**
 * Depth-agnostic replacement for abitype's `TypedDataToPrimitiveTypes`,
 * which has no notion of this repo's `optional` field marker at all -- every
 * field of every struct it touches infers as required. Given the full
 * type-graph record `TD` and the name `K` of the struct to convert, this
 * recursively derives the same TS type abitype would for that struct, but
 * applies `optional` at every struct it encounters, however deeply nested
 * (directly, through another struct field, or through an array element
 * type).
 *
 * Values for plain Solidity primitive fields (and arrays of them) are still
 * computed via abitype's own `AbiParameterToPrimitiveType` -- only the
 * struct/array *graph walk* is reimplemented here, to weave in `optional`.
 * Unlike abitype's version, this has no self/circular-reference detection:
 * none of this repo's type graphs are self-referencing, so it wasn't worth
 * reproducing.
 */
export type TypedDataToStructType<
  TD extends Record<string, readonly TypedDataParameter[]>,
  K extends keyof TD & string,
> = StructToType<TD, TD[K]>;

type StructToType<
  TD extends Record<string, readonly TypedDataParameter[]>,
  Fields extends readonly TypedDataParameter[],
> = Simplify<
  {
    [F in Exclude<
      Fields[number],
      { optional: true }
    > as F['name']]: FieldToType<TD, F['type']>;
  } & {
    [F in Extract<
      Fields[number],
      { optional: true }
    > as F['name']]?: FieldToType<TD, F['type']>;
  }
>;

/**
 * `Foo[3]` / `Foo[]` -> `{elem: 'Foo'; size: '3' | ''}`; non-array ->
 * `undefined`, NOT `never` -- `never` is a subtype of everything, so
 * `ParseArrayType<T> extends {elem: ...; size: ...}` would then vacuously
 * match every non-array `T` too (mirrors abitype's own `undefined` fallback
 * in `MaybeExtractArrayParameterType`, for the same reason).
 */
type ParseArrayType<T extends string> = T extends `${infer Elem}[${infer Size}]`
  ? { elem: Elem; size: Size }
  : undefined;

/** Mirrors abitype's own (unexported) `Tuple` helper. */
type FixedLengthTuple<
  T,
  N extends number,
  Acc extends unknown[] = [],
> = Acc['length'] extends N ? Acc : FixedLengthTuple<T, N, [T, ...Acc]>;

type FieldToType<
  TD extends Record<string, readonly TypedDataParameter[]>,
  FieldType extends string,
> =
  ParseArrayType<FieldType> extends {
    elem: infer Elem extends string;
    size: infer Size extends string;
  }
    ? Elem extends keyof TD & string
      ? Size extends `${infer N extends number}`
        ? FixedLengthTuple<StructToType<TD, TD[Elem]>, N>
        : readonly StructToType<TD, TD[Elem]>[]
      : AbiParameterToPrimitiveType<{ name: string; type: FieldType }>
    : FieldType extends keyof TD & string
      ? StructToType<TD, TD[FieldType]>
      : AbiParameterToPrimitiveType<{ name: string; type: FieldType }>;
