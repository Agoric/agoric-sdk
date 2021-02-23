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
    [40000n, 5n, 20n],
    [0n, 5n, 0n], // debt of 0 is 0 interest
    [100n, 0n, 0n], // interest rate of 0 is 0 interest
    [10000000n, 3n, 3000n],
    [20392n, 1n, 2n],
  ];

  expectations.forEach(testCalculateInterest);
});
