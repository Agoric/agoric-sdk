// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { makeRatio } from '@agoric/zoe/src/contractSupport';
import { makeIssuerKit, MathKind } from '@agoric/ertp';

import { assert, details as X } from '@agoric/assert';
import { stringifyRatio } from '../../../src/display/natValue/stringifyRatio';
import { stringifyRatioNumerator } from '../../../src/display/natValue/stringifyRatioNumerator';

test('stringifyRatio dollars for one eth', t => {
  // 1 dollar is 100 cents, or 2 decimal points to the right
  // 1 eth is 10^18 wei, or 18 decimal points to the right

  // $1,587.24 for 1 ETH

  const dollarKit = makeIssuerKit(
    '$',
    MathKind.NAT,
    harden({ decimalPlaces: 2 }),
  );
  const ethKit = makeIssuerKit(
    'ETH',
    MathKind.NAT,
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

  const options = {
    numDecimalPlaces: 2,
    denomDecimalPlaces: 18,
    denomPlacesToShow: 0,
  };

  t.is(stringifyRatio(ethPrice, options), '1587.24 / 1');
  t.is(stringifyRatioNumerator(ethPrice, options), '1587.24');

  const getDecimalPlaces = brand => {
    if (ethKit.brand === brand) {
      return 18;
    }
    if (dollarKit.brand === brand) {
      return 2;
    }
    assert.fail(X`brand ${brand} was not recognized`);
  };

  t.is(stringifyRatio(ethPrice, { getDecimalPlaces }), '1587.24 / 1.00');
  t.is(stringifyRatioNumerator(ethPrice, { getDecimalPlaces }), '1587.24');
});
