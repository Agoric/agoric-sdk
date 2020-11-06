// ts-check

import '../../../../exported';

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { calculateInterest } from '../../../../src/contracts/loan/updateDebt';

test('test calculateInterest', async t => {
  const testCalculateInterest = ([oldDebt, interestRate, expected]) => {
    t.is(calculateInterest(oldDebt, interestRate), expected);
  };

  const expectations = [
    [40000, 5, 20],
    [0, 5, 0], // debt of 0 is 0 interest
    [100, 0, 0], // interest rate of 0 is 0 interest
    [10000000, 3, 3000],
    [20392, 1, 2],
  ];

  expectations.forEach(testCalculateInterest);
});
