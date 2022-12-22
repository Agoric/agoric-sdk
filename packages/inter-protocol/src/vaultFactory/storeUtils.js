/**
 * Module to improvise composite keys for orderedVaultStore until Collections
 * API supports them.
 */

// XXX importing these that are declared to be used only for testing
// until @agoric/store supports composite keys
import {
  makeDecodePassable,
  makeEncodePassable,
} from '@endo/marshal/src/encodePassable.js';

/**
 * @typedef {import('@endo/marshal').PureData} PureData
 */

/**
 * @typedef {[normalizedCollateralization: number, vaultId: VaultId]} CompositeKey
 */

// `makeEncodePassable` has three named options:
// `encodeRemotable`, `encodeError`, and `encodePromise`.
// Those which are omitted default to a function that always throws.
// So by omitting all three, we know that
// the resulting function will encode only `PureData` arguments.
/**
 * @param {PureData} key
 * @returns {string}
 */
const encodeData = makeEncodePassable();

// `makeDecodePassable` has three named options:
// `decodeRemotable`, `decodeError`, and `decodePromise`.
// Those which are omitted default to a function that always throws.
// So by omitting all three, we know that
// the resulting function will decode only to `PureData` results.
/**
 * @param {string} encoded
 * @returns {PureData}
 */
const decodeData = makeDecodePassable();

/**
 * @param {number} n
 * @returns {string}
 */
export const encodeNumber = n => {
  assert.typeof(n, 'number');
  return encodeData(n);
};

/**
 * @param {string} encoded
 * @returns {number}
 */
export const decodeNumber = encoded => {
  const result = decodeData(encoded);
  assert.typeof(result, 'number');
  return result;
};

// Type annotations to support static testing of amount values
/** @typedef {Amount<'nat'> & {normalized: true}} NormalizedDebt */
/** @typedef {Amount<'nat'> & {normalized: false}} ActualDebt */

/**
 * Overcollateralized are greater than one.
 * The more undercollaterized the smaller in [0-1].
 *
 * @param {NormalizedDebt} normalizedDebt normalized (not actual) total debt
 * @param {Amount<'nat'>} collateral
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
 * @param {NormalizedDebt} normalizedDebt normalized (not actual) total debt
 * @param {Amount<'nat'>} collateral
 * @param {VaultId} vaultId
 * @returns {string} lexically sortable string in which highest
 * debt-to-collateral is earliest
 */
const toVaultKey = (normalizedDebt, collateral, vaultId) => {
  assert(normalizedDebt);
  assert(collateral);
  assert(vaultId);
  // until DB supports composite keys, copy its method for turning numbers to DB
  // entry keys
  const numberPart = encodeNumber(
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
  return [decodeNumber(numberPart), vaultIdPart];
};

harden(fromVaultKey);
harden(toVaultKey);

export { fromVaultKey, toVaultKey };
