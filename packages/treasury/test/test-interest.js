// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';

import { makeIssuerKit, amountMath } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';

import { makeInterestCalculator, SECONDS_PER_YEAR } from '../src/interest';

test('too soon', async t => {
  const { brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(
    brand,
    makeRatio(1n * SECONDS_PER_YEAR, brand),
    3n,
    6n,
  );
  const debtStatus = {
    newDebt: amountMath.make(1000n, brand),
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
    makeRatio((1n * SECONDS_PER_YEAR) / 3n, brand),
    3n,
    6n,
  );
  const debtStatus = {
    newDebt: amountMath.make(100000n, brand),
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
    makeRatio((1n * SECONDS_PER_YEAR) / 3n, brand),
    3n,
    6n,
  );
  const debtStatus = {
    newDebt: amountMath.make(100000n, brand),
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
    makeRatio((1n * SECONDS_PER_YEAR) / 3n, brand),
    3n,
    6n,
  );
  const debtStatus = {
    newDebt: amountMath.make(100000n, brand),
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
    makeRatio((1n * SECONDS_PER_YEAR) / 3n, brand),
    3n,
    6n,
  );
  const debtStatus = {
    newDebt: amountMath.make(100000n, brand),
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
    makeRatio((1n * SECONDS_PER_YEAR) / 3n, brand),
    3n,
    6n,
  );
  const debtStatus = {
    newDebt: amountMath.make(100000n, brand),
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
    makeRatio((1n * SECONDS_PER_YEAR) / 3n, brand),
    3n,
    6n,
  );
  const debtStatus = {
    newDebt: amountMath.make(100000n, brand),
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
    makeRatio((1n * SECONDS_PER_YEAR) / 3n, brand),
    3n,
    12n,
  );
  const debtStatus = {
    newDebt: amountMath.make(100000n, brand),
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
    makeRatio((1n * SECONDS_PER_YEAR) / 10n, brand),
    10n,
    5n,
  );
  let debtStatus = {
    newDebt: amountMath.make(100000n, brand),
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
    newDebt: amountMath.make(101000n, brand),
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
    makeRatio((1n * SECONDS_PER_YEAR) / 10n, brand),
    10n,
    5n,
  );
  let debtStatus = {
    newDebt: amountMath.make(100000n, brand),
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
    newDebt: amountMath.make(101000n, brand),
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

// 2.5 % APR charged weekly, charged daily
test('basic charge reasonable numbers', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, 10000n);
  const ONE_DAY = 60n * 60n * 24n;
  const ONE_MONTH = ONE_DAY * 30n;
  const START_TIME = 1617734746n;
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: amountMath.make(10000000n, brand),
    interest: annualRate,
    latestInterestUpdate: START_TIME,
  };
  t.deepEqual(calculator.calculate(debtStatus, START_TIME), {
    latestInterestUpdate: START_TIME,
    interest: amountMath.make(0n, brand),
    newDebt: amountMath.make(10000000n, brand),
  });
  t.deepEqual(calculator.calculate(debtStatus, START_TIME + 1n), {
    latestInterestUpdate: START_TIME,
    interest: amountMath.make(0n, brand),
    newDebt: amountMath.make(10000000n, brand),
  });
  t.deepEqual(calculator.calculate(debtStatus, START_TIME + ONE_DAY), {
    latestInterestUpdate: START_TIME + ONE_DAY,
    interest: amountMath.make(684n, brand),
    newDebt: amountMath.make(10000684n, brand),
  });
  t.deepEqual(
    calculator.calculate(debtStatus, START_TIME + ONE_DAY + ONE_DAY),
    {
      latestInterestUpdate: START_TIME + ONE_DAY + ONE_DAY,
      interest: amountMath.make(1368n, brand),
      newDebt: amountMath.make(10001368n, brand),
    },
  );
  // Notice that interest is compounding: 30 * 684 = 20520
  t.deepEqual(calculator.calculate(debtStatus, START_TIME + ONE_MONTH), {
    latestInterestUpdate: START_TIME + ONE_MONTH,
    interest: amountMath.make(20555n, brand),
    newDebt: amountMath.make(10020555n, brand),
  });
});

// 2.5 % APR charged weekly, charged monthly
test('basic charge reasonable numbers monthly', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, 10000n);
  const ONE_DAY = 60n * 60n * 24n;
  const ONE_MONTH = ONE_DAY * 30n;
  const START_TIME = 1617734746n;
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: amountMath.make(10000000n, brand),
    interest: annualRate,
    latestInterestUpdate: START_TIME,
  };
  t.deepEqual(calculator.calculateReportingPeriod(debtStatus, START_TIME), {
    latestInterestUpdate: START_TIME,
    interest: amountMath.make(0n, brand),
    newDebt: amountMath.make(10000000n, brand),
  });
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, START_TIME + 1n),
    {
      latestInterestUpdate: START_TIME,
      interest: amountMath.make(0n, brand),
      newDebt: amountMath.make(10000000n, brand),
    },
  );
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, START_TIME + ONE_DAY),
    {
      latestInterestUpdate: START_TIME,
      interest: amountMath.make(0n, brand),
      newDebt: amountMath.make(10000000n, brand),
    },
  );
  t.deepEqual(
    calculator.calculateReportingPeriod(
      debtStatus,
      START_TIME + ONE_DAY + ONE_DAY,
    ),
    {
      latestInterestUpdate: START_TIME,
      interest: amountMath.make(0n, brand),
      newDebt: amountMath.make(10000000n, brand),
    },
  );
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, START_TIME + ONE_MONTH),
    {
      latestInterestUpdate: START_TIME + ONE_MONTH,
      interest: amountMath.make(20555n, brand),
      newDebt: amountMath.make(10020555n, brand),
    },
  );
  const HALF_YEAR = 6n * ONE_MONTH;
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, START_TIME + HALF_YEAR),
    {
      latestInterestUpdate: START_TIME + HALF_YEAR,
      interest: amountMath.make(123957n, brand),
      newDebt: amountMath.make(10123957n, brand),
    },
  );
});
