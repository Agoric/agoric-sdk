/**
 * @file Normalizes *and validates* EIP-712 typed data (`{message, types,
 * primaryType}`) in a single pass:
 * - `optional` struct fields (see {@link TypedDataParameter}) are resolved
 *   per-message: dropped from `types` if never present on any instance of
 *   the struct, otherwise kept with the `optional` marker stripped (treated
 *   as required from then on).
 * - struct types not referenced from `primaryType` through kept fields
 *   (e.g. only through a dropped `optional` field) are absent from
 *   `types`. Referenced ones are kept even when no value reaches them (e.g.
 *   the element type of an empty array), since EIP-712 hashing encodes
 *   their definitions regardless. `EIP712Domain` is always preserved if
 *   present, since domain values live outside `message`.
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
 * `onNonCanonicalValue` controls how a valid primitive leaf value that
 * isn't in its canonical form is handled. Only integers (given as a
 * `number`, `bigint`, or decimal/hex string -- see `normalizeEIP712Primitive`)
 * have a distinct canonical form: a `number` for an explicit width of at
 * most 48 bits (e.g. `uint32`), else a `bigint` (e.g. `uint64`,
 * `uint256`), matching abitype's TS types.
 * - 'normalize' (default, except with `onExtraField: 'keep'`): replace it
 *   with its canonical form. Since `onExtraField: 'keep'` never modifies
 *   `message`, combining it with an explicit `onNonCanonicalValue:
 *   'normalize'` is an error (the call throws).
 * - 'keep' (default with `onExtraField: 'keep'`): leave it as is.
 * - 'throw': reject it -- e.g. to check that an already-normalized message
 *   also has the expected JS types for a different (trusted) set of
 *   `types`, which a field declared with another type would not.
 *
 * Regardless of `onExtraField`, the result is also *validated*, with the
 * goal that if validation succeeds, hashing the result is guaranteed to
 * succeed and to hash exactly the values given:
 * - every declared field must be present. Fixed-length arrays must have at
 *   least their declared number of elements (too few is missing data, not
 *   excess, so no mode tolerates it; too many is excess, tolerated only by
 *   `'keep'`).
 * - a struct type reached from `primaryType` must not declare the same
 *   field more than once (hashing would encode every declaration).
 * - a struct/array field must get an array/object value, and a plain
 *   Solidity type (`address`, `bool`, `string`, `uint*`/`int*`, `bytes*`)
 *   must get a value of the specific JS type that implies -- see
 *   `normalizeEIP712Primitive`.
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
  /**
   * How to handle a valid value not in its canonical form (an integer that
   * isn't a `number` if at most 48 bits wide, else a `bigint`). Default
   * 'normalize', except with `onExtraField: 'keep'`, where it defaults to
   * 'keep' instead: 'keep' mode never modifies `message`, so explicitly
   * passing 'normalize' with it is an error (the call throws).
   */
  onNonCanonicalValue?: 'normalize' | 'keep' | 'throw';
};

export type NormalizeAndValidateEIP712DataResult = {
  message: Record<string, unknown>;
  types: TypesRecord;
};

const ARRAY_SUFFIX = /\[(\d*)\]$/u;
const ARRAY_SUFFIXES = /(?:\[\d*\])+$/u;

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

// Same shape as `isEvmAddressShape` in `../address.js`, duplicated rather
// than imported: this module must have no runtime imports (see the module
// doc comment; `eip712-normalize.xs.test.js` also evaluates its source
// directly), and `address.js` has runtime dependencies of its own.
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/u;
// Solidity `(u)int<M>`: (un)signed integer of `M` bits, `0 < M <= 256`,
// `M % 8 === 0`. Unlike viem's `integerRegex` (utils/regex.ts), the width
// is required: EIP-712 has no bare `uint`/`int` aliases, and viem and
// ethers.js hash them differently (ethers.js encodes the type as
// `uint256`/`int256`, viem keeps the alias in the type string).
const INTEGER_TYPE_REGEX =
  /^(u?int)(8|16|24|32|40|48|56|64|72|80|88|96|104|112|120|128|136|144|152|160|168|176|184|192|200|208|216|224|232|240|248|256)$/u;
// Solidity `bytes<M>`: binary type of `M` bytes, `0 < M <= 32`; bare `bytes`
// (no explicit size) is dynamic-length, so has nothing to check here.
const BYTES_TYPE_REGEX = /^bytes([1-9]|1[0-9]|2[0-9]|3[0-2])?$/u;
const HEX_REGEX = /^0x[0-9a-fA-F]*$/u;
// String-encoded integers: unsigned hex, or decimal with an optional sign.
// The subset of what both viem and ethers.js accept *and* hash identically
// to the equivalent `bigint` (both ultimately defer to JS `BigInt(string)`,
// but e.g. viem rejects negative hex that ethers accepts, and both accept
// whitespace, `0b`/`0o` prefixes, etc. that we don't need to). Decimal
// excludes leading zeros, which `BigInt` ignores but a reader could take
// for a legacy octal literal (e.g. `041` as 33 rather than 41), and `-0`,
// which has no distinct meaning (`0` and `+0` are fine). Hex may have
// leading zeros, as fixed-width hex commonly does.
const INTEGER_STRING_REGEX = /^(?:\+?0|[-+]?[1-9][0-9]*|0x[0-9a-fA-F]+)$/u;
// Bounds the work `BigInt` parsing of an untrusted string can do. Generous
// for any in-range 256-bit value (at most 78 decimal or 64 hex digits),
// leaving room for some leading zeros in hex.
const MAX_INTEGER_STRING_LENGTH = 100;
// abitype types `(u)int<M>` values as `number` for `M <= 48`, else `bigint`.
const MAX_NUMBER_INTEGER_BITS = 48;

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
 * Parses an integer given in one of the JS representations accepted for an
 * EIP-712 `(u)int<M>` value: a `bigint`, a safe integer `number`, or a
 * string of unsigned hex (`0x...`) or optionally signed decimal digits (see
 * `INTEGER_STRING_REGEX`). Returns `undefined` for anything else, including
 * non-integer and unsafe-integer numbers (which have likely already lost
 * precision; ethers.js rejects them too). Does not check the value's range
 * for any particular type: see {@link normalizeEIP712Primitive} for that.
 *
 * @param value
 */
export const parseEIP712Integer = (value: unknown): bigint | undefined => {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? BigInt(value) : undefined;
  }
  if (
    typeof value !== 'string' ||
    value.length > MAX_INTEGER_STRING_LENGTH ||
    !INTEGER_STRING_REGEX.test(value)
  ) {
    return undefined;
  }
  // `BigInt` itself accepts a sign on decimal (not hex) strings.
  return BigInt(value);
};

/**
 * Whether `type` is a primitive EIP-712 type, i.e. one whose values
 * {@link normalizeEIP712Primitive} accepts (not, e.g., a bare `uint`).
 *
 * @param type
 */
const isPrimitiveType = (type: string): boolean =>
  type === 'address' ||
  type === 'bool' ||
  type === 'string' ||
  INTEGER_TYPE_REGEX.test(type) ||
  BYTES_TYPE_REGEX.test(type);

/**
 * Validates a value of a primitive (non-struct, non-array) EIP-712 type,
 * returning its canonical form (only integers have a distinct one: a
 * `number` for an explicit width of at most 48 bits, else a `bigint`,
 * matching abitype's TS types), or throws if it isn't valid. A struct or
 * array type is rejected as unrecognized (`visit` only calls this once it's
 * confirmed `fieldType` is neither).
 * Requires the specific JS type real hashing needs for each Solidity type,
 * not just something that happens to coerce -- e.g. a number given for a
 * `string` field would otherwise hash as the number's own hex encoding,
 * not the string form, a footgun real EIP-712 tooling doesn't catch either.
 *
 * - `address`: string, 20-byte-hex shape (not full EIP-55 checksum -- see
 *   the module doc comment for why).
 * - `bool`: JS `boolean`.
 * - `string`: JS `string`.
 * - `bytes` (dynamic): even-length hex string *or* `Uint8Array` -- hashed
 *   identically either way.
 * - `bytes<M>` (fixed): even-length hex string only, of exactly `M` bytes
 *   -- a `Uint8Array` does not hash successfully here (see the module doc
 *   comment). Odd-length hex is rejected for both: ethers.js rejects it,
 *   and viem pads the missing nibble on the left for `bytes` but on the
 *   right for `bytes<M>`.
 * - `uint<M>`/`int<M>` (not bare `uint`/`int`, see `INTEGER_TYPE_REGEX`):
 *   any value {@link parseEIP712Integer} accepts, in range for the bit
 *   width/signedness.
 * - anything else: not a real Solidity primitive type, so rejected
 *   unconditionally.
 *
 * @param fieldType
 * @param value
 */
export const normalizeEIP712Primitive = (
  fieldType: string,
  value: unknown,
): unknown => {
  const quotedType = quoteName(fieldType);

  if (fieldType === 'address') {
    if (typeof value !== 'string' || !ADDRESS_REGEX.test(value)) {
      throw new Error(`Invalid EIP-712 address value: ${describeValue(value)}`);
    }
    return value;
  }

  if (fieldType === 'bool') {
    if (typeof value !== 'boolean') {
      throw new Error(
        `Expected a boolean for EIP-712 type "bool", got ${describeValue(value)}`,
      );
    }
    return value;
  }

  if (fieldType === 'string') {
    if (typeof value !== 'string') {
      throw new Error(
        `Expected a string for EIP-712 type "string", got ${describeValue(value)}`,
      );
    }
    return value;
  }

  const integerMatch = fieldType.match(INTEGER_TYPE_REGEX);
  if (integerMatch) {
    const bigValue = parseEIP712Integer(value);
    if (bigValue === undefined) {
      throw new Error(
        `Expected an integer (bigint, safe integer number, or decimal/hex string) for EIP-712 type ${quotedType}, got ${describeValue(value)}`,
      );
    }
    const signed = integerMatch[1] === 'int';
    const bits = Number(integerMatch[2]);
    const max = signed ? 2n ** BigInt(bits - 1) - 1n : 2n ** BigInt(bits) - 1n;
    const min = signed ? -max - 1n : 0n;
    if (bigValue < min || bigValue > max) {
      throw new Error(
        `Value ${describeValue(value)} is out of range for EIP-712 type ${quotedType} (expected ${min} to ${max})`,
      );
    }
    // Match abitype's (and so viem's) TS types: an explicit width of at most
    // 48 bits is a `number` (always exact, being under 2^53), else `bigint`.
    return bits <= MAX_NUMBER_INTEGER_BITS ? Number(bigValue) : bigValue;
  }

  const bytesMatch = fieldType.match(BYTES_TYPE_REGEX);
  if (bytesMatch) {
    // Dynamic `bytes` is hashed directly via `keccak256`, which accepts a
    // `Uint8Array` interchangeably with a hex string. Fixed `bytes<M>` goes
    // through the generic Solidity ABI path instead, which requires a hex
    // string and throws an unrelated error for a `Uint8Array`.
    if (!bytesMatch[1] && value instanceof Uint8Array) return value;
    if (typeof value !== 'string' || !HEX_REGEX.test(value)) {
      throw new Error(
        `Expected a hex string for EIP-712 type ${quotedType}, got ${describeValue(value)}`,
      );
    }
    if (value.length % 2 !== 0) {
      throw new Error(
        `Expected an even number of hex digits for EIP-712 type ${quotedType}, got ${describeValue(value)}`,
      );
    }
    if (bytesMatch[1]) {
      const expectedSize = Number(bytesMatch[1]);
      const actualSize = (value.length - 2) / 2;
      if (actualSize !== expectedSize) {
        throw new Error(
          `Expected EIP-712 type ${quotedType} to be ${expectedSize} bytes, got ${actualSize}: ${describeValue(value)}`,
        );
      }
    }
    return value;
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
 * One function covers both, an array of arrays (e.g. `uint256[2][]`)
 * included: each element is visited against the element type, itself an
 * array type (e.g. `uint256[2]`). `getType` hands out the *same* {@link TypeFields}
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
 * touches `message` (so `onNonCanonicalValue` is never 'normalize').
 */
const visit = (
  fieldType: string,
  value: any,
  getType: GetType,
  onExtraField: 'drop' | 'throw' | 'keep',
  onNonCanonicalValue: 'normalize' | 'keep' | 'throw',
): unknown => {
  const keep = onExtraField === 'keep';
  const { base, length: requiredLength, isArray } = splitArrayType(fieldType);
  // Registers `base` in the output types even if no element ends up visited.
  const baseType = getType(base);

  if (!isArray && !baseType) {
    // Not a declared struct or array, so it must be a recognized Solidity
    // primitive with a matching JS value; also catches an unknown type.
    const canonical = normalizeEIP712Primitive(fieldType, value);
    if (canonical === value || onNonCanonicalValue === 'keep') return value;
    if (onNonCanonicalValue === 'throw') {
      throw new Error(
        `Expected a ${typeof canonical} for EIP-712 type ${quoteName(fieldType)}, got ${describeValue(value)}`,
      );
    }
    return canonical;
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
      onNonCanonicalValue,
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
  const onNonCanonicalValue =
    options.onNonCanonicalValue ??
    (onExtraField === 'keep' ? 'keep' : 'normalize');
  if (onNonCanonicalValue === 'normalize' && onExtraField === 'keep') {
    throw new Error(
      `EIP-712 normalization option onNonCanonicalValue: 'normalize' is incompatible with onExtraField: 'keep', which never modifies the message`,
    );
  }

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
      // EIP-712 hashing encodes every declaration, while `fields` (and so
      // the output types) could only hold one, describing a different type
      // hash than the input.
      if (field.name in fields) {
        throw new Error(
          `Duplicate field ${quoteName(field.name)} in EIP-712 type ${quoteName(typeName)}`,
        );
      }
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
    onNonCanonicalValue,
  ) as Record<string, unknown>;

  // Output only the fields still required (resolved `optional` ones are
  // dropped). The walk only reaches what the values lead to: e.g. nothing
  // in an empty array. But EIP-712 hashing encodes every struct type a kept
  // field references (transitively) whatever the values, so register those
  // too (iterating a `Map` also visits the entries added while iterating),
  // and check that every other referenced type is a recognized primitive
  // (e.g. not a bare `uint`).
  const outputTypes: TypesRecord = {};
  for (const [typeName, fields] of resultTypes) {
    const outputFields: TypedDataParameter[] = [];
    for (const fieldName of Object.keys(fields)) {
      const { state, type } = fields[fieldName];
      if (state !== 'required') continue;
      const elementType = type.replace(ARRAY_SUFFIXES, '');
      if (!getType(elementType) && !isPrimitiveType(elementType)) {
        throw new Error(`Unrecognized EIP-712 type ${quoteName(elementType)}`);
      }
      outputFields.push({ name: fieldName, type });
    }
    outputTypes[typeName] = outputFields;
  }
  if ('EIP712Domain' in types) outputTypes.EIP712Domain = types.EIP712Domain;

  return { message: projectedMessage, types: outputTypes };
};
