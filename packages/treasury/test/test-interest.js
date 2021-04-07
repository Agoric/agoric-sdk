// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';

import { makeIssuerKit, amountMath } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';

import { makeInterestCalculator, SECONDS_PER_YEAR } from '../src/interest';

const ONE_DAY = 60n * 60n * 24n;
const ONE_MONTH = ONE_DAY * 30n;
const ONE_YEAR = ONE_MONTH * 12n;

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
    interest: amountMath.make(0n, brand),
  };
  t.deepEqual(calculator.calculate(debtStatus, 12n), {
    latestInterestUpdate: 10n,
    interest: amountMath.make(0n, brand),
    newDebt: amountMath.make(1000n, brand),
  });
});

test('basic charge 1 period', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, 10000n);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 0n,
    interest: amountMath.make(0n, brand),
  };
  t.deepEqual(calculator.calculate(debtStatus, ONE_DAY), {
    latestInterestUpdate: ONE_DAY,
    interest: amountMath.make(6n, brand),
    newDebt: amountMath.make(100006n, brand),
  });
});

test('basic 2 charge periods', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, 10000n);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: ONE_DAY,
    interest: amountMath.make(0n, brand),
  };
  t.deepEqual(calculator.calculate(debtStatus, ONE_DAY * 3n), {
    latestInterestUpdate: ONE_DAY * 3n,
    interest: amountMath.make(12n, brand),
    newDebt: amountMath.make(100012n, brand),
  });
});

test('partial periods', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, 10000n);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 10n,
    interest: amountMath.make(0n, brand),
  };
  // timestamp of 20 means that 10 has elapsed, charge for three periods
  t.deepEqual(calculator.calculate(debtStatus, ONE_DAY * 3n - 1n), {
    latestInterestUpdate: 10n + ONE_DAY * 2n,
    interest: amountMath.make(12n, brand),
    newDebt: amountMath.make(100012n, brand),
  });
});

test('reportingPeriod: partial', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, 10000n);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 10n,
    interest: amountMath.make(0n, brand),
  };
  // timestamp of 20 means that 10 has elapsed, charge for two periods
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, ONE_DAY + ONE_MONTH),
    {
      latestInterestUpdate: 10n + ONE_MONTH,
      interest: amountMath.make(180n, brand),
      newDebt: amountMath.make(100180n, brand),
    },
  );
});

test('reportingPeriod: longer', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, 10000n);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_MONTH,
    ONE_DAY,
  );
  const debtStatus = {
    newDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 10n,
    interest: amountMath.make(0n, brand),
  };
  // timestamp of 20 means that 10 has elapsed, charge for two periods
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, ONE_MONTH + ONE_DAY),
    {
      latestInterestUpdate: ONE_MONTH + 10n,
      interest: amountMath.make(203n, brand),
      newDebt: amountMath.make(100203n, brand),
    },
  );
});

test('start charging later', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, 10000n);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 16n,
    interest: amountMath.make(0n, brand),
  };
  t.deepEqual(calculator.calculate(debtStatus, ONE_DAY), {
    latestInterestUpdate: 16n,
    interest: amountMath.make(0n, brand),
    newDebt: amountMath.make(100000n, brand),
  });
  t.deepEqual(calculator.calculate(debtStatus, ONE_DAY + 16n), {
    latestInterestUpdate: ONE_DAY + 16n,
    interest: amountMath.make(6n, brand),
    newDebt: amountMath.make(100006n, brand),
  });
});

test('reportingPeriod: longer reporting', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, 10000n);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 10n,
    interest: amountMath.make(0n, brand),
  };
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, ONE_MONTH + ONE_DAY),
    {
      latestInterestUpdate: ONE_MONTH + 10n,
      interest: amountMath.make(180n, brand),
      newDebt: amountMath.make(100180n, brand),
    },
  );
});

test('reportingPeriod shorter than charging', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, 10000n);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_MONTH,
    ONE_DAY,
  );
  let debtStatus = {
    newDebt: amountMath.make(100000n, brand),
    latestInterestUpdate: 10n,
    interest: amountMath.make(0n, brand),
  };
  const afterOneMonth = {
    latestInterestUpdate: 10n,
    interest: amountMath.make(0n, brand),
    newDebt: amountMath.make(100000n, brand),
  };
  t.deepEqual(calculator.calculate(debtStatus, ONE_DAY), afterOneMonth);
  t.deepEqual(calculator.calculate(debtStatus, 5n * ONE_DAY), afterOneMonth);
  t.deepEqual(calculator.calculate(debtStatus, 15n * ONE_DAY), afterOneMonth);
  t.deepEqual(calculator.calculate(debtStatus, 17n * ONE_DAY), afterOneMonth);
  t.deepEqual(calculator.calculate(debtStatus, 29n * ONE_DAY), afterOneMonth);
  t.deepEqual(calculator.calculate(debtStatus, ONE_MONTH + 10n), {
    latestInterestUpdate: ONE_MONTH + 10n,
    interest: amountMath.make(203n, brand),
    newDebt: amountMath.make(100203n, brand),
  });

  debtStatus = {
    newDebt: amountMath.make(100203n, brand),
    interest: amountMath.make(203n, brand),
    latestInterestUpdate: ONE_MONTH,
  };
  const afterTwoMonths = {
    latestInterestUpdate: ONE_MONTH,
    interest: amountMath.make(203, brand),
    newDebt: amountMath.make(100203n, brand),
  };
  t.deepEqual(calculator.calculate(debtStatus, 32n * ONE_DAY), afterTwoMonths);
  t.deepEqual(calculator.calculate(debtStatus, 40n * ONE_DAY), afterTwoMonths);
  t.deepEqual(calculator.calculate(debtStatus, 50n * ONE_DAY), afterTwoMonths);
  t.deepEqual(calculator.calculate(debtStatus, 59n * ONE_DAY), afterTwoMonths);
  t.deepEqual(calculator.calculate(debtStatus, 60n * ONE_DAY), {
    latestInterestUpdate: 2n * ONE_MONTH,
    interest: amountMath.make(406n, brand),
    newDebt: amountMath.make(100406n, brand),
  });
});

test('reportingPeriod shorter than charging; intermittent', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, 10000n);
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_MONTH,
    ONE_DAY,
  );
  let debtStatus = {
    newDebt: amountMath.make(100000n, brand),
    interest: amountMath.make(0n, brand),
    latestInterestUpdate: ONE_DAY,
  };
  const afterOneDay = {
    latestInterestUpdate: ONE_DAY,
    interest: amountMath.make(0n, brand),
    newDebt: amountMath.make(100000n, brand),
  };
  t.deepEqual(calculator.calculate(debtStatus, 4n * ONE_DAY), afterOneDay);
  t.deepEqual(calculator.calculate(debtStatus, 13n * ONE_DAY), afterOneDay);
  t.deepEqual(calculator.calculate(debtStatus, 15n * ONE_DAY), afterOneDay);
  t.deepEqual(calculator.calculate(debtStatus, 25n * ONE_DAY), afterOneDay);
  t.deepEqual(calculator.calculate(debtStatus, 29n * ONE_DAY), afterOneDay);

  const afterThreeDays = {
    latestInterestUpdate: ONE_MONTH + ONE_DAY,
    interest: amountMath.make(203n, brand),
    newDebt: amountMath.make(100203n, brand),
  };
  t.deepEqual(
    calculator.calculate(debtStatus, ONE_DAY + ONE_MONTH),
    afterThreeDays,
  );

  debtStatus = {
    newDebt: amountMath.make(101000n, brand),
    latestInterestUpdate: 20n,
    interest: amountMath.make(0n, brand),
  };
  const afterOneMonth = {
    latestInterestUpdate: 20n,
    interest: amountMath.make(0n, brand),
    newDebt: amountMath.make(101000n, brand),
  };
  t.deepEqual(calculator.calculate(debtStatus, ONE_MONTH), afterOneMonth);
  t.deepEqual(calculator.calculate(debtStatus, ONE_MONTH + 10n), afterOneMonth);
  t.deepEqual(calculator.calculate(debtStatus, ONE_MONTH + 20n), {
    latestInterestUpdate: 20n + ONE_MONTH,
    interest: amountMath.make(205n, brand),
    newDebt: amountMath.make(101205n, brand),
  });
});

// 2.5 % APR charged weekly, charged daily
test('basic charge reasonable numbers', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, 10000n);
  const START_TIME = 1617734746n;
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: amountMath.make(10000000n, brand),
    interest: amountMath.make(0n, brand),
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
    interest: amountMath.make(676n, brand),
    newDebt: amountMath.make(10000676n, brand),
  });
  t.deepEqual(
    calculator.calculate(debtStatus, START_TIME + ONE_DAY + ONE_DAY),
    {
      latestInterestUpdate: START_TIME + ONE_DAY + ONE_DAY,
      interest: amountMath.make(1352n, brand),
      newDebt: amountMath.make(10001352n, brand),
    },
  );
  // Notice that interest is compounding: 30 * 684 = 20520
  t.deepEqual(calculator.calculate(debtStatus, START_TIME + ONE_MONTH), {
    latestInterestUpdate: START_TIME + ONE_MONTH,
    interest: amountMath.make(20299n, brand),
    newDebt: amountMath.make(10020299n, brand),
  });
});

// 2.5 % APR charged weekly, charged monthly
test('basic charge reasonable numbers monthly', async t => {
  const { brand } = makeIssuerKit('ducats');
  const annualRate = makeRatio(250, brand, 10000n);
  const START_TIME = 1617734746n;
  const calculator = makeInterestCalculator(
    brand,
    annualRate,
    ONE_DAY,
    ONE_MONTH,
  );
  const debtStatus = {
    newDebt: amountMath.make(10000000n, brand),
    interest: amountMath.make(0n, brand),
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
      interest: amountMath.make(20299n, brand),
      newDebt: amountMath.make(10020299n, brand),
    },
  );
  const HALF_YEAR = 6n * ONE_MONTH;
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, START_TIME + HALF_YEAR),
    {
      latestInterestUpdate: START_TIME + HALF_YEAR,
      interest: amountMath.make(122419n, brand),
      newDebt: amountMath.make(10122419n, brand),
    },
  );
  t.deepEqual(
    calculator.calculateReportingPeriod(debtStatus, START_TIME + ONE_YEAR),
    {
      latestInterestUpdate: START_TIME + ONE_YEAR,
      interest: amountMath.make(246338n, brand),
      newDebt: amountMath.make(10246338n, brand),
    },
  );
});
