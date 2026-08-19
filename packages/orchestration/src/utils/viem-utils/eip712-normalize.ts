/**
 * @file Normalizes *and validates* EIP-712 typed data (`{message, types,
 * primaryType}`) in a single pass:
 * - `optional` struct fields (see {@link TypedDataParameter}) are resolved
 *   per-message: dropped from `types` if never present on any instance of
 *   the struct, otherwise kept with the `optional` marker stripped (treated
 *   as required from then on).
 * - struct types never actually encountered while walking `message` from
 *   `primaryType` are absent from `types`. `EIP712Domain` is always
 *   preserved if present, since domain values live outside `message`.
 *
 * `onExtraField` controls how *excess* data (fields not declared in
 * `types`, array elements beyond a fixed length) is handled:
 * - 'drop' (default): silently remove it from `message`.
 * - 'throw': reject it — use when `types` is the trusted/expected shape
 *   and `message` is untrusted, to catch data smuggled in outside what's
 *   declared.
 * - 'keep': leave `message` untouched (no projection, no removal of excess
 *   data). Dynamic-length arrays are never truncated in any mode, since
 *   every element affects the EIP-712 hash.
 *
 * Regardless of `onExtraField`, the result is also *validated*, with the
 * goal that if validation succeeds, hashing the result is guaranteed to
 * succeed and to hash exactly the values given:
 * - every declared field must be present. Fixed-length arrays must have at
 *   least their declared number of elements (too few is missing data, not
 *   excess, so no mode tolerates it; too many is excess, tolerated only by
 *   `'keep'`).
 * - a struct/array field must get an array/object value, and a plain
 *   Solidity type (`address`, `bool`, `string`, `uint*`/`int*`, `bytes*`)
 *   must get a value of the specific JS type that implies -- see
 *   `assertValidPrimitive`.
 * - primitive leaf values are checked against their type's shape/range,
 *   recursing correctly through arrays, which real EIP-712 tooling (e.g.
 *   viem's `validateTypedData`) does not.
 *
 * No runtime dependency on `viem`/`abitype`, so this can run on-chain. Two
 * known exceptions to the validate-implies-hash invariant, both left
 * unclosed since closing them needs a hashing dependency:
 * - `address` values are only checked for 20-byte-hex shape, not EIP-55
 *   checksum. Real hashing lowercases addresses before encoding (so casing
 *   never affects the hash), but still separately rejects a mixed-case
 *   value whose checksum doesn't match, as a typo safety net.
 * - a `Uint8Array` given for a fixed `bytes<M>` field is rejected rather
 *   than converted to the equivalent hex string.
 */
import type { TypedDataParameter } from '../abitype.ts';

type TypesRecord = Record<string, readonly TypedDataParameter[]>;

export type NormalizeAndValidateEIP712DataInput = {
  message: Record<string, unknown>;
  types: TypesRecord;
  primaryType: string;
};

export type NormalizeAndValidateEIP712DataOptions = {
  /** default 'drop' */
  onExtraField?: 'drop' | 'throw' | 'keep';
};

export type NormalizeAndValidateEIP712DataResult = {
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

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/u;
// Solidity `(u)int<M>`: (un)signed integer of `M` bits, `0 < M <= 256`,
// `M % 8 === 0`; bare `uint`/`int` (no explicit width) means 256 bits.
// Mirrors viem's `integerRegex` (utils/regex.ts) -- duplicated rather than
// imported so this module has no runtime dependency on `viem`.
const INTEGER_TYPE_REGEX =
  /^(u?int)(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)?$/u;
// Solidity `bytes<M>`: binary type of `M` bytes, `0 < M <= 32`; bare `bytes`
// (no explicit size) is dynamic-length, so has nothing to check here.
const BYTES_TYPE_REGEX = /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/u;
const HEX_REGEX = /^0x[0-9a-fA-F]*$/u;

const MAX_DESCRIBED_LENGTH = 100;

/**
 * Slices `str` to at most `MAX_DESCRIBED_LENGTH` characters, appending
 * `...` if it was cut. Bounds length only -- doesn't escape or annotate;
 * `truncate` and `describeValue`'s string case each build on this
 * differently (an appended `(N chars total)` annotation, or JSON escaping,
 * respectively), so the raw slicing lives in one place.
 */
const truncateRaw = (str: string): string =>
  str.length > MAX_DESCRIBED_LENGTH
    ? `${str.slice(0, MAX_DESCRIBED_LENGTH)}...`
    : str;

/**
 * Bounds a string embedded in an error message -- `message` (and, in
 * 'throw' mode, `types`) can come from an untrusted source, so a field
 * name, value, or joined list of them could otherwise be arbitrarily large.
 * Bounds length only, and doesn't escape the result -- see `quoteName` for
 * a quoted-and-escaped identifier suitable for embedding directly in a
 * message (manually wrapping this in literal quotes instead is unsafe: an
 * embedded quote character in `str` would break out of them).
 */
const truncate = (str: string): string =>
  str.length > MAX_DESCRIBED_LENGTH
    ? `${truncateRaw(str)}(${str.length} chars total)`
    : str;

/**
 * Quotes and escapes an identifier (a struct/field type or field name) for
 * embedding in an error message. Escaping via `JSON.stringify` happens
 * *after* truncating and covers the whole (possibly-annotated) result, so
 * an embedded quote, backslash, or newline in the identifier can't break
 * out of the message's own quoting, and the `(N chars total)` annotation
 * can't itself get chopped off by a later truncation step (there isn't
 * one).
 */
const quoteName = (str: string): string => JSON.stringify(truncate(str));

const MAX_DESCRIBED_ITEMS = 10;

/**
 * Quotes and escapes each name in `names` (see `quoteName`) and joins them
 * for an error message -- bounding not just each individual name's length
 * but also, since attacker-controlled data can make the *list itself*
 * arbitrarily long (e.g. very many extra fields on a struct), the number of
 * items included. Cuts off whole items rather than slicing the joined
 * string's raw characters, so the result can never end mid-quote the way
 * `truncate`-ing an already-joined-and-quoted string could.
 */
const quoteNameList = (names: readonly string[]): string => {
  const shown = names.slice(0, MAX_DESCRIBED_ITEMS).map(quoteName).join(', ');
  const omitted = names.length - MAX_DESCRIBED_ITEMS;
  return omitted > 0 ? `${shown}, and ${omitted} more` : shown;
};

/**
 * A short, bounded description of a value for error messages. Only
 * `string`/`number`/`bigint` can be arbitrarily long themselves; anything
 * else is described by shape/type rather than rendered.
 */
const describeValue = (value: unknown): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') {
    if (value.length > MAX_DESCRIBED_LENGTH) {
      // The `(N chars total)` annotation goes *outside* the JSON-quoted,
      // truncated value (unlike `quoteName`), so it reads as metadata about
      // the value rather than part of it.
      return `${JSON.stringify(truncateRaw(value))}(${value.length} chars total)`;
    }
    return JSON.stringify(value);
  }
  // Truncate the digits *before* appending the `n` suffix -- appending
  // first and truncating the combined string risks slicing the `n` itself
  // off a long enough value, leaving output that no longer looks like a
  // bigint.
  if (typeof value === 'bigint') return `${truncate(`${value}`)}n`;
  if (typeof value === 'number') return truncate(String(value));
  if (value instanceof Uint8Array)
    return `a Uint8Array with ${value.length} byte(s)`;
  if (Array.isArray(value)) return `an array with ${value.length} element(s)`;
  return `a ${typeof value}`;
};

/**
 * Validates a value declared as a non-struct, non-array EIP-712 type
 * (`visit` only calls this once it's confirmed `fieldType` is neither).
 * Requires the specific JS type real hashing needs for each Solidity type,
 * not just something that happens to coerce -- e.g. a number given for a
 * `string` field would otherwise hash as the number's own hex encoding,
 * not the string form, a footgun real EIP-712 tooling doesn't catch either.
 *
 * - `address`: string, 20-byte-hex shape (not full EIP-55 checksum -- see
 *   the module doc comment for why).
 * - `bool`: JS `boolean`.
 * - `string`: JS `string`.
 * - `bytes` (dynamic): hex string *or* `Uint8Array` -- hashed identically
 *   either way.
 * - `bytes<M>` (fixed): hex string only, of exactly `M` bytes -- a
 *   `Uint8Array` does not hash successfully here (see the module doc
 *   comment).
 * - `uint<M>`/`int<M>` (bare `uint`/`int` means 256 bits): `number` or
 *   `bigint`, an integer, in range for the bit width/signedness.
 * - anything else: not a real Solidity primitive type, so rejected
 *   unconditionally.
 */
const assertValidPrimitive = (fieldType: string, value: unknown): void => {
  const quotedType = quoteName(fieldType);

  if (fieldType === 'address') {
    if (typeof value !== 'string' || !ADDRESS_REGEX.test(value)) {
      throw new Error(`Invalid EIP-712 address value: ${describeValue(value)}`);
    }
    return;
  }

  if (fieldType === 'bool') {
    if (typeof value !== 'boolean') {
      throw new Error(
        `Expected a boolean for EIP-712 type "bool", got ${describeValue(value)}`,
      );
    }
    return;
  }

  if (fieldType === 'string') {
    if (typeof value !== 'string') {
      throw new Error(
        `Expected a string for EIP-712 type "string", got ${describeValue(value)}`,
      );
    }
    return;
  }

  const integerMatch = fieldType.match(INTEGER_TYPE_REGEX);
  if (integerMatch) {
    if (typeof value !== 'number' && typeof value !== 'bigint') {
      throw new Error(
        `Expected a number or bigint for EIP-712 type ${quotedType}, got ${describeValue(value)}`,
      );
    }
    if (typeof value === 'number' && !Number.isInteger(value)) {
      throw new Error(
        `Expected an integer for EIP-712 type ${quotedType}, got ${describeValue(value)}`,
      );
    }
    const signed = integerMatch[1] === 'int';
    const bits = integerMatch[2] ? Number(integerMatch[2]) : 256;
    const bigValue = BigInt(value);
    const max = signed ? 2n ** BigInt(bits - 1) - 1n : 2n ** BigInt(bits) - 1n;
    const min = signed ? -max - 1n : 0n;
    if (bigValue < min || bigValue > max) {
      throw new Error(
        `Value ${describeValue(value)} is out of range for EIP-712 type ${quotedType} (expected ${min} to ${max})`,
      );
    }
    return;
  }

  const bytesMatch = fieldType.match(BYTES_TYPE_REGEX);
  if (bytesMatch) {
    // Dynamic `bytes` is hashed directly via `keccak256`, which accepts a
    // `Uint8Array` interchangeably with a hex string. Fixed `bytes<M>` goes
    // through the generic Solidity ABI path instead, which requires a hex
    // string and throws an unrelated error for a `Uint8Array`.
    if (!bytesMatch[1] && value instanceof Uint8Array) return;
    if (typeof value !== 'string' || !HEX_REGEX.test(value)) {
      throw new Error(
        `Expected a hex string for EIP-712 type ${quotedType}, got ${describeValue(value)}`,
      );
    }
    if (bytesMatch[1]) {
      const expectedSize = Number(bytesMatch[1]);
      const actualSize = Math.ceil((value.length - 2) / 2);
      if (actualSize !== expectedSize) {
        throw new Error(
          `Expected EIP-712 type ${quotedType} to be ${expectedSize} bytes, got ${actualSize}: ${describeValue(value)}`,
        );
      }
    }
    return;
  }

  throw new Error(`Unrecognized EIP-712 type ${quotedType}`);
};

/**
 * A field declared without `optional` starts `required`; one declared
 * `optional` starts `optional-unseen` and transitions from there as
 * instances of its struct are visited -- see `visit`.
 */
type FieldState = 'optional-unseen' | 'optional-seen' | 'required';

/**
 * A struct's fields, keyed by name, tracking each field's {@link
 * FieldState}. Also doubles as an array-typed field's per-element record,
 * keyed by index instead (as a string, per usual JS property-key coercion).
 */
type TypeFields = Record<string, { state: FieldState; type: string }>;

/** Looks up (and lazily builds) the {@link TypeFields} for a struct type name, or `undefined` for a primitive leaf. */
type GetType = (typeName: string) => TypeFields | undefined;

/**
 * Walks `value` against `fieldType` (a struct or array field type string).
 * One function covers both, since a field's declared type is never an
 * array of arrays. `getType` hands out the *same* {@link TypeFields}
 * record for every instance of a given struct type name encountered
 * anywhere in the message, which is what lets a single walk resolve
 * `optional` fields and validate required-field presence across
 * repeated/nested uses of the same type:
 *
 * - `optional-unseen` + present => `required` (this instance's presence
 *   makes the field required everywhere, including instances already
 *   visited or yet to be visited).
 * - `optional-unseen` + absent => `optional-seen`.
 * - `optional-seen` + present => conflict: an earlier instance confirmed
 *   the field absent, this one sets it. Rejected immediately.
 * - `optional-seen` + absent => stays `optional-seen`.
 * - `required` + present => stays `required`.
 * - `required` + absent => rejected immediately.
 *
 * Every mode runs these the same way, `keep` included -- missing data is
 * missing data regardless of `onExtraField`. `keep` only skips removing or
 * rejecting *excess* data (extra fields, over-length arrays) and never
 * touches `message`.
 */
const visit = (
  fieldType: string,
  value: any,
  getType: GetType,
  onExtraField: 'drop' | 'throw' | 'keep',
): unknown => {
  const keep = onExtraField === 'keep';
  const { base, length: requiredLength, isArray } = splitArrayType(fieldType);
  // Registers `base` in the output types even if no element ends up visited.
  const baseType = getType(base);

  if (!isArray && !baseType) {
    // Not a declared struct or array, so it must be a recognized Solidity
    // primitive with a matching JS value; also catches an unknown type.
    assertValidPrimitive(fieldType, value);
    return value;
  }

  // A declared struct or array needs an actual object/array value. Split
  // into two distinct messages (rather than interpolating `isArray` into
  // one) so each is independently greppable.
  if (typeof value !== 'object' || value === null) {
    if (isArray) {
      throw new Error(
        `Expected an array for EIP-712 type ${quoteName(fieldType)}, got ${describeValue(value)}`,
      );
    } else {
      throw new Error(
        `Expected an object for EIP-712 type ${quoteName(fieldType)}, got ${describeValue(value)}`,
      );
    }
  }

  let type: TypeFields;
  let result: any;
  if (isArray) {
    const actualLength = value.length;
    if (typeof actualLength !== 'number' || Number.isNaN(actualLength)) {
      throw new Error(
        `Expected an array-like value (with a numeric \`length\`) for EIP-712 type ${quoteName(fieldType)}`,
      );
    }
    if (requiredLength !== undefined) {
      // Too few is missing data: rejected in every mode, 'keep' included.
      if (actualLength < requiredLength) {
        throw new Error(
          `Array field ${quoteName(fieldType)} has ${actualLength} elements, expected at least ${requiredLength}`,
        );
      }
      // Too many is excess data: only 'throw' rejects it ('drop' truncates
      // below, 'keep' leaves it alone).
      if (onExtraField === 'throw' && actualLength > requiredLength) {
        throw new Error(
          `Array field ${quoteName(fieldType)} has ${actualLength} elements, expected at most ${requiredLength}`,
        );
      }
    }
    const length = keep
      ? actualLength
      : Math.min(actualLength, requiredLength ?? actualLength);
    result = keep ? value : new Array(length);
    // Not `Array.from({ length }, ...)`: our pinned XS mis-enumerates an
    // array built that way, reporting index "0" `length` times and never
    // "1".."length - 1" -- see `packages/xsnap/test/xs-js.test.js`. A
    // null-prototype object with plain indexed assignment avoids it.
    type = Object.create(null) as TypeFields;
    for (let index = 0; index < length; index += 1) {
      type[index] = { state: 'required', type: base };
    }
  } else {
    // Guaranteed defined (the `!isArray && !baseType` case already
    // returned above); this is just for TS's narrowing.
    if (!baseType) {
      throw new Error(`Unrecognized EIP-712 type ${quoteName(fieldType)}`);
    }
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
        `Unexpected field(s) on EIP-712 type ${quoteName(fieldType)}: ${quoteNameList(extraKeys)}`,
      );
    }
  }

  // `fieldName in obj`, not `hasOwnProperty`: matches how viem itself reads
  // field values (plain property access resolves the prototype chain).
  // `type` must be null-prototype (so there's no inherited-property risk to
  // guard against here), but this check protects against future
  // refactorings.
  if (Object.getPrototypeOf(type)) {
    throw new Error(
      `EIP-712 type ${quoteName(fieldType)} must be described by a null-prototype object`,
    );
  }
  for (const fieldName of Object.keys(type)) {
    const field = type[fieldName];
    const present = fieldName in value;

    if (present) {
      if (field.state === 'optional-seen') {
        throw new Error(
          `Field ${quoteName(fieldName)} of EIP-712 type ${quoteName(fieldType)} is present here but was missing on another instance of the same type -- it must be consistently present or consistently absent`,
        );
      }
      field.state = 'required';
    } else if (field.state === 'required') {
      throw new Error(
        `Missing required field ${quoteName(fieldName)} for EIP-712 type ${quoteName(fieldType)}`,
      );
    } else {
      field.state = 'optional-seen';
      continue;
    }

    const projectedValue = visit(
      field.type,
      value[fieldName],
      getType,
      onExtraField,
    );
    if (!keep) result[fieldName] = projectedValue;
  }
  return result;
};

export const normalizeAndValidateEIP712Data = (
  input: NormalizeAndValidateEIP712DataInput,
  options: NormalizeAndValidateEIP712DataOptions = {},
): NormalizeAndValidateEIP712DataResult => {
  const { message, types, primaryType } = input;
  const onExtraField = options.onExtraField ?? 'drop';

  if (!(primaryType in types)) {
    throw new Error(
      `Unknown EIP-712 primary type ${quoteName(primaryType)} (expected one of ${quoteNameList(Object.keys(types))})`,
    );
  }

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
      fields[field.name] = {
        state: field.optional ? 'optional-unseen' : 'required',
        type: field.type,
      };
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
      .filter(([, field]) => field.state === 'required')
      .map(([name, field]) => ({ name, type: field.type }));
  }
  if ('EIP712Domain' in types) outputTypes.EIP712Domain = types.EIP712Domain;

  return { message: projectedMessage, types: outputTypes };
};
