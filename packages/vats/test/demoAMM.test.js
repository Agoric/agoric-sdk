import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { Stable } from '@agoric/internal/src/tokens.js';

import {
  AMMDemoState,
  ammPoolRunDeposits,
  decimal,
  DecimalPlaces,
  poolRates,
  showAmount,
  showBrand,
  splitAllCentralPayments,
} from '../src/core/demoIssuers.js';

/** @param {bigint} n */
const showIST = n => `${decimal(n, 6)} IST`;

// TODO: prune showIST formatting utility
test('uist -> IST formatting test utility', t => {
  t.is(showIST(123456789n), '123.456789 IST', 'IST decimal point');
  t.is(showIST(1234567890n), '1_234.56789 IST', 'thousands separators');
  t.is(showIST(3286010000000000n), '3_286_010_000 IST', 'regression 1');
});

// TODO: prune splitAllCentralPayments AMM utility?
test('splitAllCentralPayments: count entries, spot check', async t => {
  const central = makeIssuerKit(
    Stable.symbol,
    'nat',
    harden({ decimalPlaces: 6 }),
  );
  const deposits = ammPoolRunDeposits(AMMDemoState);
  const bootstrapPayment = central.mint.mintPayment(
    AmountMath.make(central.brand, deposits.ammTotal),
  );
  const actual = await splitAllCentralPayments(
    bootstrapPayment,
    deposits.balances,
    central,
  );
  // t.log(actual);
  t.is(actual.ATOM.amount.brand, central.brand);
  t.deepEqual(showAmount(actual.ATOM.amount), '33_280_000 IST');
  t.deepEqual(Object.keys(actual), ['BLD', 'ATOM', 'WETH', 'LINK', 'DAI']);
});

test('poolRates: spot check WETH', t => {
  const central = makeIssuerKit(
    Stable.symbol,
    'nat',
    harden({ decimalPlaces: 6 }),
  );
  const weth = makeIssuerKit('WETH', 'nat', harden({ decimalPlaces: 18 }));
  const kits = { [Stable.symbol]: central, WETH: weth };
  const { rates, initialValue } = poolRates(
    'WETH',
    AMMDemoState.WETH,
    kits,
    central,
  );

  t.is(decimal(initialValue, DecimalPlaces.WETH), '1_000_000');
  t.is((AMMDemoState.WETH.config || {}).collateralValue, 1_000_000n);

  t.is(showBrand(rates.interestRate.numerator.brand), Stable.symbol);
  t.is(showAmount(rates.interestRate.numerator), '0.00025 IST');

  const showRatio = ({ numerator, denominator }) =>
    numerator.brand === denominator.brand
      ? `${decimal(
          (numerator.value *
            10n ** BigInt(DecimalPlaces[showBrand(numerator.brand)])) /
            denominator.value,
          DecimalPlaces[showBrand(numerator.brand)],
        )}`
      : `${showAmount(numerator)} / ${showAmount(denominator)}`;
  const expected = {
    initialPrice: '3_286.01 IST / 1 WETH',
    initialMargin: '1.5',
    liquidationMargin: '1.25',
    interestRate: '0.025',
    mintFee: '0.0001',
  };
  for (const [prop, val] of Object.entries(expected)) {
    t.is(showRatio(rates[prop]), val);
  }
});
