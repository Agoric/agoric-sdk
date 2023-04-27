// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeIssuerKit, AssetKind } from '@agoric/ertp';

import { Fail } from '@agoric/assert';
import { makeRatio } from '../../../src/ratio.js';
import { stringifyRatioAsFraction } from '../../../src/display/natValue/stringifyRatioAsFraction.js';
import { stringifyRatio } from '../../../src/display/natValue/stringifyRatio.js';
import { stringifyRatioAsPercent } from '../../../src/display/natValue/stringifyRatioAsPercent.js';

test('stringifyRatio dollars for one eth', t => {
  // 1 dollar is 100 cents, or 2 decimal points to the right
  // 1 eth is 10^18 wei, or 18 decimal points to the right

  // $1,587.24 for 1 ETH

  const dollarKit = makeIssuerKit(
    '$',
    AssetKind.NAT,
    harden({ decimalPlaces: 2 }),
  );
  const ethKit = makeIssuerKit(
    'ETH',
    AssetKind.NAT,
    harden({ decimalPlaces: 18 }),
  );

  const ethPrice = harden(
    makeRatio(
      158724n, // value of 1 eth in cents
      dollarKit.brand,
      10n ** 18n,
      ethKit.brand,
    ),
  );

  const getDecimalPlaces = brand => {
    if (ethKit.brand === brand) {
      return 18;
    }
    if (dollarKit.brand === brand) {
      return 2;
    }
    throw Fail`brand ${brand} was not recognized`;
  };

  t.is(
    stringifyRatioAsFraction(ethPrice, getDecimalPlaces, undefined, 0),
    '1587.24 / 1',
  );

  t.is(stringifyRatioAsFraction(ethPrice, getDecimalPlaces), '1587.24 / 1.00');
  t.is(stringifyRatio(ethPrice, getDecimalPlaces), '1587.24');
});

test('stringifyApproxRatio - marketPrice for ETH in RUN', t => {
  // RUN has 6 decimalPlaces
  // 1 eth is 10^18 wei, or 18 decimal points to the right

  // $1,587.24 for 1 ETH

  //   denominator: {brand: Alleged: ETH brand, value: 1000000000000000000n}
  // numerator: {brand: Alleged: Scones brand, value: 1909113516n}

  const RUNKit = makeIssuerKit(
    'RUN',
    AssetKind.NAT,
    harden({ decimalPlaces: 6 }),
  );

  const ethKit = makeIssuerKit(
    'ETH',
    AssetKind.NAT,
    harden({ decimalPlaces: 18 }),
  );

  const ethPrice = harden(
    makeRatio(
      1909113516n, // value of 1 eth in smallest RUN denomination
      RUNKit.brand,
      10n ** 18n,
      ethKit.brand,
    ),
  );

  const getDecimalPlaces = brand => {
    if (ethKit.brand === brand) {
      return 18;
    }
    if (RUNKit.brand === brand) {
      return 6;
    }
    throw Fail`brand ${brand} was not recognized`;
  };

  t.is(stringifyRatio(ethPrice, getDecimalPlaces), '1909.11');

  t.is(stringifyRatio(ethPrice, getDecimalPlaces, 4), '1909.1135');

  t.is(stringifyRatioAsPercent(ethPrice, getDecimalPlaces), '190911');

  t.is(stringifyRatioAsPercent(ethPrice, getDecimalPlaces, 1), '190911.3');
});
