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
 *
 * `Kind` selects which values the type describes: `'output'` (the default)
 * is the canonical form, e.g. as returned by `normalizeAndValidateEIP712Data`;
 * `'input'` additionally allows the other encodings it accepts and
 * normalizes (see {@link EIP712IntegerInput}).
 */
export type TypedDataToStructType<
  TD extends Record<string, readonly TypedDataParameter[]>,
  K extends keyof TD & string,
  Kind extends TypedDataValueKind = 'output',
> = StructToType<TD, TD[K], Kind>;

export type TypedDataValueKind = 'input' | 'output';

/**
 * The values `normalizeAndValidateEIP712Data` accepts (and normalizes to
 * abitype's `number`/`bigint` output type) for a `uint<M>`/`int<M>` field. Range and exact string grammar
 * (unsigned hex, or optionally signed decimal) are only checked at runtime.
 */
export type EIP712IntegerInput =
  | bigint
  | number
  | `${bigint}`
  | `+${bigint}`
  | `0x${string}`;

type StructToType<
  TD extends Record<string, readonly TypedDataParameter[]>,
  Fields extends readonly TypedDataParameter[],
  Kind extends TypedDataValueKind,
> = Simplify<
  {
    [F in Exclude<
      Fields[number],
      { optional: true }
    > as F['name']]: FieldToType<TD, F['type'], Kind>;
  } & {
    [F in Extract<
      Fields[number],
      { optional: true }
    > as F['name']]?: FieldToType<TD, F['type'], Kind>;
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

/** `T[N]` / `T[]` for an array type's parsed `Size`. */
type ArrayOfSize<T, Size extends string> = Size extends `${infer N extends
  number}`
  ? FixedLengthTuple<T, N>
  : readonly T[];

type PrimitiveToType<
  FieldType extends string,
  Kind extends TypedDataValueKind,
> = Kind extends 'input'
  ? FieldType extends `int${string}` | `uint${string}`
    ? EIP712IntegerInput
    : AbiParameterToPrimitiveType<{ name: string; type: FieldType }>
  : AbiParameterToPrimitiveType<{ name: string; type: FieldType }>;

type FieldToType<
  TD extends Record<string, readonly TypedDataParameter[]>,
  FieldType extends string,
  Kind extends TypedDataValueKind,
> =
  ParseArrayType<FieldType> extends {
    elem: infer Elem extends string;
    size: infer Size extends string;
  }
    ? Elem extends keyof TD & string
      ? ArrayOfSize<StructToType<TD, TD[Elem], Kind>, Size>
      : Kind extends 'input'
        ? ArrayOfSize<PrimitiveToType<Elem, Kind>, Size>
        : AbiParameterToPrimitiveType<{ name: string; type: FieldType }>
    : FieldType extends keyof TD & string
      ? StructToType<TD, TD[FieldType], Kind>
      : PrimitiveToType<FieldType, Kind>;
