/**
 * @file Normalizes EIP-712 typed data (`{message, types, primaryType}`) so that:
 * - `optional` struct fields (see {@link TypedDataParameter}) are resolved
 *   per-message: dropped from `types` if never present on any instance of
 *   the struct in the message, otherwise kept with the `optional` marker
 *   stripped (i.e. treated as required from that point on),
 * - struct types not actually encountered while walking `message` from
 *   `primaryType` (e.g. only reachable through a since-removed optional
 *   field, or through a field that's missing from this particular message)
 *   are absent from `types`. `EIP712Domain` is always preserved if present,
 *   since domain values live outside `message` and are never encountered by
 *   that walk.
 *
 * Additionally, unless `onExtraField: 'keep'` is used:
 * - fields not declared in `types` are dropped from `message` (or rejected),
 * - elements beyond a fixed-length array's declared length are dropped from
 *   `message` (or rejected); dynamic-length arrays are never truncated since
 *   every element affects the EIP-712 hash.
 *
 * `onExtraField` controls how the fields/elements above are handled:
 * - 'drop' (default): silently remove them from `message`.
 * - 'throw': reject them — use this when `types` is the trusted/expected
 *   shape and `message` is untrusted, to catch data smuggled in outside
 *   what's declared.
 * - 'keep': leave `message` untouched entirely (no projection, no
 *   truncation) — only `optional`-field resolution and type-graph pruning
 *   are applied to `types`.
 *
 * This does not validate presence of required fields or array lengths; that
 * is left to real EIP-712 validation (e.g. viem's `validateTypedData`)
 * afterward. In particular, if the same struct type is used more than once
 * in a message and only some instances set an `optional` field, that field
 * becomes required in the returned `types` (since EIP-712 has one field list
 * per type name — true per-instance optionality across repeated usages of a
 * type isn't representable without a distinct type per variant), and any
 * instance missing it will correctly fail that later validation.
 *
 * No runtime dependency on `viem`/`abitype`, so this can run on-chain.
 */
import type { TypedDataParameter } from '../abitype.ts';

type TypesRecord = Record<string, readonly TypedDataParameter[]>;

export type NormalizeEIP712DataInput = {
  message: Record<string, unknown>;
  types: TypesRecord;
  primaryType: string;
};

export type NormalizeEIP712DataOptions = {
  /** default 'drop' */
  onExtraField?: 'drop' | 'throw' | 'keep';
};

export type NormalizeEIP712DataResult = {
  message: Record<string, unknown>;
  types: TypesRecord;
};

const ARRAY_SUFFIX = /\[(\d*)\]$/u;

const splitArrayType = (
  type: string,
): { base: string; length?: number; isArray: boolean } => {
  const match = type.match(ARRAY_SUFFIX);
  if (!match) return { base: type, isArray: false };
  return {
    base: type.slice(0, -match[0].length),
    length: match[1] ? Number(match[1]) : undefined,
    isArray: true,
  };
};

/** A struct's fields, keyed by name, tracking whether each has turned out to be required. */
type TypeFields = Record<string | number, { required: boolean; type: string }>;

/** Looks up (and lazily builds) the {@link TypeFields} for a struct type name, or `undefined` for a primitive leaf. */
type GetType = (typeName: string) => TypeFields | undefined;

/**
 * Walks `value` against `fieldType` (a struct or array field type string),
 * handling both array and struct field types together (a field's declared
 * type is never an array of arrays, so one function covers both without a
 * second one to dispatch through). Struct field lists come from `getType`,
 * which also tracks -- by mutating the `required` flag on each field it
 * hands out -- which fields turn out to be present on some instance; see
 * {@link normalizeEIP712Data} for how that's used once the walk completes.
 */
const visit = (
  fieldType: string,
  value: any,
  getType: GetType,
  onExtraField: 'drop' | 'throw' | 'keep',
): unknown => {
  if (typeof value !== 'object' || value === null) return value; // primitive leaf (possibly malformed)
  const keep = onExtraField === 'keep';
  const { base, length: requiredLength, isArray } = splitArrayType(fieldType);
  // Registers `base` in the output types even if no element ends up visited.
  const baseType = getType(base);
  let type: TypeFields;
  let result: any;
  if (isArray) {
    const length = Math.min(
      value.length ?? requiredLength,
      requiredLength ?? value.length,
    );
    if (Number.isNaN(length)) return value; // malformed; leave to later validation
    if (
      onExtraField === 'throw' &&
      requiredLength !== undefined &&
      value.length > requiredLength
    ) {
      throw new Error(
        `Array field "${fieldType}" has ${value.length} elements, expected at most ${requiredLength}`,
      );
    }
    result = keep ? value : new Array(length);
    type = Array.from({ length }, () => ({
      required: true,
      type: base,
    })) as unknown as TypeFields;
  } else {
    if (!baseType) return value; // primitive leaf
    // Plain object, not null-prototype: this ends up in the returned
    // `message`, which may need to be Endo-Passable (e.g. across a Zoe/exo
    // boundary), and a null-prototype object fails that check.
    result = keep ? value : {};
    type = baseType;
  }

  if (onExtraField === 'throw') {
    const extraKeys = Object.keys(value).filter(key => !(key in type));
    if (extraKeys.length) {
      throw new Error(
        `Unexpected field(s) on EIP-712 type "${fieldType}": ${extraKeys.join(', ')}`,
      );
    }
  }

  // `fieldName in obj`, not `hasOwnProperty`: matches how viem itself reads
  // field values (plain property access resolves the prototype chain).
  // `type` is null-prototype or a fresh array-literal record, so there's no
  // inherited-property risk to guard against here.
  // eslint-disable-next-line guard-for-in
  for (const fieldName in type) {
    if (!(fieldName in value)) continue;
    type[fieldName].required = true;
    const projectedValue = visit(
      type[fieldName].type,
      value[fieldName],
      getType,
      onExtraField,
    );
    if (!keep) result[fieldName] = projectedValue;
  }
  return result;
};

export const normalizeEIP712Data = (
  input: NormalizeEIP712DataInput,
  options: NormalizeEIP712DataOptions = {},
): NormalizeEIP712DataResult => {
  const { message, types, primaryType } = input;
  const onExtraField = options.onExtraField ?? 'drop';

  // Built lazily as struct types are encountered walking `message`, and
  // shared across every instance of a given type name -- see `visit`.
  const resultTypes = new Map<string, TypeFields>();
  const getType: GetType = typeName => {
    const cached = resultTypes.get(typeName);
    if (cached) return cached;
    const declared = types[typeName];
    if (!declared) return undefined; // primitive leaf
    // Null-prototype so `fieldName in type` in `visit` can't collide with
    // an inherited Object.prototype member (e.g. a field named "toString").
    const fields: TypeFields = Object.create(null);
    for (const field of declared) {
      fields[field.name] = { required: !field.optional, type: field.type };
    }
    resultTypes.set(typeName, fields);
    return fields;
  };

  const projectedMessage = visit(
    primaryType,
    message,
    getType,
    onExtraField,
  ) as Record<string, unknown>;

  const outputTypes: TypesRecord = {};
  for (const [typeName, fields] of resultTypes) {
    outputTypes[typeName] = Object.entries(fields)
      .filter(([, field]) => field.required)
      .map(([name, field]) => ({ name, type: field.type }));
  }
  if ('EIP712Domain' in types) outputTypes.EIP712Domain = types.EIP712Domain;

  return { message: projectedMessage, types: outputTypes };
};
