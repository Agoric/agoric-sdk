// @ts-check
/**
 * Module to improvise composite keys for orderedVaultStore until Collections API supports them.
 *
 */

// XXX importing these that are declared to be used only for testing
// until @agoric/store supports composite keys
import { makeDecodeKey, makeEncodeKey } from '@agoric/store';

/** @typedef {[normalizedCollateralization: number, vaultId: VaultId]} CompositeKey */

/**
 * @param {number} n
 */
const numberToDBEntryKey = makeEncodeKey(/** @type {any} */ (null));
const dbEntryKeyToNumber = makeDecodeKey(/** @type {any} */ (null));

/**
 * Overcollateralized are greater than one.
 * The more undercollaterized the smaller in [0-1].
 *
 * @param {Amount<'nat'>} normalizedDebt normalized (not actual) total debt
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
 * @param {Amount<'nat'>} normalizedDebt normalized (not actual) total debt
 * @param {Amount<'nat'>} collateral
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

harden(fromVaultKey);
harden(toVaultKey);

export { fromVaultKey, toVaultKey };
