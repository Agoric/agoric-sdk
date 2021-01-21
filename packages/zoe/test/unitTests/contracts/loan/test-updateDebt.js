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

const testUpdateDebt = (
  t,
  interestPeriod,
  lastCalculationTimestamp,
  arrayOfTimestamps,
) => {
  let countOfInterestCalculated = 0;
  // take a snapshot of the firstTimestamp
  const firstTimestamp = lastCalculationTimestamp;

  // This was copied directly from updateDebt.js
  // Code not tested by this test is commented out
  const updateDebt = timestamp => {
    let prevUpdateTimestamp = lastCalculationTimestamp;
    while (prevUpdateTimestamp + interestPeriod <= timestamp) {
      prevUpdateTimestamp += interestPeriod;
      // const interest = loanMath.make(calcInterestFn(debt.value, interestRate));
      // debt = loanMath.add(debt, interest);
      // debtNotifierUpdater.updateState(debt);

      // Added for test purposes
      countOfInterestCalculated += 1;
    }
    // scheduleLiquidation(zcf, config);
    lastCalculationTimestamp = timestamp;
  };

  arrayOfTimestamps.map(updateDebt);
  const lastTimestamp = arrayOfTimestamps[arrayOfTimestamps.length - 1];
  const periods = Math.floor((lastTimestamp - firstTimestamp) / interestPeriod);
  t.is(
    countOfInterestCalculated,
    periods,
    `${periods} periods expected between ${firstTimestamp} and ${lastTimestamp} but interest was only calculated ${countOfInterestCalculated} times`,
  );
};

test('periodNotifier timestamps are not a multiple of interestPeriod', async t => {
  // This is the example explained twice in PR reviews
  const interestPeriod = 5;
  const lastCalculationTimestamp = 7;
  const timestamps = [13, 17];
  testUpdateDebt(t, interestPeriod, lastCalculationTimestamp, timestamps);
});

test('periodNotifier timestamps are multiples of 4', async t => {
  const interestPeriod = 5;
  const lastCalculationTimestamp = 1;
  const timestamps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => num * 4);
  testUpdateDebt(t, interestPeriod, lastCalculationTimestamp, timestamps);
});
