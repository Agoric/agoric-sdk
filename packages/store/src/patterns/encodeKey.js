/* global BigUint64Array */
// @ts-check
import { assert, details as X, q } from '@agoric/assert';
import {
  passStyleOf,
  nameForPassableSymbol,
  passableSymbolForName,
  assertRecord,
  getTag,
  makeTagged,
} from '@endo/marshal';
import { recordParts } from './rankOrder.js';

const { is, fromEntries } = Object;

export const zeroPad = (n, size) => {
  const nStr = `${n}`;
  assert(nStr.length <= size);
  const str = `00000000000000000000${nStr}`;
  const result = str.substring(str.length - size);
  assert(result.length === size);
  return result;
};
harden(zeroPad);

// This is the JavaScript analog to a C union: a way to map between a float as a
// number and the bits that represent the float as a buffer full of bytes.  Note
// that the mutation of static state here makes this invalid Jessie code, but
// doing it this way saves the nugatory and gratuitous allocations that would
// happen every time you do a conversion -- and in practical terms it's safe
// because we put the value in one side and then immediately take it out the
// other; there is no actual state retained in the classic sense and thus no
// re-entrancy issue.
const asNumber = new Float64Array(1);
const asBits = new BigUint64Array(asNumber.buffer);

// JavaScript numbers are encode as keys by outputting the base-16
// representation of the binary value of the underlying IEEE floating point
// representation.  For negative values, all bits of this representation are
// complemented prior to the base-16 conversion, while for positive values, the
// sign bit is complemented.  This ensures both that negative values sort before
// positive values and that negative values sort according to their negative
// magnitude rather than their positive magnitude.  This results in an ASCII
// encoding whose lexicographic sort order is the same as the numeric sort order
// of the corresponding numbers.

// TODO Choose the same canonical NaN encoding that cosmWasm and ewasm chose.
const CanonicalNaN = 'ffff8000000000000';

// Normalize -0 to 0

/**
 * @param {number} n
 */
const numberToDBEntryKey = n => {
  if (is(n, -0)) {
    n = 0;
  } else if (is(n, NaN)) {
    return CanonicalNaN;
  }
  asNumber[0] = n;
  let bits = asBits[0];
  if (n < 0) {
    // XXX Why is the no-bitwise lint rule even a thing??
    // eslint-disable-next-line no-bitwise
    bits ^= 0xffffffffffffffffn;
  } else {
    // eslint-disable-next-line no-bitwise
    bits ^= 0x8000000000000000n;
  }
  return `f${zeroPad(bits.toString(16), 16)}`;
};

/**
 * @param {string} k
 */
const dbEntryKeyToNumber = k => {
  let bits = BigInt(`0x${k.substring(1)}`);
  if (k[1] < '8') {
    // eslint-disable-next-line no-bitwise
    bits ^= 0xffffffffffffffffn;
  } else {
    // eslint-disable-next-line no-bitwise
    bits ^= 0x8000000000000000n;
  }
  asBits[0] = bits;
  const result = asNumber[0];
  if (is(result, -0)) {
    return 0;
  }
  return result;
};

// BigInts are encoded as keys as follows:
//   `${prefix}${length}:${encodedNumber}`
// Where:
//
//   ${prefix} is either 'n' or 'p' according to whether the BigInt is negative
//      or positive ('n' is less than 'p', so negative BigInts will sort below
//      positive ones)
//
//   ${encodedNumber} is the value of the BigInt itself, encoded as a decimal
//      number.  Positive BigInts use their normal decimal representation (i.e.,
//      what is returned when you call `toString()` on a BigInt).  Negative
//      BigInts are encoded as the unpadded 10s complement of their value; in
//      this encoding, all negative values that have same number of digits will
//      sort lexically in the inverse order of their numeric value (which is to
//      say, most negative to least negative).
//
//   ${length} is the decimal representation of the width (i.e., the count of
//      digits) of the BigInt.  This length value is then zero padded to a fixed
//      number (currently 10) of digits.  Note that the fixed width length field
//      means that we cannot encode BigInts whose values have more than 10**10
//      digits, but we are willing to live with this limitation since we could
//      never store such large numbers anyway.  The length field is used in lieu
//      of zero padding the BigInts themselves for sorting, which would be
//      impractical for the same reason that storing large values directly would
//      be.  The length is zero padded so that numbers are sorted within groups
//      according to their decimal orders of magnitude in size and then these
//      groups are sorted smallest to largest.
//
// This encoding allows all BigInts to be represented as ASCII strings that sort
// lexicographically in the same order as the values of the BigInts themselves
// would sort numerically.

export const BIGINT_TAG_LEN = 10;
const BIGINT_LEN_MODULUS = 10 ** BIGINT_TAG_LEN;

const bigintToDBEntryKey = n => {
  if (n < 0n) {
    const raw = (-n).toString();
    const modulus = 10n ** BigInt(raw.length);
    const numstr = (modulus + n).toString(); // + because n is negative
    const lenTag = zeroPad(BIGINT_LEN_MODULUS - raw.length, BIGINT_TAG_LEN);
    return `n${lenTag}:${zeroPad(numstr, raw.length)}`;
  } else {
    const numstr = n.toString();
    return `p${zeroPad(numstr.length, BIGINT_TAG_LEN)}:${numstr}`;
  }
};

const dbEntryKeyToBigint = k => {
  const numstr = k.substring(BIGINT_TAG_LEN + 2);
  const n = BigInt(numstr);
  if (k[0] === 'n') {
    const modulus = 10n ** BigInt(numstr.length);
    return -(modulus - n);
  } else {
    return n;
  }
};

// `'\u0000'` is the terminator after elements.
// `'\u0001'` is the backslash-like escape character, for
// escaping both of these characters.

const encodeArray = (array, encodeKey) => {
  const chars = ['['];
  for (const element of array) {
    const enc = encodeKey(element);
    for (const c of enc) {
      if (c === '\u0000' || c === '\u0001') {
        chars.push('\u0001');
      }
      chars.push(c);
    }
    chars.push('\u0000');
  }
  return chars.join('');
};

const decodeArray = (encodedKey, decodeKey) => {
  assert(encodedKey.startsWith('['), X`Encoded array expected: ${encodedKey}`);
  const elements = [];
  const elemChars = [];
  for (let i = 1; i < encodedKey.length; i += 1) {
    const c = encodedKey[i];
    if (c === '\u0000') {
      const encodedElement = elemChars.join('');
      elemChars.length = 0;
      const element = decodeKey(encodedElement);
      elements.push(element);
    } else if (c === '\u0001') {
      i += 1;
      assert(
        i < encodedKey.length,
        X`unexpected end of encoding ${encodedKey}`,
      );
      const c2 = encodedKey[i];
      assert(
        c2 === '\u0000' || c2 === '\u0001',
        X`Unexpected character after u0001 escape: ${c2}`,
      );
      elemChars.push(c2);
    } else {
      elemChars.push(c);
    }
  }
  assert(elemChars.length === 0, X`encoding terminated early: ${encodedKey}`);
  return harden(elements);
};

const encodeRecord = (record, encodeKey) => {
  const [names, values] = recordParts(record);
  return `(${encodeArray(harden([names, values]), encodeKey)}`;
};

const decodeRecord = (encodedKey, decodeKey) => {
  assert(encodedKey.startsWith('('));
  const keysvals = decodeArray(encodedKey.substring(1), decodeKey);
  assert(keysvals.length === 2, X`expected keys,values pair: ${encodedKey}`);
  const [keys, vals] = keysvals;
  assert(
    passStyleOf(keys) === 'copyArray' &&
      passStyleOf(vals) === 'copyArray' &&
      keys.length === vals.length &&
      keys.every(key => typeof key === 'string'),
    X`not a valid record encoding: ${encodedKey}`,
  );
  const entries = keys.map((key, i) => [key, vals[i]]);
  const record = harden(fromEntries(entries));
  assertRecord(record, 'decoded record');
  return record;
};

const encodeTagged = (tagged, encodeKey) =>
  `:${encodeArray(harden([getTag(tagged), tagged.payload]), encodeKey)}`;

const decodeTagged = (encodedKey, decodeKey) => {
  assert(encodedKey.startsWith(':'));
  const tagpayload = decodeArray(encodedKey.substring(1), decodeKey);
  assert(tagpayload.length === 2, X`expected tag,payload pair: ${encodedKey}`);
  const [tag, payload] = tagpayload;
  assert(
    passStyleOf(tag) === 'string',
    X`not a valid tagged encoding: ${encodedKey}`,
  );
  return makeTagged(tag, payload);
};

/**
 * Exported for unit testing
 *
 * @param {(remotable: Object) => string} encodeRemotable
 * @returns {(key: Key) => string}
 */
export const makeEncodeKey = encodeRemotable => {
  const encodeKey = key => {
    const passStyle = passStyleOf(key);
    switch (passStyle) {
      case 'null': {
        return 'v';
      }
      case 'undefined': {
        return 'z';
      }
      case 'number': {
        return numberToDBEntryKey(key);
      }
      case 'string': {
        return `s${key}`;
      }
      case 'boolean': {
        return `b${key}`;
      }
      case 'bigint': {
        return bigintToDBEntryKey(key);
      }
      case 'remotable': {
        const result = encodeRemotable(key);
        assert(
          result.startsWith('r'),
          X`internal: Remotable encoding must start with "r": ${result}`,
        );
        return result;
      }
      case 'symbol': {
        return `y${nameForPassableSymbol(key)}`;
      }
      case 'copyArray': {
        return encodeArray(key, encodeKey);
      }
      case 'copyRecord': {
        return encodeRecord(key, encodeKey);
      }
      case 'tagged': {
        return encodeTagged(key, encodeKey);
      }
      default: {
        assert.fail(X`a ${q(passStyle)} cannot be used as a collection key`);
      }
    }
  };
  return harden(encodeKey);
};
harden(makeEncodeKey);

export const makeDecodeKey = decodeRemotable => {
  const decodeKey = encodedKey => {
    switch (encodedKey[0]) {
      case 'v': {
        return null;
      }
      case 'z': {
        return undefined;
      }
      case 'f': {
        return dbEntryKeyToNumber(encodedKey);
      }
      case 's': {
        return encodedKey.substring(1);
      }
      case 'b': {
        return encodedKey.substring(1) !== 'false';
      }
      case 'n':
      case 'p': {
        return dbEntryKeyToBigint(encodedKey);
      }
      case 'r': {
        return decodeRemotable(encodedKey);
      }
      case 'y': {
        return passableSymbolForName(encodedKey.substring(1));
      }
      case '[': {
        return decodeArray(encodedKey, decodeKey);
      }
      case '(': {
        return decodeRecord(encodedKey, decodeKey);
      }
      case ':': {
        return decodeTagged(encodedKey, decodeKey);
      }
      default: {
        assert.fail(X`invalid database key: ${encodedKey}`);
      }
    }
  };
  return harden(decodeKey);
};
harden(makeDecodeKey);
