// Must be first to set up globals
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/index.js';

import { normalizedCollRatio } from '../../src/vaultFactory/storeUtils.js';
import { withAmountUtils } from '../supports.js';

/** @import {PriceAuthority, PriceDescription, PriceQuote, PriceQuoteValue, PriceQuery,} from '@agoric/zoe/tools/types.js'; */

export const mockBrand = Far('brand');

const makeFakeQuote = (amountIn, amountOut) => {
  return { quoteAmount: { value: [{ amountIn, amountOut }] } };
};

const minted = withAmountUtils(makeIssuerKit('Minted'));
const collateral = withAmountUtils(makeIssuerKit('Collateral'));

test('normalizedCollRatio grows with coll margin', t => {
  /** @type {PriceQuote} */
  // @ts-expect-error fake for tests.
  const quote = makeFakeQuote(minted.make(5n), collateral.make(20n));
  const compoundedInterest = makeRatioFromAmounts(
    minted.make(1n),
    collateral.make(1n),
  );
  const lowCollateralizationMargin = makeRatioFromAmounts(
    minted.make(105n),
    collateral.make(100n),
  );
  const highCollateralizationMargin = makeRatioFromAmounts(
    minted.make(150n),
    collateral.make(100n),
  );

  const lowRate = normalizedCollRatio(
    quote,
    compoundedInterest,
    lowCollateralizationMargin,
  );
  t.deepEqual(lowRate, (105 * 5) / (20 * 100));
  const highRate = normalizedCollRatio(
    quote,
    compoundedInterest,
    highCollateralizationMargin,
  );
  t.deepEqual(highRate, (150 * 5) / (20 * 100));
  t.true(highRate > lowRate);
});

test('CollRatio grows with interest', t => {
  /** @type {PriceQuote} */
  // @ts-expect-error fake for tests.
  const quote = makeFakeQuote(minted.make(5n), collateral.make(20n));
  const lowInterest = makeRatioFromAmounts(
    minted.make(1n),
    collateral.make(1n),
  );
  const highInterest = makeRatioFromAmounts(
    minted.make(12n),
    collateral.make(10n),
  );
  const margin = makeRatioFromAmounts(minted.make(105n), collateral.make(100n));

  const lowRate = normalizedCollRatio(quote, lowInterest, margin);
  t.deepEqual(lowRate, (105 * 5) / (20 * 100));
  const highRate = normalizedCollRatio(quote, highInterest, margin);
  t.deepEqual(highRate, (105 * 5 * 12) / (20 * 100 * 10));
  t.true(highRate > lowRate);
});

test('CollRatio grows with price', t => {
  /** @type {PriceQuote} */
  // @ts-expect-error fake for tests.
  const lowQuote = makeFakeQuote(minted.make(5n), collateral.make(20n));
  /** @type {PriceQuote} */
  // @ts-expect-error fake for tests.
  const highQuote = makeFakeQuote(minted.make(15n), collateral.make(20n));

  const compoundedInterest = makeRatioFromAmounts(
    minted.make(12n),
    collateral.make(10n),
  );
  const margin = makeRatioFromAmounts(minted.make(105n), collateral.make(100n));

  const lowRate = normalizedCollRatio(lowQuote, compoundedInterest, margin);
  t.deepEqual(lowRate, (105 * 5 * 12) / (20 * 100 * 10));
  const highRate = normalizedCollRatio(highQuote, compoundedInterest, margin);
  t.deepEqual(highRate, (105 * 15 * 12) / (20 * 100 * 10));
  t.true(highRate > lowRate);
});
