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
  const lastCalculationTimestamp = 0;
  const timestamps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => num * 4);
  testUpdateDebt(t, interestPeriod, lastCalculationTimestamp, timestamps);
});

test('periodNotifier timestamps are multiples of 3', async t => {
  const interestPeriod = 5;
  const lastCalculationTimestamp = 0;
  const timestamps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => num * 3);
  testUpdateDebt(t, interestPeriod, lastCalculationTimestamp, timestamps);
});

test('periodNotifier timestamps are multiples of 5', async t => {
  const interestPeriod = 5;
  const lastCalculationTimestamp = 0;
  const timestamps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => num * 5);
  testUpdateDebt(t, interestPeriod, lastCalculationTimestamp, timestamps);
});

test('periodNotifier timestamps are multiples of 6', async t => {
  const interestPeriod = 5;
  const lastCalculationTimestamp = 0;
  const timestamps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => num * 6);
  testUpdateDebt(t, interestPeriod, lastCalculationTimestamp, timestamps);
});

test('periodNotifier timestamps are multiples of 99, period 100', async t => {
  const interestPeriod = 100;
  const lastCalculationTimestamp = 0;
  const timestamps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => num * 99);
  testUpdateDebt(t, interestPeriod, lastCalculationTimestamp, timestamps);
});

const testCorrectedUpdateDebt = (
  t,
  interestPeriod,
  lastCalculationTimestamp,
  arrayOfTimestamps,
) => {
  let countOfInterestCalculated = 0;
  // take a snapshot of the firstTimestamp
  const firstTimestamp = lastCalculationTimestamp;
  let prevUpdateTimestamp = lastCalculationTimestamp;

  const interestCalculatedAt = [];

  // This was copied directly from updateDebt.js and altered to be correct
  // Code not tested by this test is commented out
  const updateDebt = timestamp => {
    while (prevUpdateTimestamp <= timestamp) {
      // const interest = loanMath.make(calcInterestFn(debt.value, interestRate));
      // debt = loanMath.add(debt, interest);
      // debtNotifierUpdater.updateState(debt);

      // Added for test purposes
      countOfInterestCalculated += 1;
      interestCalculatedAt.push(prevUpdateTimestamp);
      prevUpdateTimestamp += interestPeriod;
    }
    // scheduleLiquidation(zcf, config);
    lastCalculationTimestamp = timestamp;
  };

  arrayOfTimestamps.map(updateDebt);
  const lastTimestamp = arrayOfTimestamps[arrayOfTimestamps.length - 1];
  // Adding 1 here to account for the initial update due to the new code
  const periods =
    Math.floor((lastTimestamp - firstTimestamp) / interestPeriod) + 1;
  t.is(
    countOfInterestCalculated,
    periods,
    `${periods} periods expected between ${firstTimestamp} and ${lastTimestamp} but interest was only calculated ${countOfInterestCalculated} times. Interest calculated at the following times: ${interestCalculatedAt}`,
  );
};

test('periodNotifier timestamps are not a multiple of interestPeriod - corrected', async t => {
  // This is the example explained twice in PR reviews
  const interestPeriod = 5;
  const lastCalculationTimestamp = 7;
  const timestamps = [13, 17];
  testCorrectedUpdateDebt(
    t,
    interestPeriod,
    lastCalculationTimestamp,
    timestamps,
  );
});

test('periodNotifier timestamps are multiples of 4  - corrected', async t => {
  const interestPeriod = 5;
  const lastCalculationTimestamp = 0;
  const timestamps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => num * 4);
  testCorrectedUpdateDebt(
    t,
    interestPeriod,
    lastCalculationTimestamp,
    timestamps,
  );
});

test('periodNotifier timestamps are multiples of 3  - corrected', async t => {
  const interestPeriod = 5;
  const lastCalculationTimestamp = 0;
  const timestamps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => num * 3);
  testCorrectedUpdateDebt(
    t,
    interestPeriod,
    lastCalculationTimestamp,
    timestamps,
  );
});

test('periodNotifier timestamps are multiples of 5  - corrected', async t => {
  const interestPeriod = 5;
  const lastCalculationTimestamp = 0;
  const timestamps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => num * 5);
  testCorrectedUpdateDebt(
    t,
    interestPeriod,
    lastCalculationTimestamp,
    timestamps,
  );
});

test('periodNotifier timestamps are multiples of 6  - corrected', async t => {
  const interestPeriod = 5;
  const lastCalculationTimestamp = 0;
  const timestamps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => num * 6);
  testCorrectedUpdateDebt(
    t,
    interestPeriod,
    lastCalculationTimestamp,
    timestamps,
  );
});

test('periodNotifier timestamps are multiples of 99, period 100  - corrected', async t => {
  const interestPeriod = 100;
  const lastCalculationTimestamp = 0;
  const timestamps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => num * 99);
  testCorrectedUpdateDebt(
    t,
    interestPeriod,
    lastCalculationTimestamp,
    timestamps,
  );
});
