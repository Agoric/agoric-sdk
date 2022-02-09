// FIXME remove before review
// @ts-nocheck
/**
 * Module to improvise composite keys for orderedVaultStore until Collections API supports them.
 *
 * TODO BEFORE MERGE: assess maximum key length limits with Collections API
 */
// XXX declaration shouldn't be necessary. Add exception to eslint or make a real import.
/* global BigUint64Array */

import { assertIsRatio } from '@agoric/zoe/src/contractSupport/index.js';

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

/**
 * @param {number} n
 */
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
  if (Object.is(result, -0)) {
    return 0;
  }
  return result;
};

// XXX there's got to be a helper somewhere for Ratio to float?
/**
 *
 * @param {Ratio} ratio
 * @returns {number}
 */
const ratioToNumber = ratio => {
  assertIsRatio(ratio);
  return ratio.numerator.value
    ? Number(ratio.denominator.value / ratio.numerator.value)
    : Number.POSITIVE_INFINITY;
};

/**
 * Sorts by ratio in descending debt. Ordering of vault id is undefined.
 * All debts greater than colleteral are tied for first.
 *
 * @param {Ratio} ratio normalized debt ratio (debt over collateral)
 * @param {VaultId} vaultId
 * @returns {string} lexically sortable string in which highest debt-to-collateral is earliest
 */
const toVaultKey = (ratio, vaultId) => {
  assert(ratio);
  assert(vaultId);
  // until DB supports composite keys, copy its method for turning numbers to DB entry keys
  const numberPart = numberToDBEntryKey(ratioToNumber(ratio));
  return `${numberPart}:${vaultId}`;
};

/**
 * @param {string} key
 * @returns {CompositeKey} normalized debt ratio as number, vault id
 */
const fromVaultKey = key => {
  const [numberPart, vaultIdPart] = key.split(':');
  return [dbEntryKeyToNumber(numberPart), vaultIdPart];
};

harden(dbEntryKeyToNumber);
harden(fromVaultKey);
harden(numberToDBEntryKey);
harden(toVaultKey);

export { dbEntryKeyToNumber, fromVaultKey, numberToDBEntryKey, toVaultKey };
