// @ts-check
/**
 * Module to improvise composite keys for orderedVaultStore until Collections API supports them.
 *
 * TODO BEFORE MERGE: assess maximum key length limits with Collections API
 */
// XXX declaration shouldn't be necessary. Add exception to eslint or make a real import.
/* global BigUint64Array */

/** @typedef {[normalizedCollateralization: number, vaultId: VaultId]} CompositeKey */

const asNumber = new Float64Array(1);
const asBits = new BigUint64Array(asNumber.buffer);

/**
 *
 * @param {string} nStr
 * @param {number} size
 * @returns {string}
 */
const zeroPad = (nStr, size) => {
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

/**
 * Overcollateralized are greater than one.
 * The more undercollaterized the smaller in [0-1].
 *
 * @param {Amount} normalizedDebt normalized (not actual) total debt
 * @param {Amount} collateral
 * @returns {number}
 */
const collateralizationRatio = (normalizedDebt, collateral) => {
  const c = Number(collateral.value);
  const d = normalizedDebt.value
    ? Number(normalizedDebt.value)
    : Number.EPSILON;
  return c / d;
};

/**
 * Sorts by ratio in descending debt. Ordering of vault id is undefined.
 *
 * @param {Amount} normalizedDebt normalized (not actual) total debt
 * @param {Amount} collateral
 * @param {VaultId} vaultId
 * @returns {string} lexically sortable string in which highest debt-to-collateral is earliest
 */
const toVaultKey = (normalizedDebt, collateral, vaultId) => {
  assert(normalizedDebt);
  assert(collateral);
  assert(vaultId);
  // until DB supports composite keys, copy its method for turning numbers to DB entry keys
  const numberPart = numberToDBEntryKey(
    collateralizationRatio(normalizedDebt, collateral),
  );
  return `${numberPart}:${vaultId}`;
};

/**
 * @param {string} key
 * @returns {[normalizedCollateralization: number, vaultId: VaultId]}
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
