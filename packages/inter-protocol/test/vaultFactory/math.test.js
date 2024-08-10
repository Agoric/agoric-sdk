import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import {
  calculateDebtCosts,
  maxDebtForVault,
} from '../../src/vaultFactory/math.js';
import { withAmountUtils } from '../supports.js';

/** @import {PriceAuthority, PriceDescription, PriceQuote, PriceQuoteValue, PriceQuery,} from '@agoric/zoe/tools/types.js'; */

const stable = withAmountUtils(makeIssuerKit('Stable'));

const aeth = withAmountUtils(makeIssuerKit('Aeth'));

//#region maxDebtForVaults
/**
 * Max debt for a fixed collateral of 1_000 aeth
 *
 * @param {any} t
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
//#endregion

//#region calculateDebtFees

/**
 * Max debt for a fixed collateral of 1_000 aeth
 *
 * @param {any} t
 * @param {readonly [Number, Number, Number]} input
 * @param {{
 *   fee: number;
 *   newDebt: number;
 *   toMint: number;
 *   surplus: number;
 * }} result
 */
function checkDebtCosts(
  t,
  [currentDebtN, giveN, wantN],
  { fee, newDebt, toMint, surplus },
) {
  const currentDebt = stable.make(BigInt(currentDebtN));
  const give = stable.make(BigInt(giveN));
  const want = stable.make(BigInt(wantN));

  // 5%
  const debtFee = stable.makeRatio(5n, 100n);

  t.deepEqual(calculateDebtCosts(currentDebt, give, want, debtFee), {
    fee: stable.make(BigInt(fee)),
    newDebt: stable.make(BigInt(newDebt)),
    surplus: stable.make(BigInt(surplus)),
    toMint: stable.make(BigInt(toMint)),
  });
}

test('give greater than current', checkDebtCosts, [1_000, 2_000, 0], {
  fee: 0,
  newDebt: 0,
  surplus: 1_000,
  toMint: 0,
});

test('current greater than give', checkDebtCosts, [2_000, 1_000, 0], {
  fee: 0,
  newDebt: 1_000,
  surplus: 0,
  toMint: 0,
});

test('give=want', checkDebtCosts, [2_000, 1_000, 1_000], {
  fee: 50,
  newDebt: 2_050,
  surplus: 0,
  toMint: 1_050,
});

//#endregion
