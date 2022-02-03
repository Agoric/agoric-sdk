// FIXME remove before review
// @ts-nocheck
// @jessie-nocheck

// XXX declaration shouldn't be necessary. Add exception to eslint or make a real import.
/* global BigUint64Array */

const asNumber = new Float64Array(1);
const asBits = new BigUint64Array(asNumber.buffer);

/**
 *
 * @param {number} n
 * @param {number} size
 * @returns {string}
 */
const zeroPad = (n, size) => {
  const nStr = `${n}`;
  assert(nStr.length <= size);
  const str = `00000000000000000000${nStr}`;
  const result = str.substring(str.length - size);
  assert(result.length === size);
  return result;
};

const numberToDBEntryKey = n => {
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

harden(numberToDBEntryKey);

export { numberToDBEntryKey };
