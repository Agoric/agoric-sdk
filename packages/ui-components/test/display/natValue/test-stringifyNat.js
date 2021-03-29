// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';

import { stringifyNat } from '../../../src/display/natValue/stringifyNat';

test('stringifyNat cents to dollars', t => {
  // 1 dollar is 100 cents, or 2 decimal points to the right

  // cents in 200 dollars
  const cents200 = 20000n;

  t.is(stringifyNat(cents200, 2, 2), '200.00');
  t.is(stringifyNat(cents200, 2, 1), '200.0');
  t.is(stringifyNat(cents200, 2, 3), '200.000');
  t.is(stringifyNat(cents200, 2, 10), '200.0000000000');

  t.is(stringifyNat(1n, 2, 2), '0.01');
  t.is(stringifyNat(1n, 2, 1), '0.0');
  t.is(stringifyNat(1n, 2, 0), '0');
});

test('stringifyNat wei to ether', t => {
  // 1 eth is 10^18 wei, or 18 decimal points to the right
  const wei = 10n ** 18n;

  // wei in 3 eth
  const wei3 = 3n * wei;

  t.is(stringifyNat(wei3, 18, 2), '3.00');
  t.is(stringifyNat(wei3, 18, 0), '3');
  t.is(stringifyNat(wei3, 18, 1), '3.0');
  t.is(stringifyNat(wei3, 18, 10), '3.0000000000');

  t.is(stringifyNat(100000000000000n * wei, 18, 2), '100000000000000.00');
});
