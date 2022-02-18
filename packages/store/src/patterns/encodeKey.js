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

// JavaScript numbers are encoded as keys by outputting the base-16
// representation of the binary value of the underlying IEEE floating point
// representation.  For negative values, all bits of this representation are
// complemented prior to the base-16 conversion, while for positive values, the
// sign bit is complemented.  This ensures both that negative values sort before
// positive values and that negative values sort according to their negative
// magnitude rather than their positive magnitude.  This results in an ASCII
// encoding whose lexicographic sort order is the same as the numeric sort order
// of the corresponding numbers.

// TODO Choose the same canonical NaN encoding that cosmWasm and ewasm chose.
const CanonicalNaNBits = 'fff8000000000000';

const encodeBinary64 = n => {
  // Normalize -0 to 0 and NaN to a canonical encoding
  if (is(n, -0)) {
    n = 0;
  } else if (is(n, NaN)) {
    return `f${CanonicalNaNBits}`;
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

const decodeBinary64 = encodedKey => {
  assert(encodedKey.startsWith('f'), X`Encoded number expected: ${encodedKey}`);
  let bits = BigInt(`0x${encodedKey.substring(1)}`);
  if (encodedKey[1] < '8') {
    // eslint-disable-next-line no-bitwise
    bits ^= 0xffffffffffffffffn;
  } else {
    // eslint-disable-next-line no-bitwise
    bits ^= 0x8000000000000000n;
  }
  asBits[0] = bits;
  const result = asNumber[0];

  // Normalize -0 to 0
  // XXX We never expect to decode -0, should this instead assert that?
  if (is(result, -0)) {
    return 0;
  }
  return result;
};

// JavaScript bigints are encoded using a variant of Elias delta coding, with an
// initial component for the length of the digit count as a unary string, a
// second component for the decimal digit count, and a third component for the
// decimal digits preceded by a gratuitous separating colon.
// To ensure that the lexicographic sort order of encoded values matches the
// numeric sort order of the corresponding numbers, the characters of the unary
// prefix are different for negative values (type "n" followed by any number of
// "#"s [which sort before decimal digits]) vs. positive and zero values (type
// "p" followed by any number of "~"s [which sort after decimal digits]) and
// each decimal digit of the encoding for a negative value is replaced with its
// nines' complement (so that negative values of the same scale sort by
// *descending* absolute value).
const encodeBigInt = n => {
  const abs = n < 0n ? -n : n;
  const nDigits = abs.toString().length;
  const lDigits = nDigits.toString().length;
  if (n < 0n) {
    return `n${
      // A "#" for each digit beyond the first
      // in the decimal *count* of decimal digits.
      '#'.repeat(lDigits - 1)
    }${
      // The nines' complement of the count of digits.
      (10 ** lDigits - 1 - nDigits).toString().padStart(lDigits, '0')
    }:${
      // The nines' complement of the digits.
      (10n ** BigInt(nDigits) - 1n + n).toString().padStart(nDigits, '0')
    }`;
  } else {
    return `p${
      // A "~" for each digit beyond the first
      // in the decimal *count* of decimal digits.
      '~'.repeat(lDigits - 1)
    }${
      // The count of digits.
      nDigits
    }:${
      // The digits.
      n
    }`;
  }
};

const decodeBigInt = encodedKey => {
  const typePrefix = encodedKey[0];
  let rem = encodedKey.slice(1);
  assert(
    typePrefix === 'p' || typePrefix === 'n',
    X`Encoded bigint expected: ${encodedKey}`,
  );

  const lDigits = rem.search(/[0-9]/) + 1;
  assert(lDigits >= 1, X`Digit count expected: ${encodedKey}`);
  rem = rem.slice(lDigits - 1);

  assert(
    rem.length >= lDigits,
    X`Complete digit count expected: ${encodedKey}`,
  );
  const snDigits = rem.slice(0, lDigits);
  rem = rem.slice(lDigits);

  assert(
    /^[0-9]+/.test(snDigits),
    X`Decimal digit count expected: ${encodedKey}`,
  );
  let nDigits = parseInt(snDigits, 10);
  if (typePrefix === 'n') {
    // TODO Assert to reject forbidden encodings like "n9:" and "n9…:…"?
    nDigits = 10 ** lDigits - 1 - nDigits;
  }

  assert(rem.startsWith(':'), X`Separator expected: ${encodedKey}`);
  rem = rem.slice(1);

  assert(
    rem.length === nDigits,
    X`Fixed-length digit sequence expected: ${encodedKey}`,
  );
  let n = BigInt(rem);
  if (typePrefix === 'n') {
    // TODO Assert to reject forbidden encodings like "n…:9…"?
    n = n - 10n ** BigInt(nDigits) + 1n;
  }

  return n;
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
        return encodeBinary64(key);
      }
      case 'string': {
        return `s${key}`;
      }
      case 'boolean': {
        return `b${key}`;
      }
      case 'bigint': {
        return encodeBigInt(key);
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
        return decodeBinary64(encodedKey);
      }
      case 's': {
        return encodedKey.substring(1);
      }
      case 'b': {
        return encodedKey.substring(1) !== 'false';
      }
      case 'n':
      case 'p': {
        return decodeBigInt(encodedKey);
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
