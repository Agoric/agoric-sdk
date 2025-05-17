// @jessie-check

/**
 * Module to improvise composite keys for orderedVaultStore until Collections
 * API supports them.
 */

/** @import {PriceAuthority, PriceDescription, PriceQuote, PriceQuoteValue, PriceQuery,} from '@agoric/zoe/tools/types.js'; */

// XXX importing these that are declared to be used only for testing
// until @agoric/store supports composite keys
import { makeDecodePassable, makeEncodePassable } from '@endo/marshal';
import {
  getAmountIn,
  getAmountOut,
  natSafeMath,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeTracer } from '@agoric/internal';

const { multiply } = natSafeMath;

const trace = makeTracer('Store', true);

/** @import {PureData} from '@endo/marshal' */

/** @typedef {[normalizedCollateralization: number, vaultId: VaultId]} CompositeKey */

// `makeEncodePassable` has three named options:
// `encodeRemotable`, `encodeError`, and `encodePromise`.
// Those which are omitted default to a function that always throws.
// So by omitting all three, we know that
// the resulting function will encode only `PureData` arguments.
/**
 * @param {PureData} key
 * @returns {string}
 */
export const encodeData = makeEncodePassable();

// `makeDecodePassable` has three named options:
// `decodeRemotable`, `decodeError`, and `decodePromise`.
// Those which are omitted default to a function that always throws.
// So by omitting all three, we know that
// the resulting function will decode only to `PureData` results.
/**
 * @param {string} encoded
 * @returns {PureData}
 */
export const decodeData = makeDecodePassable();

/**
 * @param {number} n
 * @returns {string}
 */
const encodeNumber = n => {
  assert.typeof(n, 'number');
  return encodeData(n);
};

/**
 * @param {string} encoded
 * @returns {number}
 */
const decodeNumber = encoded => {
  const result = decodeData(encoded);
  assert.typeof(result, 'number');
  return result;
};

// Type annotations to support static testing of amount values
/** @typedef {Amount<'nat'> & { normalized: true }} NormalizedDebt */
/** @typedef {Amount<'nat'> & { normalized: false }} ActualDebt */

/**
 * Overcollateralized are greater than one. The more undercollaterized the
 * smaller in [0-1].
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
 *   debt-to-collateral is earliest
 */
export const toVaultKey = (normalizedDebt, collateral, vaultId) => {
  assert(normalizedDebt);
  assert(collateral);
  assert(vaultId);
  // until DB supports composite keys, copy its method for turning numbers to DB
  // entry keys
  const numberPart = encodeNumber(
    collateralizationRatio(normalizedDebt, collateral),
  );

  trace(`To Vault Key `, collateralizationRatio(normalizedDebt, collateral));
  return `${numberPart}:${vaultId}`;
};
harden(toVaultKey);

/**
 * @param {string} key
 * @returns {[normalizedCollateralization: number, vaultId: VaultId]}
 */
export const fromVaultKey = key => {
  const [numberPart, vaultIdPart] = key.split(':');
  return [decodeNumber(numberPart), vaultIdPart];
};
harden(fromVaultKey);

/**
 * Create a float representing a Normalized Collateralization Ratio that can be
 * compared to the NCRs of vaults. We want a float with as much resolution as we
 * can get, so we multiply out the numerator and the denominator, and only
 * divide the results once.
 *
 * For use by `normalizedCollRatioKey` and tests.
 *
 * @param {PriceQuote} quote
 * @param {Ratio} compoundedInterest
 * @param {Ratio} margin
 * @returns {number}
 */
export const normalizedCollRatio = (quote, compoundedInterest, margin) => {
  const amountIn = getAmountIn(quote).value;
  const amountOut = getAmountOut(quote).value;
  const interestNumerator = compoundedInterest.numerator.value;
  const interestBase = compoundedInterest.denominator.value;
  const numerator = multiply(
    margin.numerator.value,
    multiply(amountIn, interestNumerator),
  );
  const denominator = multiply(
    amountOut,
    multiply(interestBase, margin.denominator.value),
  );

  return Number(numerator) / Number(denominator);
};
harden(normalizedCollRatio);

/**
 * Create a sort key for a normalized collateralization ratio. We want the key
 * to be based on a float with as much resolution as we can get, so we multiply
 * out the numerator and the denominator, and divide only once.
 *
 * @param {PriceQuote} quote
 * @param {Ratio} compoundedInterest
 * @param {Ratio} margin
 * @returns {string} lexically sortable string in which highest
 *   debt-to-collateral is earliest
 */
export const normalizedCollRatioKey = (quote, compoundedInterest, margin) => {
  const collRatio = normalizedCollRatio(quote, compoundedInterest, margin);
  return `${encodeNumber(collRatio)}:`;
};
harden(normalizedCollRatioKey);
