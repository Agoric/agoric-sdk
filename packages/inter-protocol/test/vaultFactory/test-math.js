/* eslint-disable no-lone-blocks */
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { maxDebtForVault } from '../../src/vaultFactory/math.js';
import { withAmountUtils } from '../supports.js';

const stable = withAmountUtils(makeIssuerKit('Stable'));
const aeth = withAmountUtils(makeIssuerKit('Aeth'));

/**
 * Max debt for a fixed collateral of 1_000 aeth
 *
 * @param {*} t
 * @param {readonly [Number, Number, Number]} input
 * @param {bigint} result
 */
function checkMax(
  t,
  [pricePerColl, liquidationMarginNum, liquidationPaddingNum],
  result,
) {
  const costOfCollateral = BigInt(1_000 * pricePerColl);

  /** @type {PriceQuote} */
  const quote = {
    // @ts-expect-error cast
    quoteAmount: { value: [{ amountOut: stable.make(costOfCollateral) }] },
  };

  // the liquidationMargin term is a ratio so we add 1 to our incoming parameter
  const liquidationMargin = harden({
    numerator: stable.make(1_000n + BigInt(liquidationMarginNum * 1_000)),
    denominator: aeth.make(1_000n),
  });

  const liquidationPadding = harden({
    numerator: stable.make(BigInt(liquidationPaddingNum * 1_000)),
    denominator: aeth.make(1_000n),
  });

  t.is(
    maxDebtForVault(quote, liquidationMargin, liquidationPadding).value,
    result,
  );
}

test('zero liquidation margin', checkMax, [1.0, 0, 0], 1000n);
test('5% liquidation margin', checkMax, [1.0, 0.05, 0], 952n);
test('100% liquidation margin', checkMax, [1.0, 1.0, 0], 500n);

test('zero minimum collateralization', checkMax, [1.0, 0, 0], 1000n);
test('5% minimum collateralization', checkMax, [1.0, 0, 0.05], 952n);
test('100% minimum collateralization', checkMax, [1.0, 0, 1.0], 500n);

test('zero both LM and MC', checkMax, [1.0, 0, 0], 1000n);
test('5% both LM and MC', checkMax, [1.0, 0.05, 0.05], 909n);
test('100% both LM and MC', checkMax, [1.0, 1.0, 1.0], 333n);

test('neg liquidation margin', checkMax, [1.0, -0.05, 0], 1052n);

test('negative liquidationPadding throws', t => {
  t.throws(() => checkMax(t, [1.0, -0.05, -0.05], 0n), {
    message: 'value "[-50n]" must be a natural number',
  });
});
