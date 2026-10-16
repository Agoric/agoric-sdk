/**
 * @file Helpers for quoting or describing values in e.g. error messages
 * and test descriptions.
 */

const MAX_DESCRIBED_LENGTH = 100;
const MAX_DESCRIBED_ITEMS = 10;

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
export const quoteName = (str: string): string => JSON.stringify(truncate(str));

/**
 * Quotes and escapes each name in `names` (see `quoteName`) and joins them
 * for an error message -- bounding not just each individual name's length
 * but also, since attacker-controlled data can make the *list itself*
 * arbitrarily long (e.g. very many extra fields on a struct), the number of
 * items included. Cuts off whole items rather than slicing the joined
 * string's raw characters, so the result can never end mid-quote the way
 * `truncate`-ing an already-joined-and-quoted string could.
 */
export const quoteNameList = (names: readonly string[]): string => {
  const shown = names.slice(0, MAX_DESCRIBED_ITEMS).map(quoteName).join(', ');
  const omitted = names.length - MAX_DESCRIBED_ITEMS;
  return omitted > 0 ? `${shown}, and ${omitted} more` : shown;
};

/**
 * A short, bounded description of a value for error messages. Only
 * `string`/`number`/`bigint` can be arbitrarily long themselves; anything
 * else is described by shape/type rather than rendered.
 */
export const describeValue = (value: unknown): string => {
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
