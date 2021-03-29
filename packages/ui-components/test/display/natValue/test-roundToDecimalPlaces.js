// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';

import { roundToDecimalPlaces as round } from '../../../src/display/natValue/helpers/roundToDecimalPlaces';

test('roundToDecimalPlaces', t => {
  t.deepEqual(round('00', 0), '');
  t.deepEqual(round('00', 1), '0');
  t.deepEqual(round('00', 2), '00');
  t.deepEqual(round('00', 3), '000');
  t.deepEqual(round('34', 0), '');
  t.deepEqual(round('34', 1), '3');
  t.deepEqual(round('34', 2), '34');
  t.deepEqual(round('34', 3), '340');
});

test('roundToDecimalPlaces non-string throws', t => {
  // @ts-ignore deliberate error for testing
  t.throws(() => round({}, 0), {
    message: /.* must be a string/,
  });
});

test('roundToDecimalPlaces non-num decimalPlaces throws', t => {
  // @ts-ignore deliberate error for testing
  t.throws(() => round('020', '0'), {
    message: /.* must be a number/,
  });
});

test('roundToDecimalPlaces defaults', t => {
  t.deepEqual(round(), '');
});
