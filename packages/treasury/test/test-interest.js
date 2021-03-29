// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';

import { makeIssuerKit, amountMath } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';

import { makeInterestCalculator } from '../src/interest';

test('too soon', async t => {
  const { brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(
    brand,
    makeRatio(1n, brand),
    3n,
    6n,
  );
  const debtStatus = {
    currentDebt: amountMath.make(1000n, brand),
    latestInterestUpdate: 10n,
  };
  t.deepEqual(calculator.calculate(debtStatus, 12n), {
    latestInterestUpdate: 10n,
    interest: amountMath.make(0n, brand),
    newDebt: amountMath.make(1000n, brand),
  });
});

test('basic charge 1 period', async t => {
  const { brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(
    brand,
    makeRatio(1n, brand),
    3n,
    6n,
  );
  const debtStatus = {
    currentDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 10n,
  };
  t.deepEqual(calculator.calculate(debtStatus, 13n), {
    latestInterestUpdate: 13n,
    interest: amountMath.make(1000n, brand),
    newDebt: amountMath.make(101000n, brand),
  });
});

test('basic 2 charge periods', async t => {
  const { brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(
    brand,
    makeRatio(1n, brand),
    3n,
    6n,
  );
  const debtStatus = {
    currentDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 10n,
  };
  t.deepEqual(calculator.calculate(debtStatus, 16n), {
    latestInterestUpdate: 16n,
    interest: amountMath.make(2010n, brand),
    newDebt: amountMath.make(102010n, brand),
  });
});

test('partial periods', async t => {
  const { brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(
    brand,
    makeRatio(1n, brand),
    3n,
    6n,
  );
  const debtStatus = {
    currentDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 10n,
  };
  // timestamp of 20 means that 10 has elapsed, charge for three periods
  t.deepEqual(calculator.calculate(debtStatus, 20n), {
    latestInterestUpdate: 19n,
    interest: amountMath.make(3030n, brand),
    newDebt: amountMath.make(103030n, brand),
  });
});

test('reportingPeriod: partial', async t => {
  const { brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(
    brand,
    makeRatio(1n, brand),
    3n,
    6n,
  );
  const debtStatus = {
    currentDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 10n,
  };
  // timestamp of 20 means that 10 has elapsed, charge for two periods
  t.deepEqual(calculator.calculateReportingPeriod(debtStatus, 20n), {
    latestInterestUpdate: 16n,
    interest: amountMath.make(2010n, brand),
    newDebt: amountMath.make(102010n, brand),
  });
});

test('reportingPeriod: longer', async t => {
  const { brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(
    brand,
    makeRatio(1n, brand),
    3n,
    6n,
  );
  const debtStatus = {
    currentDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 10n,
  };
  // timestamp of 20 means that 10 has elapsed, charge for two periods
  t.deepEqual(calculator.calculateReportingPeriod(debtStatus, 22n), {
    latestInterestUpdate: 22n,
    interest: amountMath.make(4060n, brand),
    newDebt: amountMath.make(104060n, brand),
  });
});

test('start charging later', async t => {
  const { brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(
    brand,
    makeRatio(1n, brand),
    3n,
    6n,
  );
  const debtStatus = {
    currentDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 16n,
  };
  t.deepEqual(calculator.calculate(debtStatus, 13n), {
    latestInterestUpdate: 16n,
    interest: amountMath.make(0n, brand),
    newDebt: amountMath.make(100000n, brand),
  });
  t.deepEqual(calculator.calculate(debtStatus, 19n), {
    latestInterestUpdate: 19n,
    interest: amountMath.make(1000n, brand),
    newDebt: amountMath.make(101000n, brand),
  });
});

test('reportingPeriod: longer reporting', async t => {
  const { brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(
    brand,
    makeRatio(1n, brand),
    3n,
    12n,
  );
  const debtStatus = {
    currentDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 10n,
  };
  // timestamp of 20 means that 10 has elapsed, charge for two periods
  t.deepEqual(calculator.calculateReportingPeriod(debtStatus, 33n), {
    latestInterestUpdate: 22n,
    interest: amountMath.make(4060n, brand),
    newDebt: amountMath.make(104060n, brand),
  });
});

test('reportingPeriod shorter than charging', async t => {
  const { brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(
    brand,
    makeRatio(1n, brand),
    10n,
    5n,
  );
  let debtStatus = {
    currentDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 10n,
  };
  const after10 = {
    latestInterestUpdate: 10n,
    interest: amountMath.make(0n, brand),
    newDebt: amountMath.make(100000n, brand),
  };
  t.deepEqual(calculator.calculate(debtStatus, 11n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 13n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 15n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 17n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 19n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 20n), {
    latestInterestUpdate: 20n,
    interest: amountMath.make(1000n, brand),
    newDebt: amountMath.make(101000n, brand),
  });

  debtStatus = {
    currentDebt: amountMath.make(101000n, brand),
    latestInterestUpdate: 20n,
  };
  const after20 = {
    latestInterestUpdate: 20n,
    interest: amountMath.make(0n, brand),
    newDebt: amountMath.make(101000n, brand),
  };
  t.deepEqual(calculator.calculate(debtStatus, 21n), after20);
  t.deepEqual(calculator.calculate(debtStatus, 23n), after20);
  t.deepEqual(calculator.calculate(debtStatus, 25n), after20);
  t.deepEqual(calculator.calculate(debtStatus, 27n), after20);
  t.deepEqual(calculator.calculate(debtStatus, 29n), after20);
  t.deepEqual(calculator.calculate(debtStatus, 30n), {
    latestInterestUpdate: 30n,
    interest: amountMath.make(1010n, brand),
    newDebt: amountMath.make(102010n, brand),
  });
});

test('reportingPeriod shorter than charging; intermittent', async t => {
  const { brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(
    brand,
    makeRatio(1n, brand),
    10n,
    5n,
  );
  let debtStatus = {
    currentDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 10n,
  };
  const after10 = {
    latestInterestUpdate: 10n,
    interest: amountMath.make(0n, brand),
    newDebt: amountMath.make(100000n, brand),
  };
  t.deepEqual(calculator.calculate(debtStatus, 11n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 13n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 15n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 17n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 19n), after10);

  const after23 = {
    latestInterestUpdate: 20n,
    interest: amountMath.make(1000n, brand),
    newDebt: amountMath.make(101000n, brand),
  };
  t.deepEqual(calculator.calculate(debtStatus, 23n), after23);
  debtStatus = {
    currentDebt: amountMath.make(101000n, brand),
    latestInterestUpdate: 20n,
  };

  const after25 = {
    latestInterestUpdate: 20n,
    interest: amountMath.make(0n, brand),
    newDebt: amountMath.make(101000n, brand),
  };
  t.deepEqual(calculator.calculate(debtStatus, 27n), after25);
  t.deepEqual(calculator.calculate(debtStatus, 29n), after25);
  t.deepEqual(calculator.calculate(debtStatus, 30n), {
    latestInterestUpdate: 30n,
    interest: amountMath.make(1010n, brand),
    newDebt: amountMath.make(102010n, brand),
  });
});
