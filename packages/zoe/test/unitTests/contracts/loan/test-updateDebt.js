// ts-check

import '../../../../exported';

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { calculateInterest } from '../../../../src/contracts/loan/updateDebt';
import { makeRatio } from '../../../../src/contractSupport';

const FAKE_BRAND = 'FAKE';

test('test calculateInterest', async t => {
  const testCalculateInterest = ([oldDebt, interestRate, expected]) => {
    const debt = { brand: FAKE_BRAND, value: oldDebt };
    const interestRateRatio = makeRatio(interestRate, FAKE_BRAND, 10000);
    const interest = calculateInterest(debt, interestRateRatio);
    t.is(interest.value, expected);
    t.is(interest.brand, FAKE_BRAND);
  };

  const expectations = [
    [40000n, 5n, 20n],
    [0n, 5n, 0n], // debt of 0 is 0 interest
    [100n, 0n, 0n], // interest rate of 0 is 0 interest
    [10000000n, 3n, 3000n],
    [20392n, 1n, 2n],
  ];

  expectations.forEach(testCalculateInterest);
});
