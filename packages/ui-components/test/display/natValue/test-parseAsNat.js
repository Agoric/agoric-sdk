// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { parseAsNat } from '../../../src/display/natValue/parseAsNat';

test('parseAsNat dollars to cents', t => {
  // 1 dollar is 100 cents, or 2 decimal points to the right

  // cents in 200 dollars
  const cents200 = 20000n;

  t.deepEqual(parseAsNat('200.00', 2), cents200);
  t.deepEqual(parseAsNat('200.0', 2), cents200);
  // rounds to floor
  t.deepEqual(parseAsNat('200.009', 2), cents200);
  t.deepEqual(parseAsNat('200.002', 2), cents200);
  t.deepEqual(parseAsNat('200.0023423342342343', 2), cents200);

  t.deepEqual(parseAsNat('.0023423342342343', 2), 0n);
  t.deepEqual(parseAsNat('.01', 2), 1n);
  t.deepEqual(parseAsNat('0.01', 2), 1n);
});

test('parseAsNat ether to wei', t => {
  // 1 eth is 10^18 wei, or 18 decimal points to the right
  const wei = 10n ** 18n;

  // wei in 3 eth
  const wei3 = 3n * wei;

  t.deepEqual(parseAsNat('03', 18), wei3);
  t.deepEqual(parseAsNat('3', 18), wei3);
  t.deepEqual(parseAsNat('03.0', 18), wei3);
  // rounds to floor
  t.deepEqual(parseAsNat('03.00000000000000000003493023940239', 18), wei3);

  t.deepEqual(
    parseAsNat('100000000000000.00000000000000000003493023940239', 18),
    100000000000000n * wei,
  );
});

test('parseAsNat negative throws', t => {
  t.throws(() => parseAsNat('-200.00', 2), {
    message: '(a string) must be a non-negative decimal number',
  });
});
