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
 * @param {readonly [Number, Number]} input
 * @param {bigint} result
 */
function checkMax(t, [pricePerColl, liquidationMarginNum], result) {
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

  t.is(maxDebtForVault(quote, liquidationMargin).value, result);
}

test('zero liquidation margin', checkMax, [1.0, 0], 1000n);
test('5% liquidation margin', checkMax, [1.0, 0.05], 952n);
test('100% liquidation margin', checkMax, [1.0, 1.0], 500n);

test('-5% liquidation margin', checkMax, [1.0, -0.05], 1052n);
