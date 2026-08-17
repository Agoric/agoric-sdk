/**
 * @file pure types, no runtime, ignored by Ava
 */
import { expectAssignable } from 'tsd';
import type {
  TypedDataParameter,
  TypedDataToStructType,
} from '../../src/utils/abitype.ts';

const Leaf = [
  { name: 'a', type: 'bool' },
  { name: 'b', type: 'string', optional: true },
] as const satisfies readonly TypedDataParameter[];

const Mid = [
  { name: 'leaf', type: 'Leaf' },
  { name: 'flag', type: 'bool', optional: true },
] as const satisfies readonly TypedDataParameter[];

const Root = [
  { name: 'mid', type: 'Mid' },
  { name: 'items', type: 'Leaf[]' },
  { name: 'pair', type: 'Leaf[2]' },
] as const satisfies readonly TypedDataParameter[];

type TD = {
  Leaf: typeof Leaf;
  Mid: typeof Mid;
  Root: typeof Root;
};

type RootType = TypedDataToStructType<TD, 'Root'>;

// `mid.leaf.b` is optional two structs deep from `Root` (Root -> Mid ->
// Leaf) -- exactly what `WithOptionalFields` couldn't do, since it only
// patched fields at the top level of a single `TypedDataToPrimitiveTypes`
// call.
expectAssignable<RootType>({
  mid: { leaf: { a: true } },
  items: [{ a: true }, { a: true, b: 'x' }],
  pair: [{ a: true }, { a: true }],
});

expectAssignable<RootType>({
  mid: { leaf: { a: true, b: 'x' }, flag: true },
  items: [],
  pair: [{ a: false }, { a: false }],
});

expectAssignable<RootType>({
  // @ts-expect-error missing required field `a`, nested two structs deep
  mid: { leaf: {} },
  items: [],
  pair: [{ a: true }, { a: true }],
});

expectAssignable<RootType>({
  mid: { leaf: { a: true } },
  items: [],
  // @ts-expect-error `pair` is a fixed-length `Leaf[2]`, not `Leaf[1]`
  pair: [{ a: true }],
});

type LeafType = TypedDataToStructType<TD, 'Leaf'>;
expectAssignable<LeafType>({ a: true });
expectAssignable<LeafType>({ a: true, b: 'x' });
