import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { divideAmountByTwo } from '../../src/airdrop.contract.js';

const testKit = makeIssuerKit('Testcoinz');

const makeTestcoinzAmount = (x = 0n) => AmountMath.make(testKit.brand, x);

const divideTestcoinzByTwo = divideAmountByTwo(testKit.brand);

test('divideTestCoinzByTwo:: basic operations', t => {
  t.deepEqual(
    makeTestcoinzAmount(100n),
    { brand: testKit.brand, value: 100n },
    'makeTestCoinzAmount given a bigint should create an object with the correct amount shape.',
  );

  t.deepEqual(
    divideTestcoinzByTwo(makeTestcoinzAmount(200n)),
    makeTestcoinzAmount(100n),
    'given an amount with a value of 200 should return an amount with a value of 100',
  );

  t.deepEqual(
    divideTestcoinzByTwo(makeTestcoinzAmount(10n)),
    makeTestcoinzAmount(5n),
    'given an amount with a value of 10n should return an amount with a value of 5n',
  );
});

test('divideTestCoinzByTwo:: given an amount with a different brand', t => {
  const wrongAmountKit = makeIssuerKit('NotTestcoinz');
  t.throws(
    () => divideTestcoinzByTwo(AmountMath.make(wrongAmountKit.brand, 100n)),
    {
      message:
        'amount\'s brand "[Alleged: NotTestcoinz brand]" must match ratio\'s numerator "[Alleged: Testcoinz brand]"',
    },
    'should thrown an error',
  );
});

test('divideTestCoinzByTwo:: given a very large number', t => {
  const largeTestAmount = makeTestcoinzAmount(20_000_000_000n);

  t.deepEqual(makeTestcoinzAmount(100n), { brand: testKit.brand, value: 100n });

  t.deepEqual(
    divideTestcoinzByTwo(largeTestAmount),
    makeTestcoinzAmount(10_000_000_000n),
    'should handle division by two properly and return the correct amount.',
  );
});
