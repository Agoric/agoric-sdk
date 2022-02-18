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

/**
 * See https://github.com/Agoric/agoric-sdk/pull/4469#issuecomment-1030770373
 * TODO Move that text into an .md file
 *
 * @param {bigint} n
 * @returns {string}
 */
const encodeBigInt = n => {
  const nn = n < 0n ? -n : n;
  const nDigits = nn.toString().length;
  const lDigits = nDigits.toString().length;
  if (n < 0n) {
    return `n${
      // A zero for each digit beyond the first
      // in the decimal *count* of decimal digits.
      '0'.repeat(lDigits - 1)
    }${
      // The count of digits, offset to be a
      // number of lDigits digits
      // that never starts with zero.
      // * lDigits=1: nDigits 1-9 => 9-1
      // * lDigits=2: nDigits 10-99 => 99-10
      // * lDigits=3: nDigits 100-999 => 999-100
      // * lDigits=4: nDigits 1000-9999 => 9999-1000
      // * ...
      10 ** lDigits + 10 ** (lDigits - 1) - 1 - nDigits
    }${
      // The digits in a complementary representation
      // for reverse sorting.
      (10n ** BigInt(nDigits) - 1n + n).toString().padStart(nDigits, '0')
      /* or e.g. 10n**nDigits + 10n**(nDigits-1n) - 1n + n */
    }`;
  } else if (n === 0n) {
    return `o`;
  } else {
    return `p${
      // A nine for each digit beyond the first
      // in the decimal *count* of decimal digits.
      '9'.repeat(lDigits - 1)
    }${
      // The count of digits,
      // offset to never start with a nine
      // and padded to lDigits digits.
      // * lDigits=1: nDigits 1-9 => 0-8
      // * lDigits=2: nDigits 10-99 => 00-89
      // * lDigits=3: nDigits 100-999 => 000-899
      // * lDigits=4: nDigits 1000-9999 => 0000-8999
      // * ...
      (nDigits - 10 ** (lDigits - 1)).toString().padStart(lDigits, '0')
    }${
      // The digits.
      n
    }`;
  }
};

// TODO Replace with the NonNullish that is coming. What PR?
const NonNullish = x => {
  assert(x !== null && x !== undefined, X`Must not be nullish: ${x}`);
  return x;
};

/**
 * See https://github.com/Agoric/agoric-sdk/pull/4469#issuecomment-1030770373
 * TODO Move that text into an .md file
 *
 * @param {string} k
 * @returns {bigint}
 */
const decodeBigInt = k => {
  const ch = k[0];
  let rem = k.slice(1);
  switch (ch) {
    case 'o': {
      if (rem.length > 0) throw new Error(`"o" must stand alone: ${k}`);
      return 0n;
    }
    case 'n': {
      const lDigits = NonNullish(rem.match(/^0*/))[0].length + 1;
      rem = rem.slice(lDigits - 1);
      if (rem.length < lDigits) throw new Error(`incomplete digit count: ${k}`);
      const snDigits = rem.slice(0, lDigits);
      rem = rem.slice(lDigits);
      if (!/^[0-9]*$/.test(snDigits)) throw new Error(`invalid nDigits: ${k}`);
      const cnDigits = parseInt(snDigits, 10);
      const nDigits = 10 ** lDigits + 10 ** (lDigits - 1) - 1 - cnDigits;
      if (rem.length !== nDigits) throw new Error(`digit count mismatch: ${k}`);
      const cn = BigInt(rem);
      const n = cn - 10n ** BigInt(nDigits) + 1n;
      return n;
    }
    case 'p': {
      const lDigits = NonNullish(rem.match(/^9*/))[0].length + 1;
      rem = rem.slice(lDigits - 1);
      if (rem.length < lDigits) throw new Error(`incomplete digit count: ${k}`);
      const snDigits = rem.slice(0, lDigits);
      rem = rem.slice(lDigits);
      if (!/^[0-9]*$/.test(snDigits)) throw new Error(`invalid nDigits: ${k}`);
      const nDigits = parseInt(snDigits, 10) + 10 ** (lDigits - 1);
      if (rem.length !== nDigits) throw new Error(`digit count mismatch: ${k}`);
      return BigInt(rem);
    }
    default:
      throw new Error(`invalid first character: ${k}`);
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
